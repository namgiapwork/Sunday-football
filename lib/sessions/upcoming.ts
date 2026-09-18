import type { SessionStatus } from "./state";

/** How far ahead players may answer. Beyond this, a Sunday is not yet theirs to see. */
export const UPCOMING_WEEKS = 4;

/** At most this many dates on the home screen, however many exist in the window. */
export const UPCOMING_LIMIT = 4;

export interface DatedSession {
  date: string;
  status: SessionStatus;
}

/**
 * The window players can respond within: today through four weeks out. Returned
 * as plain YYYY-MM-DD so it can go straight into a date query.
 */
export function upcomingWindow(today: Date = new Date(), weeks = UPCOMING_WEEKS) {
  const from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + weeks * 7);
  return { from: iso(from), to: iso(to) };
}

/**
 * The Sundays a player should see, soonest first. A finished Sunday drops off;
 * a cancelled one stays, because "it's off this week" is information.
 */
export function selectUpcoming<T extends DatedSession>(
  sessions: T[],
  today: Date = new Date(),
  { weeks = UPCOMING_WEEKS, limit = UPCOMING_LIMIT }: { weeks?: number; limit?: number } = {},
): T[] {
  const { from, to } = upcomingWindow(today, weeks);

  return sessions
    .filter((s) => s.date >= from && s.date <= to)
    .filter((s) => s.status !== "completed" && s.status !== "draft")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit);
}

/** The Sundays an admin should be creating, so the list is never empty. */
export function missingSundays(existing: string[], today: Date = new Date(), count = UPCOMING_LIMIT): string[] {
  const have = new Set(existing);
  const result: string[] = [];

  const cursor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  // Move to the coming Sunday (0 = Sunday); today counts if it is one.
  cursor.setUTCDate(cursor.getUTCDate() + ((7 - cursor.getUTCDay()) % 7));

  for (let i = 0; i < count; i++) {
    const date = iso(cursor);
    if (!have.has(date)) result.push(date);
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }

  return result;
}

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}
