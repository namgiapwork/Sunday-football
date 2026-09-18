import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/current-user";
import { getGroup, listVenues } from "@/lib/data/groups";
import { getAttendanceSummary, getSession, listSignups } from "@/lib/data/sessions";
import { SESSION_STATUS_LABELS, allowedTransitions } from "@/lib/sessions/state";
import { formatSessionDate, utcToLocalInput } from "@/lib/time/group-time";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, SectionTitle } from "@/components/ui/card";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { SessionForm } from "@/components/sessions/session-form";
import { StatusButton } from "@/components/sessions/status-button";
import { CancelSessionForm } from "./cancel-form";

export default async function AdminSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  await requireAdmin();

  const group = await getGroup();
  if (!group) return <Alert tone="warning">This football group has not been set up yet.</Alert>;

  const session = await getSession(sessionId);
  if (!session) notFound();

  const [venues, summary, signups] = await Promise.all([
    listVenues(group.id),
    getAttendanceSummary(session.id, group.id),
    listSignups(session.id),
  ]);

  const transitions = allowedTransitions(session.status).filter((s) => s !== "cancelled");

  return (
    <>
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-chalk-faint">Sunday</p>
      <h1 className="mt-1 text-2xl font-black tracking-tight">
        {formatSessionDate(session.date, group.timezone)}
      </h1>
      <p className="mt-2 mb-6 inline-flex rounded-lg bg-pitch-800 px-2 py-1 text-xs font-bold text-lime">
        {SESSION_STATUS_LABELS[session.status]}
      </p>

      {session.status === "cancelled" ? (
        <div className="mb-6">
          <Alert tone="error">Cancelled: {session.cancellation_reason}</Alert>
        </div>
      ) : null}

      <Card className="mb-6">
        <CardBody className="pt-4">
          <SectionTitle className="mb-3">Attendance</SectionTitle>
          <dl className="grid grid-cols-4 gap-2 text-center">
            <Stat label="Confirmed" value={summary.confirmed} strong />
            <Stat label="Maybe" value={summary.maybe} />
            <Stat label="Out" value={summary.declined} />
            <Stat label="No reply" value={summary.noResponse} />
          </dl>

          <div className="mt-4">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-chalk-faint">Confirmed</h3>
            <ul className="flex flex-wrap gap-2">
              {signups
                .filter((s) => s.status === "confirmed")
                .map((s) => (
                  <li
                    key={s.playerId}
                    className="flex items-center gap-2 rounded-full border border-pitch-700 py-1 pl-1 pr-3"
                  >
                    <PlayerAvatar name={s.name} avatarUrl={s.avatarUrl} size="sm" />
                    <span className="text-sm font-semibold">{s.name}</span>
                  </li>
                ))}
            </ul>
            {summary.confirmed === 0 ? <p className="text-sm text-chalk-faint">Nobody yet.</p> : null}
          </div>
        </CardBody>
      </Card>

      <div className="mb-8 flex flex-wrap gap-3">
        <ButtonLink href={`/admin/session/${session.id}/teams`}>Team generator</ButtonLink>
        {transitions.map((target) => (
          <StatusButton key={target} sessionId={session.id} status={target} variant="secondary">
            Move to {SESSION_STATUS_LABELS[target].toLowerCase()}
          </StatusButton>
        ))}
      </div>

      <div className="mb-10">
        <SectionTitle className="mb-3">Edit Sunday</SectionTitle>
        <SessionForm
          venues={venues}
          initial={{
            id: session.id,
            date: session.date,
            startTime: session.start_time.slice(0, 5),
            endTime: session.end_time.slice(0, 5),
            venueId: session.venue_id,
            locationNotes: session.location_notes ?? "",
            note: session.note ?? "",
            signupDeadline: utcToLocalInput(session.signup_deadline, group.timezone),
          }}
        />
      </div>

      {session.status !== "cancelled" && session.status !== "completed" ? (
        <div className="border-t border-pitch-800 pt-6">
          <SectionTitle className="mb-3">Cancel this Sunday</SectionTitle>
          <p className="mb-3 text-sm text-chalk-dim">
            The Sunday stays in the history, and everyone sees your reason on the home screen.
          </p>
          <CancelSessionForm sessionId={session.id} />
        </div>
      ) : null}

      <p className="mt-8 text-sm">
        <Link href="/admin" className="font-semibold text-chalk-faint underline-offset-4 hover:underline">
          ← Back to admin
        </Link>
      </p>
    </>
  );
}

function Stat({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div>
      <dd className={`tabular font-black ${strong ? "text-3xl text-lime" : "text-2xl text-chalk"}`}>{value}</dd>
      <dt className="text-xs text-chalk-faint">{label}</dt>
    </div>
  );
}
