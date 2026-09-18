-- Development seed (spec §51).
--
-- Deterministic: running it twice against a clean database gives the same data.
-- Every seeded player's PIN is 1234.
--
--   psql "$DATABASE_URL" -f supabase/seed.sql
--
-- Do NOT run this against production.

begin;

-- ---------------------------------------------------------------------------
-- Group and venues
-- ---------------------------------------------------------------------------

insert into groups (id, name, slug, timezone, default_start_time, default_end_time,
                    default_signup_close_days_after, default_signup_deadline_time)
values ('11111111-1111-4111-8111-111111111111', 'Sunday Football', 'sunday-football',
        'Europe/Amsterdam', '18:00', '20:00', 1, '23:59');

insert into venues (id, group_id, name, address, maps_url, notes)
values
  ('22222222-2222-4222-8222-222222222221', '11111111-1111-4111-8111-111111111111',
   'Sportpark Rotterdam', 'Sportlaan 12, 3062 Rotterdam',
   'https://maps.google.com/?q=Sportpark+Rotterdam', 'Pitch 3'),
  ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111',
   'Erasmus Sports Centre', 'Burgemeester Oudlaan 50, 3062 PA Rotterdam',
   'https://maps.google.com/?q=Erasmus+Sport', 'Indoor hall B');

update groups
   set default_venue_id = '22222222-2222-4222-8222-222222222221'
 where id = '11111111-1111-4111-8111-111111111111';

-- ---------------------------------------------------------------------------
-- 35 players with position preferences
-- ---------------------------------------------------------------------------

create temporary table seed_players (
  seq smallint,
  name text,
  email text,
  role member_role,
  p1 position_code, r1 smallint,
  p2 position_code, r2 smallint,
  p3 position_code, r3 smallint
) on commit drop;

insert into seed_players values
  ( 1, 'Khoi',    'khoi@example.com', 'admin',       'CM',   8, 'AM',   7, 'WING', 6),
  ( 2, 'Alex',    'alex@example.com', 'admin',       'GK',   8, 'DEF',  6, null,   null),
  ( 3, 'Minh',    null,               'player',      'ST',   8, 'AM',   7, 'WING', 7),
  ( 4, 'David',   null,               'player',      'DEF',  7, 'DM',   6, 'CM',   5),
  ( 5, 'James',   null,               'player',      'WING', 8, 'ST',   7, 'AM',   6),
  ( 6, 'Tom',     null,               'scorekeeper', 'DEF',  8, 'DM',   7, null,   null),
  ( 7, 'Sam',     null,               'player',      'AM',   7, 'CM',   7, 'WING', 6),
  ( 8, 'Ruben',   null,               'player',      'GK',   7, 'DEF',  5, null,   null),
  ( 9, 'Bart',    null,               'player',      'DEF',  6, 'CM',   6, 'DM',   5),
  (10, 'Youssef', null,               'player',      'ST',   9, 'AM',   8, 'WING', 7),
  (11, 'Sven',    null,               'player',      'GK',   6, 'ST',   4, null,   null),
  (12, 'Daan',    null,               'player',      'CM',   7, 'DM',   7, 'DEF',  6),
  (13, 'Lucas',   null,               'player',      'WING', 7, 'AM',   6, 'ST',   6),
  (14, 'Mateo',   null,               'player',      'DM',   8, 'CM',   7, 'DEF',  7),
  (15, 'Omar',    null,               'player',      'AM',   8, 'CM',   7, null,   null),
  (16, 'Finn',    null,               'player',      'DEF',  7, 'DM',   6, null,   null),
  (17, 'Nico',    null,               'player',      'ST',   7, 'WING', 6, 'AM',   5),
  (18, 'Jasper',  null,               'player',      'CM',   6, 'AM',   6, 'WING', 5),
  (19, 'Ravi',    null,               'player',      'DEF',  6, 'DM',   6, 'CM',   5),
  (20, 'Marco',   null,               'player',      'GK',   7, 'DEF',  6, 'DM',   5),
  (21, 'Ethan',   null,               'player',      'WING', 8, 'ST',   7, null,   null),
  (22, 'Hugo',    null,               'player',      'DM',   7, 'DEF',  7, 'CM',   6),
  (23, 'Lars',    null,               'scorekeeper', 'CM',   8, 'DM',   7, 'AM',   7),
  (24, 'Pieter',  null,               'player',      'DEF',  5, 'CM',   5, null,   null),
  (25, 'Ibrahim', null,               'player',      'ST',   8, 'WING', 7, 'AM',   6),
  (26, 'Noah',    null,               'player',      'AM',   7, 'WING', 7, 'CM',   6),
  (27, 'Tomas',   null,               'player',      'GK',   8, 'DEF',  5, null,   null),
  (28, 'Andre',   null,               'player',      'DEF',  8, 'DM',   7, null,   null),
  (29, 'Kai',     null,               'player',      'CM',   6, 'WING', 6, 'AM',   5),
  (30, 'Milan',   null,               'player',      'ST',   6, 'AM',   6, 'CM',   5),
  (31, 'Joran',   null,               'player',      'DM',   6, 'DEF',  6, null,   null),
  (32, 'Felix',   null,               'player',      'WING', 6, 'ST',   5, 'AM',   5),
  (33, 'Arno',    null,               'player',      'CM',   7, 'DEF',  6, 'DM',   6),
  (34, 'Diego',   null,               'player',      'AM',   8, 'ST',   7, 'WING', 7),
  (35, 'Rick',    null,               'player',      'DEF',  6, 'DM',   5, 'CM',   5);

