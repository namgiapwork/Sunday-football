import Link from "next/link";
import { requireAdmin } from "@/lib/auth/current-user";
import { getGroup } from "@/lib/data/groups";
import { getAttendanceSummary, getCurrentSession } from "@/lib/data/sessions";
import { getTeams } from "@/lib/data/teams";
import { SESSION_STATUS_LABELS, nextAdminAction, signupIsOpen } from "@/lib/sessions/state";
import { formatDeadline, formatSessionDate, formatTimeRange } from "@/lib/time/group-time";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, SectionTitle } from "@/components/ui/card";
import { StatusButton } from "@/components/sessions/status-button";

export const metadata = { title: "Admin — Sunday Football" };

export default async function AdminDashboard() {
  await requireAdmin();
  const group = await getGroup();

  if (!group) {
    return <Alert tone="warning">This football group has not been set up yet.</Alert>;
  }

  const session = await getCurrentSession(group.id);

  if (!session) {
    return (
      <>
        <h1 className="mb-3 text-2xl font-black tracking-tight">No Sunday scheduled</h1>
        <p className="mb-4 text-sm text-chalk-dim">Create one and signup opens straight away.</p>
        <ButtonLink href="/admin/session/new">Create Sunday</ButtonLink>
      </>
    );
  }

  const [summary, teams] = await Promise.all([
    getAttendanceSummary(session.id, group.id),
    getTeams(session.id, true),
  ]);

  const next = nextAdminAction(session.status);
  const venueName = session.venue?.name ?? session.venue_name_snapshot;

  return (
    <>
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-chalk-faint">Next Sunday</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">
          {formatSessionDate(session.date, group.timezone)}
        </h1>
        <p className="tabular mt-1 text-chalk-dim">
          {formatTimeRange(session.start_time, session.end_time)}
          {venueName ? ` · ${venueName}` : ""}
          {session.location_notes ? ` · ${session.location_notes}` : ""}
        </p>
        <p className="mt-2 inline-flex rounded-lg bg-pitch-800 px-2 py-1 text-xs font-bold text-lime">
          {SESSION_STATUS_LABELS[session.status]}
        </p>
      </header>

      {session.status === "cancelled" ? (
        <div className="mb-6">
          <Alert tone="error">Cancelled: {session.cancellation_reason}</Alert>
        </div>
      ) : null}

      <Card className="mb-6">
        <CardBody className="pt-4">
          <SectionTitle className="mb-3">Signup</SectionTitle>
          <dl className="grid grid-cols-4 gap-2 text-center">
            <Stat label="Confirmed" value={summary.confirmed} strong />
            <Stat label="Maybe" value={summary.maybe} />
            <Stat label="Out" value={summary.declined} />
            <Stat label="No reply" value={summary.noResponse} />
          </dl>
          {signupIsOpen(session) ? (
            <p className="mt-3 text-xs text-chalk-faint">
              Closes {formatDeadline(session.signup_deadline, group.timezone)}.
            </p>
          ) : null}
        </CardBody>
      </Card>

      <Card className="mb-6">
        <CardBody className="pt-4">
          <SectionTitle className="mb-3">Preparation</SectionTitle>
          <ul className="flex flex-col gap-2 text-sm">
            <Step done={session.status !== "draft"} label="Signup opened" />
            <Step
              done={["signup_closed", "teams_generated", "teams_published", "in_progress", "completed"].includes(
                session.status,
              )}
              label="Signup closed"
            />
            <Step done={teams.length > 0} label={teams.length > 0 ? `${teams.length} teams generated` : "Teams generated"} />
            <Step done={teams.some((t) => t.published)} label="Teams published" />
          </ul>
        </CardBody>
      </Card>

      {next ? (
        <div className="mb-6 flex flex-col gap-3">
          <p className="text-sm text-chalk-dim">{next.hint}</p>
          {next.href ? (
            <ButtonLink href={`/admin/session/${session.id}${next.href}`} size="lg">
              {next.label}
            </ButtonLink>
          ) : (
            <StatusButton sessionId={session.id} status={statusFor(session.status)} size="lg">
              {next.label}
            </StatusButton>
          )}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <ButtonLink href={`/admin/session/${session.id}`} variant="secondary">
          Manage Sunday
        </ButtonLink>
        <ButtonLink href={`/admin/session/${session.id}/teams`} variant="secondary">
          Teams
        </ButtonLink>
        <ButtonLink href="/admin/players" variant="secondary">
          Players
        </ButtonLink>
      </div>

      <p className="mt-8 text-sm">
        <Link href="/admin/session/new" className="font-semibold text-lime underline-offset-4 hover:underline">
          Create another Sunday
        </Link>
      </p>
    </>
  );
}

/** The dashboard's primary button only ever performs the one obvious next step. */
function statusFor(status: string) {
  switch (status) {
    case "draft":
      return "signup_open" as const;
    case "signup_open":
      return "signup_closed" as const;
    case "teams_published":
      return "in_progress" as const;
    case "in_progress":
      return "completed" as const;
    default:
      return "signup_open" as const;
  }
}

function Stat({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div>
      <dd className={`tabular font-black ${strong ? "text-3xl text-lime" : "text-2xl text-chalk"}`}>{value}</dd>
      <dt className="text-xs text-chalk-faint">{label}</dt>
    </div>
  );
}

function Step({ done, label }: { done: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-2 ${done ? "text-chalk" : "text-chalk-faint"}`}>
      <span aria-hidden>{done ? "✅" : "⚪️"}</span>
      {label}
    </li>
  );
}
