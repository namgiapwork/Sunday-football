import { formatSessionDate, formatTimeRange } from "@/lib/time/group-time";
import type { SessionWithVenue } from "@/lib/data/sessions";

/** Date, time and place — the three things a player needs before anything else (§92). */
export function SessionHeader({ session, timezone }: { session: SessionWithVenue; timezone: string }) {
  const venueName = session.venue_name_snapshot ?? session.venue?.name ?? session.location_override;
  const venueNotes = session.venue_notes_snapshot ?? session.location_notes ?? session.venue?.notes;
  const mapsUrl = session.venue?.maps_url;

  return (
    <header className="px-5 pt-8">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-lime">Next game</p>
      <h1 className="mt-1 text-4xl font-black leading-tight tracking-tight">
        {formatSessionDate(session.date, timezone)}
      </h1>
      <p className="tabular mt-1 text-xl font-semibold text-chalk-dim">
        {formatTimeRange(session.start_time, session.end_time)}
      </p>

      {venueName ? (
        <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-chalk-dim">
          <span aria-hidden>📍</span>
          <span className="font-semibold text-chalk">{venueName}</span>
          {venueNotes ? <span className="text-sm">{venueNotes}</span> : null}
          {mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="text-sm font-semibold text-lime underline-offset-4 hover:underline"
            >
              Open in Maps
            </a>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
