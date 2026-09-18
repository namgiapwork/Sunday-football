import Link from "next/link";
import { requirePlayer } from "@/lib/auth/current-user";
import { getGroup } from "@/lib/data/groups";
import {
  getAttendanceSummary,
  getCurrentSession,
  getMySignup,
  listSignups,
} from "@/lib/data/sessions";
import { signupClosedReason, signupIsOpen, teamsArePublic } from "@/lib/sessions/state";
import { formatDeadline } from "@/lib/time/group-time";
import { Alert } from "@/components/ui/alert";
import { AttendanceCounter } from "@/components/sessions/attendance-counter";
import { ConfirmedPlayers } from "@/components/sessions/confirmed-players";
import { SessionHeader } from "@/components/sessions/session-header";
import { SignupControls } from "@/components/sessions/signup-controls";

export const metadata = { title: "Sunday Football" };

export default async function HomePage() {
  const user = await requirePlayer();
  const group = await getGroup();

  if (!group) {
    return (
      <main className="px-5 py-10">
        <Alert tone="warning">This football group has not been set up yet.</Alert>
      </main>
    );
  }

  const session = await getCurrentSession(group.id);

  if (!session) {
    return (
      <main className="px-5 py-10">
        <h1 className="mb-3 text-3xl font-black tracking-tight">Sunday Football</h1>
        <Alert tone="info">No Sunday is scheduled yet. The organisers will add one soon.</Alert>
      </main>
    );
  }

  const [summary, mySignup, signups] = await Promise.all([
    getAttendanceSummary(session.id, group.id),
    getMySignup(session.id, user.player.id),
    listSignups(session.id),
  ]);

  const open = signupIsOpen(session);
  const teamsReady = teamsArePublic(session.status);

  return (
    <main>
      {session.status === "cancelled" ? (
        <div className="px-5 pt-6">
          <Alert tone="error">
            <strong className="block text-base">This Sunday is cancelled.</strong>
            {session.cancellation_reason}
          </Alert>
        </div>
      ) : null}

      <SessionHeader session={session} timezone={group.timezone} />

      <AttendanceCounter sessionId={session.id} initial={summary} />

      {session.status !== "cancelled" ? (
        <>
          <SignupControls
            sessionId={session.id}
            current={mySignup}
            disabled={!open}
            disabledReason={signupClosedReason(session)}
          />

          {open ? (
            <p className="px-5 pt-3 text-sm text-chalk-faint">
              Signup closes {formatDeadline(session.signup_deadline, group.timezone)}.
            </p>
          ) : null}
        </>
      ) : null}

      {teamsReady ? (
        <section className="px-5 pt-6">
          <Link
            href="/teams"
            className="flex items-center justify-between rounded-3xl border border-lime/40 bg-lime/10 px-5 py-4"
          >
            <span>
              <span className="block text-xl font-black tracking-tight text-lime">Teams are ready!</span>
              <span className="text-sm text-chalk-dim">See who you are playing with.</span>
            </span>
            <span aria-hidden className="text-2xl text-lime">
              →
            </span>
          </Link>
        </section>
      ) : null}

      <div className="pt-6">
        <ConfirmedPlayers signups={signups} />
      </div>
    </main>
  );
}
