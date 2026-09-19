# SQL.md — read-only queries for the Supabase SQL editor

Paste any block into the Supabase SQL editor (Dashboard → SQL Editor). Every query
is a `SELECT`; nothing here changes data.

> **Ratings are private.** Sections 3 and 4 show `self_rating` / `effective_rating`.
> The SQL editor runs as the database owner, so it bypasses RLS. Use it, but don't
> paste those results anywhere players can see them.
>
> `player_credentials` (PIN hashes) is deliberately never selected here.

Enums for reference:

- `position_code`: `GK`, `DEF`, `DM`, `CM`, `AM`, `WING`, `ST`
- `member_role`: `player`, `scorekeeper`, `admin`
- `signup_status`: `confirmed`, `maybe`, `declined`
- `session_status`: `draft`, `signup_open`, `signup_closed`, `teams_generated`,
  `teams_published`, `in_progress`, `completed`, `cancelled`

Replace `'Name'`, `'<session-id>'` etc. before running.

---

## 1. Player roster

### All players with role and active state

```sql
select
  p.id,
  p.name,
  p.email,
  gm.role,
  p.is_active                       as player_active,
  gm.is_active                      as member_active,
  (p.auth_user_id is not null)      as has_supabase_login,
  p.created_at
from players p
left join group_members gm on gm.player_id = p.id
order by p.is_active desc, p.name;
```

### All players with their favourite positions

One row per player, positions in preference order (1st, 2nd, 3rd), with each
self-rating in brackets. Players who haven't added positions show as empty.

```sql
select
  p.name,
  p.is_active,
  string_agg(pp.position::text || ' (' || pp.self_rating || ')', ', '
             order by pp.preference_rank) as favourite_positions
from players p
left join player_positions pp on pp.player_id = p.id
group by p.id, p.name, p.is_active
order by p.is_active desc, p.name;
```

### Active players only

```sql
select p.id, p.name, gm.role
from players p
join group_members gm on gm.player_id = p.id
where p.is_active and gm.is_active
order by p.name;
```

### Deactivated players

```sql
select p.id, p.name, p.updated_at as deactivated_around
from players p
where not p.is_active
order by p.updated_at desc;
```

### Find a player by name

```sql
select id, name, email, is_active
from players
where name ilike '%Name%'
order by name;
```

### Admins and scorekeepers

```sql
select p.name, p.email, gm.role, (p.auth_user_id is not null) as has_supabase_login
from group_members gm
join players p on p.id = gm.player_id
where gm.role in ('admin', 'scorekeeper')
order by gm.role, p.name;
```

### Players locked out of PIN login

```sql
select p.name, pc.failed_attempts, pc.locked_until
from player_credentials pc
join players p on p.id = pc.player_id
where pc.locked_until > now() or pc.failed_attempts > 0
order by pc.locked_until desc nulls last;
```

### Players without a PIN set

```sql
select p.id, p.name
from players p
left join player_credentials pc on pc.player_id = p.id
where pc.player_id is null and p.is_active
order by p.name;
```

---

## 2. Data health checks

### Active players with no positions

```sql
select p.id, p.name
from players p
left join player_positions pp on pp.player_id = p.id
where p.is_active and pp.id is null
order by p.name;
```

### Active players with no goalkeeper-capable position

The balancing engine is untested with zero GK-capable players in a squad.

```sql
select p.id, p.name
from players p
where p.is_active
  and not exists (
    select 1 from player_positions pp
    where pp.player_id = p.id and pp.position = 'GK'
  )
order by p.name;
```

### Row counts per table

```sql
select 'players'          as table_name, count(*) from players
union all select 'group_members',    count(*) from group_members
union all select 'player_positions', count(*) from player_positions
union all select 'sessions',         count(*) from sessions
union all select 'signups',          count(*) from signups
union all select 'teams',            count(*) from teams
union all select 'team_members',     count(*) from team_members
union all select 'matches',          count(*) from matches
union all select 'match_events',     count(*) from match_events
order by table_name;
```

---

## 3. Positions and ratings (private)

### Every player with their position preferences, one row each

