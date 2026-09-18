-- Row Level Security.
--
-- Model: the browser only ever *reads*, and only the columns it needs, using the
-- anon key (this is what Supabase Realtime subscribes with). Every write goes
-- through a Next.js server action holding the service-role key, which authorises
-- the caller itself. There are therefore no INSERT/UPDATE/DELETE policies at all:
-- a leaked anon key cannot change anything.
--
-- Column-level GRANTs do the work that RLS cannot: PIN hashes, self-ratings and
-- rating snapshots are simply not selectable by the browser (spec §76, §77).

alter table groups enable row level security;
alter table players enable row level security;
alter table player_credentials enable row level security;
alter table group_members enable row level security;
alter table player_positions enable row level security;
alter table venues enable row level security;
alter table sessions enable row level security;
alter table signups enable row level security;
alter table teams enable row level security;
alter table team_members enable row level security;
alter table matches enable row level security;
alter table match_events enable row level security;

-- Start from zero for the browser-facing roles.
revoke all on all tables in schema public from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Readable by the browser
-- ---------------------------------------------------------------------------

grant select (id, name, slug, logo_url, timezone, team_colours) on groups to anon, authenticated;
create policy groups_read on groups for select to anon, authenticated using (true);

-- Note the omitted columns: email and auth_user_id stay server-side.
grant select (id, name, avatar_url, is_active) on players to anon, authenticated;
create policy players_read on players for select to anon, authenticated using (is_active);

grant select (id, group_id, player_id, role, is_active) on group_members to anon, authenticated;
create policy group_members_read on group_members for select to anon, authenticated using (is_active);

grant select (id, group_id, name, address, maps_url, notes, is_active) on venues to anon, authenticated;
create policy venues_read on venues for select to anon, authenticated using (true);

grant select on sessions to anon, authenticated;
create policy sessions_read on sessions for select to anon, authenticated using (status <> 'draft');

grant select (id, session_id, player_id, status, created_at, updated_at) on signups to anon, authenticated;
create policy signups_read on signups for select to anon, authenticated using (true);

grant select (id, session_id, name, colour, display_order, published, created_at) on teams to anon, authenticated;
-- Generated teams stay private to admins until they are published (spec §16).
create policy teams_read on teams for select to anon, authenticated using (published);

-- position_rating_snapshot is deliberately not granted.
grant select (id, team_id, session_id, player_id, assigned_position, is_available, created_at)
  on team_members to anon, authenticated;
create policy team_members_read on team_members for select to anon, authenticated
  using (exists (select 1 from teams t where t.id = team_members.team_id and t.published));

grant select on matches to anon, authenticated;
create policy matches_read on matches for select to anon, authenticated using (true);

grant select on match_events to anon, authenticated;
create policy match_events_read on match_events for select to anon, authenticated
  using (deleted_at is null);

-- ---------------------------------------------------------------------------
-- Never readable by the browser
-- ---------------------------------------------------------------------------

-- player_credentials and player_positions get no grants and no policies at all.
-- Ratings are served to the player themselves, and to admins, through server
-- actions that check authorisation first.

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end
$$;

alter publication supabase_realtime add table sessions;
alter publication supabase_realtime add table signups;
alter publication supabase_realtime add table teams;
alter publication supabase_realtime add table team_members;
alter publication supabase_realtime add table matches;
alter publication supabase_realtime add table match_events;
