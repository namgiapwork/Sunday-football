import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlayerPage } from "@/lib/auth/current-user";
import { getGroup } from "@/lib/data/groups";
import { getSessionDetail, type Participant, type RosterEntry } from "@/lib/data/sessions";
import { signupClosedReason, signupIsOpen, teamsVisible } from "@/lib/sessions/state";
import { formatDeadline, formatSessionDate, formatTimeRange } from "@/lib/time/group-time";
import { Alert } from "@/components/ui/alert";
import { SectionTitle } from "@/components/ui/card";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { SignupControls } from "@/components/sessions/signup-controls";

export default async function SundayPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const user = await requirePlayerPage();
  const group = await getGroup();
  if (!group) notFound();

  const detail = await getSessionDetail(sessionId, group.id, user.player.id);
  if (!detail) notFound();

  const { session, summary, mySignup, confirmed, maybe, declined, noResponse } = detail;
  const venueName = session.venue_name_snapshot ?? session.venue?.name ?? session.location_override;
  const open = signupIsOpen(session);

  return (
    <main className="pb-8">
      <div className="px-5 pt-6">
        <Link href="/home" className="text-sm font-semibold text-chalk-faint underline-offset-4 hover:underline">
          ← All Sundays
        </Link>
      </div>

      <header className="px-5 pt-4">
        <h1 className="text-3xl font-black tracking-tight">
          {formatSessionDate(session.date, group.timezone)}
        </h1>
        <p className="tabular mt-0.5 text-lg font-semibold text-chalk-dim">
          {formatTimeRange(session.start_time, session.end_time)}
        </p>
        {venueName ? (
          <p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-sm text-chalk-dim">
            <span aria-hidden>📍</span>
            <span className="font-semibold text-chalk">{venueName}</span>
            {session.venue?.maps_url ? (
              <a
                href={session.venue.maps_url}
                target="_blank"
                rel="noreferrer noopener"
                className="font-semibold text-lime underline-offset-4 hover:underline"
              >
                Open in Maps
              </a>
            ) : null}
          </p>
        ) : null}
      </header>

      {session.status === "cancelled" ? (
        <div className="px-5 pt-5">
          <Alert tone="error">Cancelled — {session.cancellation_reason}</Alert>
        </div>
      ) : (
        <>
          <div className="px-5 pt-5">
            <p className="tabular text-4xl font-black leading-none">
              {summary.confirmed}
              <span className="ml-2 text-base font-bold text-chalk-dim">playing</span>
            </p>
          </div>

          <div className="pt-4">
            <SignupControls
              sessionId={session.id}
              current={mySignup}
              disabled={!open}
              disabledReason={signupClosedReason(session)}
            />
          </div>

          {open ? (
            <p className="px-5 pt-3 text-sm text-chalk-faint">
              Closes {formatDeadline(session.signup_deadline, group.timezone)}
            </p>
          ) : null}

          {teamsVisible(session) ? (
            <div className="px-5 pt-5">
              <Link
                href="/teams"
                className="flex items-center justify-between rounded-2xl border border-lime/40 bg-lime/10 px-5 py-3"
              >
                <span className="font-bold text-lime">Teams are ready</span>
                <span aria-hidden className="text-lime">→</span>
              </Link>
            </div>
          ) : session.teams_reveal_at && new Date(session.teams_reveal_at) > new Date() ? (
            <p className="px-5 pt-5 text-sm text-chalk-faint">
              Teams revealed {formatDeadline(session.teams_reveal_at, group.timezone)}
            </p>
          ) : null}

          <div className="mt-8 flex flex-col gap-6 px-5">
            <Group title="Playing" people={confirmed} />
            <Group title="Maybe" people={maybe} muted />
            <Group title="Can't play" people={declined} muted />
            <Group title="No answer yet" people={noResponse} muted />
          </div>
        </>
      )}
    </main>
  );
}

function Group({
  title,
  people,
  muted,
}: {
  title: string;
  people: (Participant | RosterEntry)[];
  muted?: boolean;
}) {
  if (people.length === 0) return null;

  return (
    <section>
      <SectionTitle className="mb-2">
        {title} ({people.length})
      </SectionTitle>
      <ul className={`flex flex-col divide-y divide-pitch-850 rounded-2xl border border-pitch-800 ${muted ? "opacity-70" : ""}`}>
        {people.map((person) => {
          const id = "playerId" in person ? person.playerId : person.id;
          const avatar = "avatarUrl" in person ? person.avatarUrl : null;
          return (
            <li key={id} className="flex items-center gap-3 px-4 py-2.5">
              <PlayerAvatar name={person.name} avatarUrl={avatar} size="sm" />
              <span className="font-semibold">{person.name}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
