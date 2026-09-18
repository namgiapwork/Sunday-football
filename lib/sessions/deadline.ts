import { localToUtcIso } from "@/lib/time/group-time";

export interface DeadlineDefaults {
  default_signup_close_days_after: number;
  default_signup_deadline_time: string;
  timezone: string;
}

export interface RevealDefaults {
  default_teams_reveal_days_before: number;
  default_teams_reveal_time: string;
  timezone: string;
}

/**
 * When answers stop being accepted for a given Sunday. Defaults to the end of the
 * day after the game, so late dropouts and unannounced arrivals can still be
 * recorded — the attendance record matters more than a tidy list beforehand.
 */
export function defaultSignupDeadline(date: string, group: DeadlineDefaults): string {
  const close = new Date(`${date}T00:00:00Z`);
  close.setUTCDate(close.getUTCDate() + group.default_signup_close_days_after);

  const local = `${close.toISOString().slice(0, 10)}T${group.default_signup_deadline_time.slice(0, 5)}`;
  return localToUtcIso(local, group.timezone);
}

/** The same thing as a local "YYYY-MM-DDTHH:mm" string, for prefilling a form. */
export function defaultSignupDeadlineLocal(date: string, group: DeadlineDefaults): string {
  const close = new Date(`${date}T00:00:00Z`);
  close.setUTCDate(close.getUTCDate() + group.default_signup_close_days_after);
  return `${close.toISOString().slice(0, 10)}T${group.default_signup_deadline_time.slice(0, 5)}`;
}

/**
 * When published teams become visible to players — by default the end of the
 * Friday before kickoff, so the organiser can pick them early in peace.
 */
export function defaultTeamsRevealAt(date: string, group: RevealDefaults): string {
  const reveal = new Date(`${date}T00:00:00Z`);
  reveal.setUTCDate(reveal.getUTCDate() - group.default_teams_reveal_days_before);

  const local = `${reveal.toISOString().slice(0, 10)}T${group.default_teams_reveal_time.slice(0, 5)}`;
  return localToUtcIso(local, group.timezone);
}
