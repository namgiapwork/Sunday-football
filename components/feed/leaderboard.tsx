import type { LeaderboardRow } from "@/lib/feed/leaderboard";
import { Card, CardBody, SectionTitle } from "@/components/ui/card";

export function Leaderboard({ rows, viewerName }: { rows: LeaderboardRow[]; viewerName: string }) {
  return (
    <Card>
      <CardBody className="pt-4">
        <SectionTitle className="mb-3">Prediction table</SectionTitle>
        {rows.length === 0 ? (
          <p className="text-sm text-chalk-faint">Points appear once a match you picked has finished.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {rows.map((row, i) => (
              <li key={row.playerId} className="flex items-center gap-3">
                <span className="tabular w-5 text-sm font-bold text-chalk-faint">{i + 1}</span>
                <span className={`flex-1 font-semibold ${row.name === viewerName ? "text-lime" : ""}`}>{row.name}</span>
                <span className="tabular text-sm text-chalk-faint">{row.points}/{row.picks}</span>
                <span className="tabular w-8 text-right text-lg font-black">{row.points}</span>
              </li>
            ))}
          </ol>
        )}
      </CardBody>
    </Card>
  );
}
