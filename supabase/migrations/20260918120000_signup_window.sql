-- Signup now closes *after* the game, not before it.
--
-- Originally the deadline was a weekday before kickoff, so the organiser had a
-- settled list to pick teams from. In practice people drop out on the morning and
-- turn up unannounced, and the attendance record matters more than a tidy list.
-- The deadline therefore becomes "when the record is final", defaulting to the
-- end of the day after the game.

alter table groups
  add column default_signup_close_days_after smallint not null default 1
    check (default_signup_close_days_after between 0 and 7);

comment on column groups.default_signup_close_days_after is
  'Days after the session date that signup closes. 1 = the Monday after a Sunday game.';

update groups
   set default_signup_close_days_after = 1,
       default_signup_deadline_time = '23:59';

-- The weekday column described a deadline before kickoff and no longer applies.
alter table groups drop column default_signup_deadline_dow;

-- Move existing Sundays that have not been played onto the new window.
update sessions s
   set signup_deadline = ((s.date + g.default_signup_close_days_after)
                          + g.default_signup_deadline_time) at time zone g.timezone
  from groups g
 where g.id = s.group_id
   and s.status <> 'cancelled'
   and s.date >= current_date - 1;
