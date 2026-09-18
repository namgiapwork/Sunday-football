import Link from "next/link";
import { requirePlayerPage } from "@/lib/auth/current-user";
import { getGroup } from "@/lib/data/groups";
import { getCurrentSession, type SessionWithVenue } from "@/lib/data/sessions";
import { getMyTeam, getTeams } from "@/lib/data/teams";
import { teamsAwaitingReveal, teamsVisible } from "@/lib/sessions/state";
import { formatDeadline, formatSessionDate, formatTimeRange } from "@/lib/time/group-time";
import { Alert } from "@/components/ui/alert";
import { SectionTitle } from "@/components/ui/card";
import { TeamCard } from "@/components/teams/team-card";
import { kitColour } from "@/components/teams/team-colours";

export const metadata = { title: "Teams — Sunday Football" };

export default async function TeamsPage() {
  const user = await requirePlayerPage();
  const group = await getGroup();
  if (!group) return <Shell>{null}<Alert tone="info">This football group has not been set up yet.</Alert></Shell>;

  const session = await getCurrentSession(group.id);
  if (!session) {
    return (
      <Shell>
        {null}
        <Alert tone="info">No Sunday is scheduled yet.</Alert>
      </Shell>
    );
  }

  const header = <MatchCard session={session} timezone={group.timezone} />;

  if (teamsAwaitingReveal(session)) {
    return (
      <Shell>
        {header}
        <Alert tone="info">
          Teams are picked. They go up {formatDeadline(session.teams_reveal_at!, group.timezone)} — check
          back then.
        </Alert>
      </Shell>
    );
  }

  if (!teamsVisible(session)) {
    return (
      <Shell>
        {header}
        <Alert tone="info">
          Teams are not ready yet. They appear here as soon as the organisers have picked them.
        </Alert>
      </Shell>
    );
  }

  // Ratings are deliberately not requested for this page.
  const teams = await getTeams(session.id, false);
  const myTeamId = await getMyTeam(session.id, user.player.id);
  const myTeam = teams.find((t) => t.id === myTeamId);
  const others = teams.filter((t) => t.id !== myTeamId);

  return (
    <Shell>
      {header}

      {myTeam ? (
        <>
          <h2 className="mb-3 text-2xl font-black tracking-tight">
            You&apos;re on{" "}
            <span className={kitColour(myTeam.colour).text}>
              {kitColour(myTeam.colour).emoji} {myTeam.name}
            </span>
          </h2>
          <TeamCard team={myTeam} highlight />
        </>
      ) : (
        <Alert tone="info">
          You are not in a team this week. If that looks wrong, message the organisers.
        </Alert>
      )}

      {others.length > 0 ? (
        <div className="mt-8">
          <SectionTitle className="mb-3">All teams</SectionTitle>
          <div className="flex flex-col gap-4">
            {others.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        </div>
      ) : null}
    </Shell>
  );
}

/** Date, time and place, so the team sheet is also the "where do I go" screen. */
function MatchCard({ session, timezone }: { session: SessionWithVenue; timezone: string }) {
  const venueName = session.venue_name_snapshot ?? session.venue?.name ?? session.location_override;
  const venueNotes = session.venue_notes_snapshot ?? session.location_notes;
  const mapsUrl = session.venue?.maps_url;

  return (
    <section className="mb-6 rounded-3xl border border-pitch-700 bg-pitch-900 px-5 py-4">
      <h2 className="text-2xl font-black tracking-tight">{formatSessionDate(session.date, timezone)}</h2>
      <p className="tabular mt-0.5 text-lg font-semibold text-chalk-dim">
        {formatTimeRange(session.start_time, session.end_time)}
      </p>

      {venueName ? (
        <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-chalk-dim">
          <span aria-hidden>📍</span>
          <span className="font-semibold text-chalk">{venueName}</span>
          {venueNotes ? <span>{venueNotes}</span> : null}
        </p>
      ) : null}

      {mapsUrl ? (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-3 inline-flex h-11 items-center rounded-xl bg-pitch-800 px-4 text-sm font-bold text-lime hover:bg-pitch-700"
        >
          Open in Maps →
        </a>
      ) : null}
    </section>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="px-5 py-8">
      <h1 className="mb-5 text-sm font-bold uppercase tracking-[0.2em] text-lime">Teams</h1>
      {children}
      <p className="mt-8 text-center text-sm text-chalk-faint">
        <Link href="/home" className="font-semibold underline-offset-4 hover:underline">
          Back to Sundays
        </Link>
      </p>
    </main>
  );
}
