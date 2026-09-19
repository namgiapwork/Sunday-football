-- Feed: manual fixtures, W/D/L predictions and an append-only goals/assists ledger.
--
-- Same model as the rest of the schema: the browser can only read the columns it
-- needs, every write goes through a server action holding the service-role key.
-- Nothing here is ever hard-deleted; player_id foreign keys are RESTRICT so a
-- stray delete fails loudly instead of erasing scoring history.

create type fixture_status as enum ('scheduled', 'finished', 'postponed', 'cancelled');
create type prediction_pick as enum ('home', 'draw', 'away');
create type player_stat as enum ('goal', 'assist');

-- ---------------------------------------------------------------------------
-- Fixtures (real-world matches, e.g. Man City vs Sunderland), entered by an admin
-- ---------------------------------------------------------------------------

create table fixtures (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  home_team text not null check (char_length(btrim(home_team)) between 1 and 60),
  away_team text not null check (char_length(btrim(away_team)) between 1 and 60),
  competition text check (competition is null or char_length(competition) <= 60),
  kickoff_at timestamptz not null,
  status fixture_status not null default 'scheduled',
  home_goals smallint check (home_goals is null or home_goals >= 0),
  away_goals smallint check (away_goals is null or away_goals >= 0),
  -- Reserved for a future importer; manual entry leaves both null.
  external_source text,
  external_id text,
  created_by uuid references players (id) on delete set null,
  updated_by uuid references players (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (lower(btrim(home_team)) <> lower(btrim(away_team))),
  -- A score exists exactly when the fixture is finished.
  check ((home_goals is null) = (away_goals is null)),
  check ((status = 'finished') = (home_goals is not null)),
  check ((external_source is null) = (external_id is null))
);

create unique index fixtures_external_uniq on fixtures (external_source, external_id)
  where external_source is not null;
create index fixtures_kickoff_idx on fixtures (group_id, kickoff_at);

create trigger fixtures_set_updated_at before update on fixtures
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Predictions: one pick per player per fixture
-- ---------------------------------------------------------------------------

create table fixture_predictions (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references fixtures (id) on delete cascade,
  player_id uuid not null references players (id) on delete restrict,
  pick prediction_pick not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fixture_id, player_id)
);

create trigger fixture_predictions_set_updated_at before update on fixture_predictions
  for each row execute function set_updated_at();

-- Backstop for the server-side check: picks are locked once the fixture kicks off.
create function fixture_predictions_lock() returns trigger
language plpgsql as $$
declare
  f fixtures%rowtype;
begin
  select * into f from fixtures where id = new.fixture_id;
  if f.status <> 'scheduled' or now() >= f.kickoff_at then
    raise exception 'Predictions are closed for this fixture';
  end if;
  return new;
end;
$$;

create trigger fixture_predictions_lock before insert or update on fixture_predictions
  for each row execute function fixture_predictions_lock();

-- ---------------------------------------------------------------------------
-- Goals / assists ledger. Displayed total = live match events + sum of deltas.
-- A correction is a new row, never an overwrite; a mistake is voided, not deleted.
-- ---------------------------------------------------------------------------

create table player_stat_adjustments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  player_id uuid not null references players (id) on delete restrict,
  stat player_stat not null,
  delta integer not null check (delta <> 0),
  reason text not null check (char_length(btrim(reason)) between 3 and 200),
  created_by uuid references players (id) on delete set null,
  created_at timestamptz not null default now(),
  voided_at timestamptz
);

create index player_stat_adjustments_player_idx on player_stat_adjustments (player_id)
  where voided_at is null;

-- ---------------------------------------------------------------------------
-- RLS: read-only for the browser, and only what it needs
-- ---------------------------------------------------------------------------

alter table fixtures enable row level security;
alter table fixture_predictions enable row level security;
alter table player_stat_adjustments enable row level security;

-- Hosted Supabase gives anon/authenticated table-wide privileges on new tables;
-- the revoke in the RLS migration only covered tables that existed then.
revoke all on fixtures, fixture_predictions, player_stat_adjustments from anon, authenticated;

grant select (id, group_id, home_team, away_team, competition, kickoff_at, status, home_goals, away_goals)
  on fixtures to anon, authenticated;
create policy fixtures_read on fixtures for select to anon, authenticated using (true);

-- No grants on fixture_predictions (picks stay hidden until kickoff, and are then
-- revealed by server code) or player_stat_adjustments (an admin audit trail with
-- reasons). RLS is on with no policy, so the browser gets nothing.
