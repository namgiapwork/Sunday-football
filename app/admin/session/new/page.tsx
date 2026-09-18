import { requireAdminPage } from "@/lib/auth/current-user";
import { getGroup, listVenues } from "@/lib/data/groups";
import { defaultSignupDeadlineLocal } from "@/lib/sessions/deadline";
import { missingSundays } from "@/lib/sessions/upcoming";
import { Alert } from "@/components/ui/alert";
import { SessionForm } from "@/components/sessions/session-form";

export const metadata = { title: "New Sunday — Admin" };

export default async function NewSessionPage() {
  await requireAdminPage();
  const group = await getGroup();
  if (!group) return <Alert tone="warning">This football group has not been set up yet.</Alert>;

  const venues = await listVenues(group.id);
  // The coming Sunday, whether or not it already exists — the form will say so.
  const date = missingSundays([], new Date(), 1)[0];

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
          signupDeadline: defaultSignupDeadlineLocal(date, group),
        }}
      />
    </>
  );
}
