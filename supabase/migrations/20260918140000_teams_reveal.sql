-- Teams are picked by the organiser but revealed to players on a schedule, so
-- they can be prepared early without going out days ahead of the game.
-- Default: the end of the Friday before kickoff.

alter table sessions
  add column teams_reveal_at timestamptz;

comment on column sessions.teams_reveal_at is
  'When published teams become visible to players. Null means as soon as they are published.';

alter table groups
  add column default_teams_reveal_days_before smallint not null default 2
    check (default_teams_reveal_days_before between 0 and 7),
  add column default_teams_reveal_time time not null default '23:59';

comment on column groups.default_teams_reveal_days_before is
  'Days before the session that teams are revealed. 2 = the Friday before a Sunday game.';

-- Backfill anything still to be played.
update sessions s
   set teams_reveal_at = ((s.date - g.default_teams_reveal_days_before)
                          + g.default_teams_reveal_time) at time zone g.timezone
  from groups g
 where g.id = s.group_id
   and s.teams_reveal_at is null
   and s.status <> 'cancelled'
   and s.date >= current_date - 1;
