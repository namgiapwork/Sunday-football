import { requirePlayerPage } from "@/lib/auth/current-user";
import { getGroup } from "@/lib/data/groups";
import { listRoster, listUpcomingSessions } from "@/lib/data/sessions";
import { Alert } from "@/components/ui/alert";
import { SessionList } from "@/components/sessions/session-list";

export const metadata = { title: "Sunday Football" };

export default async function HomePage() {
  const user = await requirePlayerPage();
  const group = await getGroup();

  if (!group) {
    return (
      <main className="px-5 py-10">
        <Alert tone="warning">This football group has not been set up yet.</Alert>
      </main>
    );
  }

  const [upcoming, roster] = await Promise.all([
    listUpcomingSessions(group.id, user.player.id),
    listRoster(group.id),
  ]);

  return (
    <main>
      <header className="px-5 pt-8 pb-5">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-lime">{group.name}</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">Which Sundays are you playing?</h1>
        <p className="mt-1 text-sm text-chalk-dim">
          Hi {user.player.name}. Tap a date to answer — you can change your mind until signup closes.
        </p>
      </header>

      <SessionList sessions={upcoming} roster={roster} timezone={group.timezone} />
    </main>
  );
}
