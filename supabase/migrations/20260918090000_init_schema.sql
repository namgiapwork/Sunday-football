-- Sunday Football — initial schema
-- Every timestamp is stored in UTC (timestamptz). Local display uses groups.timezone.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type position_code as enum ('GK', 'DEF', 'DM', 'CM', 'AM', 'WING', 'ST');

create type member_role as enum ('player', 'scorekeeper', 'admin');

create type session_status as enum (
  'draft',
  'signup_open',
  'signup_closed',
  'teams_generated',
  'teams_published',
  'in_progress',
  'completed',
  'cancelled'
);

create type signup_status as enum ('confirmed', 'maybe', 'declined');

create type match_status as enum ('scheduled', 'in_progress', 'paused', 'completed', 'cancelled');

create type match_event_type as enum ('goal');

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Groups (V1 runs a single group; the column exists so more can be added later)
-- ---------------------------------------------------------------------------

create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  logo_url text,
  timezone text not null default 'Europe/Amsterdam',
  default_start_time time not null default '18:00',
  default_end_time time not null default '20:00',
  -- Day of week the signup deadline falls on, 0 = Sunday .. 6 = Saturday.
  default_signup_deadline_dow smallint not null default 6
    check (default_signup_deadline_dow between 0 and 6),
  default_signup_deadline_time time not null default '18:00',
  default_venue_id uuid,
  default_max_players smallint check (default_max_players is null or default_max_players > 0),
  team_colours text[] not null default array['red', 'blue', 'green', 'yellow', 'orange', 'purple'],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (default_start_time < default_end_time)
);

create trigger groups_set_updated_at before update on groups
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Players
-- ---------------------------------------------------------------------------

create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 40),
  avatar_url text,
  -- Set for admins, who sign in with Supabase Auth rather than a PIN.
  email text,
  auth_user_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index players_auth_user_id_key on players (auth_user_id) where auth_user_id is not null;
create unique index players_email_key on players (lower(email)) where email is not null;

create trigger players_set_updated_at before update on players
  for each row execute function set_updated_at();

-- PIN hashes live apart from the profile so that `players` can be exposed to
-- the anon key for realtime reads without ever leaking a credential.
create table player_credentials (
  player_id uuid primary key references players (id) on delete cascade,
  pin_hash text not null,
  failed_attempts smallint not null default 0 check (failed_attempts >= 0),
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

create trigger player_credentials_set_updated_at before update on player_credentials
  for each row execute function set_updated_at();

create table group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  player_id uuid not null references players (id) on delete cascade,
  role member_role not null default 'player',
  is_active boolean not null default true,
  joined_at timestamptz not null default now(),
  unique (group_id, player_id)
);

create index group_members_group_role_idx on group_members (group_id, role);

-- ---------------------------------------------------------------------------
-- Position preferences
-- ---------------------------------------------------------------------------

create table player_positions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players (id) on delete cascade,
  position position_code not null,
  preference_rank smallint not null check (preference_rank between 1 and 3),
  -- What the player says about themselves. Never overwritten by any algorithm.
  self_rating smallint not null check (self_rating between 1 and 10),
  -- Reserved for a future derived rating (spec §34); null until one exists.
  calculated_rating numeric(4, 2) check (calculated_rating is null or (calculated_rating >= 1 and calculated_rating <= 10)),
  effective_rating numeric(4, 2) generated always as (coalesce(calculated_rating, self_rating::numeric)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (player_id, preference_rank),
  unique (player_id, position)
);

create index player_positions_position_idx on player_positions (position);

create trigger player_positions_set_updated_at before update on player_positions
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Venues
-- ---------------------------------------------------------------------------

create table venues (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  address text,
  maps_url text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, name)
);

create trigger venues_set_updated_at before update on venues
  for each row execute function set_updated_at();

