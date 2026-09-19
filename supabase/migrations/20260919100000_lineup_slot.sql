-- Lets an organiser choose who starts and where, instead of the pitch being
-- worked out from assigned positions. 0 = goalkeeper, 1-2 defenders, 3-4
-- midfielders, 5-6 wingers, 7 = striker. Null means "not in the starting eight":
-- on a team where nobody has a slot the lineup is still picked automatically.

alter table team_members
  add column lineup_slot smallint check (lineup_slot between 0 and 7);

comment on column team_members.lineup_slot is
  'Starting slot on the 1-2-2-2-1 board (0 GK, 1-2 DEF, 3-4 MID, 5-6 WING, 7 ST). Null = substitute, or automatic if no teammate has one.';

-- One player per slot per team.
create unique index team_members_lineup_slot_idx
  on team_members (team_id, lineup_slot)
  where lineup_slot is not null;

-- Same visibility as assigned_position; the rating snapshot stays ungranted.
grant select (lineup_slot) on team_members to anon, authenticated;
