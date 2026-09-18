import Link from "next/link";
import { requirePlayer } from "@/lib/auth/current-user";
import { getGroup } from "@/lib/data/groups";
import { getCurrentSession } from "@/lib/data/sessions";
import { getMyTeam, getTeams } from "@/lib/data/teams";
import { teamsArePublic } from "@/lib/sessions/state";
import { formatSessionDate } from "@/lib/time/group-time";
import { Alert } from "@/components/ui/alert";
import { SectionTitle } from "@/components/ui/card";
import { TeamCard } from "@/components/teams/team-card";
import { kitColour } from "@/components/teams/team-colours";

export const metadata = { title: "Teams — Sunday Football" };

export default async function TeamsPage() {
  const user = await requirePlayer();
  const group = await getGroup();
  if (!group) return <Empty message="This football group has not been set up yet." />;

  const session = await getCurrentSession(group.id);
  if (!session) return <Empty message="No Sunday is scheduled yet." />;

  if (!teamsArePublic(session.status)) {
    return (
      <Empty message="Teams are not ready yet. They appear here the moment the organisers finish picking them, usually the day before." />
    );
  }

  // Ratings are deliberately not requested for this page.
  const teams = await getTeams(session.id, false);
  const myTeamId = await getMyTeam(session.id, user.player.id);
  const myTeam = teams.find((t) => t.id === myTeamId);
  const others = teams.filter((t) => t.id !== myTeamId);

  return (
    <main className="px-5 py-8">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-chalk-faint">
        {formatSessionDate(session.date, group.timezone)}
      </p>

      {myTeam ? (
        <>
          <h1 className="mt-1 mb-4 text-3xl font-black tracking-tight">
            You&apos;re on{" "}
            <span className={kitColour(myTeam.colour).text}>
              {kitColour(myTeam.colour).emoji} {myTeam.name}
            </span>
          </h1>
          <TeamCard team={myTeam} highlight />
        </>
      ) : (
        <>
          <h1 className="mt-1 mb-4 text-3xl font-black tracking-tight">Teams</h1>
          <Alert tone="info">
            You are not in a team this week. If that looks wrong, message the organisers.
          </Alert>
        </>
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

      <p className="mt-8 text-center text-sm text-chalk-faint">
        <Link href="/home" className="font-semibold underline-offset-4 hover:underline">
          Back to Sunday
        </Link>
      </p>
    </main>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <main className="px-5 py-10">
      <h1 className="mb-3 text-3xl font-black tracking-tight">Teams</h1>
      <Alert tone="info">{message}</Alert>
    </main>
  );
}
