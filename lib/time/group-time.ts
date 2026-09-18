/**
 * All timestamps are stored in UTC. Everything a player reads is rendered in the
 * group's timezone, so nothing shifts when the organiser travels (spec §59).
 */

export const DEFAULT_TIMEZONE = "Europe/Amsterdam";

export function formatSessionDate(date: string, timeZone = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone,
  }).format(parseDateOnly(date));
}

export function formatShortDate(date: string, timeZone = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone,
  }).format(parseDateOnly(date));
}

export function formatTimeRange(start: string, end: string): string {
  return `${start.slice(0, 5)}–${end.slice(0, 5)}`;
}

export function formatDeadline(iso: string, timeZone = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
    hour12: false,
  }).format(new Date(iso));
}

/** "2026-09-20" is a calendar date, not an instant; anchor it at midday UTC. */
function parseDateOnly(date: string): Date {
  return new Date(`${date}T12:00:00Z`);
}

/**
 * Turns a local wall-clock string ("2026-09-19T18:00") in `timeZone` into the
 * matching UTC instant, without pulling in a date library.
 */
export function localToUtcIso(local: string, timeZone = DEFAULT_TIMEZONE): string {
  const naive = new Date(`${local}:00Z`);
  const offset = timeZoneOffsetMs(naive, timeZone);
  return new Date(naive.getTime() - offset).toISOString();
}

/** The inverse: a UTC instant rendered as a local "YYYY-MM-DDTHH:mm" string. */
export function utcToLocalInput(iso: string, timeZone = DEFAULT_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));

  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour") === "24" ? "00" : get("hour")}:${get("minute")}`;
}

function timeZoneOffsetMs(instant: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return asUtc - instant.getTime();
}
