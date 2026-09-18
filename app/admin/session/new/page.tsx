import { requireAdmin } from "@/lib/auth/current-user";
import { getGroup, listVenues } from "@/lib/data/groups";
import { Alert } from "@/components/ui/alert";
import { SessionForm } from "@/components/sessions/session-form";

export const metadata = { title: "New Sunday — Admin" };

export default async function NewSessionPage() {
  await requireAdmin();
  const group = await getGroup();
  if (!group) return <Alert tone="warning">This football group has not been set up yet.</Alert>;

  const venues = await listVenues(group.id);
  const { date, deadline } = nextSunday(group.default_signup_deadline_dow);

  return (
    <>
      <h1 className="mb-6 text-2xl font-black tracking-tight">New Sunday</h1>
      <SessionForm
        venues={venues}
        initial={{
          date,
          startTime: group.default_start_time.slice(0, 5),
          endTime: group.default_end_time.slice(0, 5),
          venueId: group.default_venue_id,
          locationNotes: "",
          note: "",
          signupDeadline: `${deadline}T${group.default_signup_deadline_time.slice(0, 5)}`,
        }}
      />
    </>
  );
}

/** Defaults to the coming Sunday, with the deadline on the group's chosen weekday. */
function nextSunday(deadlineDow: number) {
  const today = new Date();
  const daysUntilSunday = (7 - today.getUTCDay()) % 7 || 7;
  const sunday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + daysUntilSunday));

  const deadline = new Date(sunday);
  const offset = (7 + 0 - deadlineDow) % 7 || 7;
  deadline.setUTCDate(sunday.getUTCDate() - offset);

  return { date: iso(sunday), deadline: iso(deadline) };
}

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}