-- Stable ids so the seed is re-runnable and easy to reference by hand.
insert into players (id, name, email)
select ('33333333-3333-4333-8333-' || lpad(seq::text, 12, '0'))::uuid, name, email
from seed_players;

insert into player_credentials (player_id, pin_hash)
select p.id, crypt('1234', gen_salt('bf', 10))
from players p;

insert into group_members (group_id, player_id, role)
select '11111111-1111-4111-8111-111111111111', p.id, s.role
from seed_players s
join players p on p.name = s.name;

insert into player_positions (player_id, position, preference_rank, self_rating)
select p.id, v.position, v.rank, v.rating
from seed_players s
join players p on p.name = s.name
cross join lateral (
  values (s.p1, 1::smallint, s.r1), (s.p2, 2::smallint, s.r2), (s.p3, 3::smallint, s.r3)
) as v(position, rank, rating)
where v.position is not null;

-- ---------------------------------------------------------------------------
-- Last Sunday: played and completed
-- ---------------------------------------------------------------------------

insert into sessions (id, group_id, date, start_time, end_time, venue_id,
                      location_notes, venue_name_snapshot, venue_address_snapshot,
                      venue_notes_snapshot, signup_deadline, status, created_by)
values (
  '44444444-4444-4444-8444-444444444441',
  '11111111-1111-4111-8111-111111111111',
  date_trunc('week', current_date)::date - 1,   -- the Sunday just gone
  '18:00', '20:00',
  '22222222-2222-4222-8222-222222222221',
  'Pitch 3',
  'Sportpark Rotterdam', 'Sportlaan 12, 3062 Rotterdam', 'Pitch 3',
  (date_trunc('week', current_date)::date + time '23:59') at time zone 'Europe/Amsterdam',
  'completed',
  '33333333-3333-4333-8333-000000000001'
);

-- 28 of the 35 turned up.
insert into signups (session_id, player_id, status)
select '44444444-4444-4444-8444-444444444441', p.id,
       case when s.seq <= 28 then 'confirmed'::signup_status else 'declined'::signup_status end
from seed_players s
join players p on p.name = s.name;

insert into teams (id, session_id, name, colour, display_order, published, created_by)
values
  ('55555555-5555-4555-8555-000000000001', '44444444-4444-4444-8444-444444444441', 'Red',    'red',    0, true, '33333333-3333-4333-8333-000000000001'),
  ('55555555-5555-4555-8555-000000000002', '44444444-4444-4444-8444-444444444441', 'Blue',   'blue',   1, true, '33333333-3333-4333-8333-000000000001'),
  ('55555555-5555-4555-8555-000000000003', '44444444-4444-4444-8444-444444444441', 'Green',  'green',  2, true, '33333333-3333-4333-8333-000000000001'),
  ('55555555-5555-4555-8555-000000000004', '44444444-4444-4444-8444-444444444441', 'Yellow', 'yellow', 3, true, '33333333-3333-4333-8333-000000000001');