```sql
select
  p.name,
  max(pp.position::text) filter (where pp.preference_rank = 1) as first_choice,
  max(pp.self_rating)    filter (where pp.preference_rank = 1) as first_rating,
  max(pp.position::text) filter (where pp.preference_rank = 2) as second_choice,
  max(pp.self_rating)    filter (where pp.preference_rank = 2) as second_rating,
  max(pp.position::text) filter (where pp.preference_rank = 3) as third_choice,
  max(pp.self_rating)    filter (where pp.preference_rank = 3) as third_rating
from players p
left join player_positions pp on pp.player_id = p.id
where p.is_active
group by p.id, p.name
order by p.name;
```

### All position rows for one player

```sql
select p.name, pp.preference_rank, pp.position,
       pp.self_rating, pp.calculated_rating, pp.effective_rating
from player_positions pp
join players p on p.id = pp.player_id
where p.name ilike '%Name%'
order by p.name, pp.preference_rank;
```

### Players by position (who can play where)

```sql
select pp.position, p.name, pp.preference_rank, pp.effective_rating
from player_positions pp
join players p on p.id = pp.player_id
where p.is_active
order by pp.position, pp.effective_rating desc, p.name;
```

### Position coverage: how many active players per position

```sql
select pp.position, count(*) as players,
       round(avg(pp.effective_rating), 2) as avg_rating
from player_positions pp
join players p on p.id = pp.player_id
where p.is_active
group by pp.position
order by players desc;
```

### Top-rated players by first-choice position

```sql
select p.name, pp.position, pp.effective_rating
from player_positions pp
join players p on p.id = pp.player_id
where p.is_active and pp.preference_rank = 1
order by pp.effective_rating desc, p.name;
```

---

## 4. Sessions

### Recent sessions

```sql
select s.id, s.date, s.status, s.start_time, s.end_time,
       coalesce(s.venue_name_snapshot, v.name, s.location_override) as venue,
       s.signup_deadline, s.teams_reveal_at
from sessions s
left join venues v on v.id = s.venue_id
order by s.date desc
limit 10;
```

### The latest session (handy `id` for the queries below)

```sql
select id, date, status
from sessions
order by date desc
limit 1;
```

### Sessions grouped by status

```sql
select status, count(*), max(date) as latest
from sessions
group by status
order by status;
```

---

## 5. Signups

### Who signed up for a session

```sql
select p.name, su.status, su.updated_at
from signups su
join players p on p.id = su.player_id
where su.session_id = '<session-id>'
order by su.status, su.updated_at;
```

### Same, for the latest session, without pasting an id

```sql
select p.name, su.status, su.updated_at
from signups su
join players p on p.id = su.player_id
where su.session_id = (select id from sessions order by date desc limit 1)
order by su.status, su.updated_at;
```

### Signup counts per status for the latest session

```sql
select su.status, count(*)
from signups su
where su.session_id = (select id from sessions order by date desc limit 1)
group by su.status;
```

### Active players who have not responded to a session

```sql
select p.name
from players p
where p.is_active
  and not exists (
    select 1 from signups su
    where su.player_id = p.id
      and su.session_id = '<session-id>'
  )
order by p.name;
```

### Signup history for one player

```sql
select s.date, s.status as session_status, su.status as signup_status
from signups su
join sessions s on s.id = su.session_id
join players p on p.id = su.player_id
where p.name ilike '%Name%'
order by s.date desc;
```

### Attendance leaderboard (confirmed signups, completed sessions)

```sql
select p.name, count(*) as sundays_played
from signups su
join players p   on p.id = su.player_id
join sessions s  on s.id = su.session_id
where su.status = 'confirmed' and s.status = 'completed'
group by p.id, p.name
order by sundays_played desc, p.name;
```

---

## 6. Everything for one player

Swap the name once; run each block.

```sql
-- profile
select p.*, gm.role, gm.is_active as member_active
from players p
left join group_members gm on gm.player_id = p.id
where p.name ilike '%Name%';
```

```sql
-- positions (private)
select pp.preference_rank, pp.position, pp.self_rating, pp.effective_rating
from player_positions pp
join players p on p.id = pp.player_id
where p.name ilike '%Name%'
order by pp.preference_rank;
```

```sql
-- signups and team per Sunday
select s.date, su.status as signup, t.name as team, tm.assigned_position,
       tm.position_rating_snapshot
from players p
left join signups su       on su.player_id = p.id
left join sessions s       on s.id = su.session_id
left join team_members tm  on tm.player_id = p.id and tm.session_id = s.id
left join teams t          on t.id = tm.team_id
where p.name ilike '%Name%'
order by s.date desc;
```
