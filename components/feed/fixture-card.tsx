import { outcomeOf, predictionsOpen, type Pick } from "@/lib/feed/fixture-state";
import type { FixtureWithPicks } from "@/lib/data/feed";
import { Card, CardBody } from "@/components/ui/card";
import { PredictionButtons } from "./prediction-buttons";

function kickoffLabel(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(new Date(iso));
}

export function FixtureCard({ fixture, timezone }: { fixture: FixtureWithPicks; timezone: string }) {
  const open = predictionsOpen(fixture);
  const finished = fixture.status === "finished" && fixture.home_goals !== null && fixture.away_goals !== null;
  const outcome = finished ? outcomeOf(fixture.home_goals!, fixture.away_goals!) : null;
  const labelOf = (pick: Pick) =>
    pick === "home" ? fixture.home_team : pick === "away" ? fixture.away_team : "Draw";

  return (
    <Card>
      <CardBody className="pt-4">
        <p className="text-xs font-semibold text-chalk-faint">
          {fixture.competition ? `${fixture.competition} · ` : ""}
          {kickoffLabel(fixture.kickoff_at, timezone)}
          {fixture.status === "postponed" ? " · Postponed" : ""}
        </p>
        <p className="mt-1 text-lg font-black tracking-tight">
          {fixture.home_team}
          {finished ? (
            <span className="tabular mx-2 text-lime">
              {fixture.home_goals}–{fixture.away_goals}
            </span>
          ) : (
            <span className="mx-2 text-chalk-faint">vs</span>
          )}
          {fixture.away_team}
        </p>

        {open ? (
          <PredictionButtons
            fixtureId={fixture.id}
            homeTeam={fixture.home_team}
            awayTeam={fixture.away_team}
            current={fixture.myPick}
          />
        ) : (
          <p className="mt-2 text-sm text-chalk-dim">
            {fixture.myPick ? `Your pick: ${labelOf(fixture.myPick)}` : "You did not pick."}
            {outcome && fixture.myPick ? (fixture.myPick === outcome ? " ✓" : " ✗") : ""}
            {!finished && fixture.status === "scheduled" ? " · Locked" : ""}
          </p>
        )}

        {fixture.revealed && fixture.revealed.length > 0 ? (
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer font-semibold text-chalk-dim">
              Everyone&apos;s picks ({fixture.revealed.length})
            </summary>
            <ul className="mt-2 flex flex-col gap-1">
              {fixture.revealed.map((r) => (
                <li key={r.name} className="flex justify-between gap-3">
                  <span>{r.name}</span>
                  <span className={outcome === r.pick ? "font-semibold text-lime" : "text-chalk-faint"}>
                    {labelOf(r.pick)}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </CardBody>
    </Card>
  );
}