-- Spread the 28 across four teams, keeping one goalkeeper-capable player each.
with ranked as (
  select p.id as player_id,
         s.seq,
         row_number() over (
           order by case when s.p1 = 'GK' then 0 else 1 end, s.seq
         ) - 1 as slot
  from seed_players s
  join players p on p.name = s.name
  where s.seq <= 28
),
assigned as (
  select r.player_id,
         r.slot,
         t.id as team_id,
         (select pp.position from player_positions pp
           where pp.player_id = r.player_id order by pp.preference_rank limit 1) as pos,
         (select pp.self_rating from player_positions pp
           where pp.player_id = r.player_id order by pp.preference_rank limit 1) as rating,
         1::smallint as rank
  from ranked r
  join teams t on t.session_id = '44444444-4444-4444-8444-444444444441'
               and t.display_order = (r.slot % 4)
)
insert into team_members (team_id, session_id, player_id, assigned_position,
                          position_rating_snapshot, preference_rank_snapshot)
select team_id, '44444444-4444-4444-8444-444444444441', player_id, pos, rating, rank
from assigned;

-- Single round robin: 4 teams, 6 matches.
insert into matches (id, session_id, team_a_id, team_b_id, status, scheduled_order,
                     started_at, completed_at, timer_elapsed_seconds, created_by)
select
  ('66666666-6666-4666-8666-' || lpad(m.ord::text, 12, '0'))::uuid,
  '44444444-4444-4444-8444-444444444441',
  ta.id, tb.id, 'completed', m.ord,
  now() - (interval '7 days') + (m.ord * interval '15 minutes'),
  now() - (interval '7 days') + (m.ord * interval '15 minutes') + interval '12 minutes',
  720,
  '33333333-3333-4333-8333-000000000001'
from (values (0, 0, 1), (1, 2, 3), (2, 0, 2), (3, 1, 3), (4, 0, 3), (5, 1, 2))
       as m(ord, a, b)
join teams ta on ta.session_id = '44444444-4444-4444-8444-444444444441' and ta.display_order = m.a
join teams tb on tb.session_id = '44444444-4444-4444-8444-444444444441' and tb.display_order = m.b;

-- A deterministic scatter of goals, each credited to a real member of the
-- scoring team, with an assist from a different member of the same team.
with scorers as (
  select mt.id as match_id,
         side.team_id,
         g.n as goal_no,
         tm.player_id,
         tm.slot,
         count(*) over (partition by mt.id, side.team_id) as squad
  from matches mt
  cross join lateral (values (mt.team_a_id, 0), (mt.team_b_id, 1)) as side(team_id, side_no)
  cross join lateral generate_series(1, 1 + ((mt.scheduled_order + side.side_no * 2) % 4)) as g(n)
  join lateral (
    select tm2.player_id,
           row_number() over (order by tm2.created_at, tm2.player_id) - 1 as slot
    from team_members tm2
    where tm2.team_id = side.team_id
  ) tm on tm.slot = (g.n * 3 + mt.scheduled_order) % 7
  where mt.session_id = '44444444-4444-4444-8444-444444444441'
)
insert into match_events (match_id, session_id, event_type, team_id, player_id,
                          assist_player_id, match_second, created_by)
select s.match_id,
       '44444444-4444-4444-8444-444444444441',
       'goal',
       s.team_id,
       s.player_id,
       (select tm.player_id from team_members tm
         where tm.team_id = s.team_id and tm.player_id <> s.player_id
         order by tm.created_at, tm.player_id
         offset ((s.goal_no * 2) % 6) limit 1),
       60 * s.goal_no + 30,
       '33333333-3333-4333-8333-000000000006'
from scorers s;

-- ---------------------------------------------------------------------------
-- The Sunday coming up: signup is open
-- ---------------------------------------------------------------------------

insert into sessions (id, group_id, date, start_time, end_time, venue_id,
                      location_notes, signup_deadline, teams_reveal_at, status, created_by)
values (
  '44444444-4444-4444-8444-444444444442',
  '11111111-1111-4111-8111-111111111111',
  date_trunc('week', current_date)::date + 6,    -- the Sunday coming
  '18:00', '20:00',
  '22222222-2222-4222-8222-222222222221',
  'Pitch 3',
  (date_trunc('week', current_date)::date + 7 + time '23:59') at time zone 'Europe/Amsterdam',
  (date_trunc('week', current_date)::date + 4 + time '23:59') at time zone 'Europe/Amsterdam',
  'signup_open',
  '33333333-3333-4333-8333-000000000001'
);

-- 24 in, 3 maybe, 5 out, 3 yet to answer.
insert into signups (session_id, player_id, status)
select '44444444-4444-4444-8444-444444444442', p.id,
       case
         when s.seq <= 24 then 'confirmed'::signup_status
         when s.seq <= 27 then 'maybe'::signup_status
         when s.seq <= 32 then 'declined'::signup_status
       end
from seed_players s
join players p on p.name = s.name
where s.seq <= 32;

commit;
