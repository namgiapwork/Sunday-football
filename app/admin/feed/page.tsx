import { requireAdminPage } from "@/lib/auth/current-user";
import { getGroup } from "@/lib/data/groups";
import { getFeed, getStatTotals, listAdjustments } from "@/lib/data/feed";
import { hasKickedOff } from "@/lib/feed/fixture-state";
import { Alert } from "@/components/ui/alert";
import { Card, CardBody, SectionTitle } from "@/components/ui/card";
import { FixtureForm, FixtureStatusButtons, ResultForm, StatAdjustForm, VoidButton } from "@/components/feed/admin-forms";

export const metadata = { title: "Feed — Admin" };

export default async function AdminFeedPage() {
  const admin = await requireAdminPage();
  const group = await getGroup();
  if (!group) return <Alert tone="warning">This football group has not been set up yet.</Alert>;

  const [feed, stats, adjustments] = await Promise.all([
    getFeed(group.id, admin.player.id),
    getStatTotals(group.id),
    listAdjustments(group.id),
  ]);

  const players = stats.players.map((p) => ({
    id: p.id,
    name: p.name,
    goal: stats.totals.goal.get(p.id) ?? 0,
    assist: stats.totals.assist.get(p.id) ?? 0,
  }));

  return (
    <>
      <h1 className="mb-6 text-2xl font-black tracking-tight">Feed</h1>

      <SectionTitle className="mb-3">Matches</SectionTitle>
      <ul className="mb-6 flex flex-col gap-3">
        {[...feed.upcoming, ...feed.results].map((f) => (
          <li key={f.id}>
            <Card>
              <CardBody className="pt-4">
                <p className="font-bold">
                  {f.home_team} vs {f.away_team}
                </p>
                <p className="text-xs text-chalk-faint">
                  {new Date(f.kickoff_at).toLocaleString("en-GB", { timeZone: group.timezone })} · {f.status}
                </p>
                {hasKickedOff(f.kickoff_at) ? (
                  <ResultForm fixtureId={f.id} home={f.home_goals} away={f.away_goals} />
                ) : null}
                {f.status !== "finished" ? <FixtureStatusButtons fixtureId={f.id} status={f.status} /> : null}
              </CardBody>
            </Card>
          </li>
        ))}
      </ul>

      <SectionTitle className="mb-3">Add a match</SectionTitle>
      <div className="mb-8">
        <FixtureForm timezone={group.timezone} />
      </div>

      <SectionTitle className="mb-3">Change goals or assists</SectionTitle>
      <div className="mb-6">
        <StatAdjustForm players={players} />
      </div>

      <SectionTitle className="mb-3">Recent corrections</SectionTitle>
      {adjustments.length === 0 ? (
        <Alert tone="info">No corrections yet.</Alert>
      ) : (
        <ul className="flex flex-col gap-2">
          {adjustments.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 rounded-2xl border border-pitch-700 bg-pitch-900 px-4 py-3 text-sm">
              <span className={a.voided_at ? "text-chalk-faint line-through" : ""}>
                <strong>{a.player?.name ?? "Unknown"}</strong> {a.delta > 0 ? "+" : ""}
                {a.delta} {a.stat === "goal" ? "goal" : "assist"}
                {Math.abs(a.delta) === 1 ? "" : "s"} — {a.reason}
              </span>
              {a.voided_at ? null : <VoidButton adjustmentId={a.id} />}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