alter table groups
  add constraint groups_default_venue_id_fkey
  foreign key (default_venue_id) references venues (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Sunday sessions
-- ---------------------------------------------------------------------------

create table sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  venue_id uuid references venues (id) on delete set null,
  location_override text,
  location_notes text,
  -- Frozen when the session starts so history stays accurate if a venue changes.
  venue_name_snapshot text,
  venue_address_snapshot text,
  venue_notes_snapshot text,
  signup_deadline timestamptz not null,
  status session_status not null default 'draft',
  note text,
  cancellation_reason text,
  created_by uuid references players (id) on delete set null,
  updated_by uuid references players (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, date),
  unique (id, group_id),
  check (start_time < end_time),
  check (status <> 'cancelled' or cancellation_reason is not null)
);

create index sessions_group_date_idx on sessions (group_id, date desc);
create index sessions_status_idx on sessions (status);

create trigger sessions_set_updated_at before update on sessions
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Signups
-- ---------------------------------------------------------------------------

create table signups (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions (id) on delete cascade,
  player_id uuid not null references players (id) on delete cascade,
  status signup_status not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, player_id)
);

create index signups_session_status_idx on signups (session_id, status);

create trigger signups_set_updated_at before update on signups
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Teams
-- ---------------------------------------------------------------------------

create table teams (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions (id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  colour text not null,
  display_order smallint not null check (display_order >= 0),
  published boolean not null default false,
  created_by uuid references players (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, display_order),
  unique (session_id, name),
  -- Lets child rows carry session_id and inherit the session check for free.
  unique (id, session_id)
);

create trigger teams_set_updated_at before update on teams
  for each row execute function set_updated_at();

create table team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null,
  session_id uuid not null,
  player_id uuid not null references players (id) on delete cascade,
  assigned_position position_code not null,
  -- Snapshot at publish time so old Sundays never change when a player re-rates.
  position_rating_snapshot numeric(4, 2),
  preference_rank_snapshot smallint check (preference_rank_snapshot between 1 and 3),
  -- Cleared when someone drops out after teams were published.
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  foreign key (team_id, session_id) references teams (id, session_id) on delete cascade,
  unique (team_id, player_id),
  -- A player can only ever belong to one team on a given Sunday.
  unique (session_id, player_id)
);

create index team_members_team_idx on team_members (team_id);

-- ---------------------------------------------------------------------------
-- Matches and events (schema only in MVP 1; the UI arrives in MVP 1.5)
-- ---------------------------------------------------------------------------

create table matches (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions (id) on delete cascade,
  team_a_id uuid not null,
  team_b_id uuid not null,
  status match_status not null default 'scheduled',
  scheduled_order smallint not null check (scheduled_order >= 0),
  started_at timestamptz,
  paused_at timestamptz,
  completed_at timestamptz,
  timer_elapsed_seconds integer not null default 0 check (timer_elapsed_seconds >= 0),
  created_by uuid references players (id) on delete set null,
  updated_by uuid references players (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (team_a_id, session_id) references teams (id, session_id) on delete cascade,
  foreign key (team_b_id, session_id) references teams (id, session_id) on delete cascade,
  check (team_a_id <> team_b_id),
  unique (session_id, scheduled_order),
  unique (id, session_id)
);

create index matches_session_idx on matches (session_id, scheduled_order);

create trigger matches_set_updated_at before update on matches
  for each row execute function set_updated_at();

create table match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null,
  session_id uuid not null,
  event_type match_event_type not null default 'goal',
  team_id uuid not null,
  player_id uuid references players (id) on delete set null,
  assist_player_id uuid references players (id) on delete set null,
  match_second integer check (match_second is null or match_second >= 0),
  created_by uuid references players (id) on delete set null,
  created_at timestamptz not null default now(),
  -- Soft delete: an undone goal stays on record for auditability.
  deleted_at timestamptz,
  foreign key (match_id, session_id) references matches (id, session_id) on delete cascade,
  foreign key (team_id, session_id) references teams (id, session_id) on delete cascade,
  check (assist_player_id is null or assist_player_id <> player_id)
);

create index match_events_match_idx on match_events (match_id) where deleted_at is null;
