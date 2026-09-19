import { describe, expect, it } from "vitest";
import { outcomeOf, picksRevealed, predictionsOpen } from "@/lib/feed/fixture-state";
import { buildLeaderboard } from "@/lib/feed/leaderboard";
import { rankTotals } from "@/lib/feed/top-stats";

const future = new Date(Date.now() + 3_600_000).toISOString();
const past = new Date(Date.now() - 3_600_000).toISOString();

describe("fixture state", () => {
  it("derives the outcome from the score", () => {
    expect(outcomeOf(2, 1)).toBe("home");
    expect(outcomeOf(0, 3)).toBe("away");
    expect(outcomeOf(1, 1)).toBe("draw");
  });

  it("opens predictions only before kickoff on a scheduled fixture", () => {
    expect(predictionsOpen({ status: "scheduled", kickoff_at: future })).toBe(true);
    expect(predictionsOpen({ status: "scheduled", kickoff_at: past })).toBe(false);
    expect(predictionsOpen({ status: "postponed", kickoff_at: future })).toBe(false);
    expect(predictionsOpen({ status: "cancelled", kickoff_at: future })).toBe(false);
  });

  it("reveals picks after kickoff or once settled", () => {
    expect(picksRevealed({ status: "scheduled", kickoff_at: future })).toBe(false);
    expect(picksRevealed({ status: "scheduled", kickoff_at: past })).toBe(true);
    expect(picksRevealed({ status: "finished", kickoff_at: future })).toBe(true);
    expect(picksRevealed({ status: "postponed", kickoff_at: future })).toBe(false);
  });
});

describe("leaderboard", () => {
  const names = new Map([["a", "Ann"], ["b", "Ben"], ["c", "Cy"]]);
  const fixtures = [
    { id: "f1", status: "finished", home_goals: 2, away_goals: 0 },
    { id: "f2", status: "finished", home_goals: 1, away_goals: 1 },
    { id: "f3", status: "postponed", home_goals: null, away_goals: null },
  ];

  it("scores one point per correct pick and ignores unfinished fixtures", () => {
    const rows = buildLeaderboard(
      fixtures,
      [
        { fixtureId: "f1", playerId: "a", pick: "home" },
        { fixtureId: "f2", playerId: "a", pick: "draw" },
        { fixtureId: "f3", playerId: "a", pick: "home" },
        { fixtureId: "f1", playerId: "b", pick: "away" },
      ],
      names,
    );
    expect(rows).toEqual([
      { playerId: "a", name: "Ann", points: 2, picks: 2 },
      { playerId: "b", name: "Ben", points: 0, picks: 1 },
    ]);
  });

  it("breaks ties on picks made, then name", () => {
    const rows = buildLeaderboard(
      fixtures,
      [
        { fixtureId: "f1", playerId: "c", pick: "home" },
        { fixtureId: "f1", playerId: "b", pick: "home" },
        { fixtureId: "f2", playerId: "b", pick: "home" },
      ],
      names,
    );
    expect(rows.map((r) => r.name)).toEqual(["Ben", "Cy"]);
  });

  it("returns nothing when nobody has picked", () => {
    expect(buildLeaderboard(fixtures, [], names)).toEqual([]);
  });

  it("re-scores when a result is corrected", () => {
    const pick = [{ fixtureId: "f1", playerId: "a", pick: "home" as const }];
    const before = buildLeaderboard(fixtures, pick, names);
    const corrected = [{ id: "f1", status: "finished", home_goals: 0, away_goals: 1 }];
    expect(before[0].points).toBe(1);
    expect(buildLeaderboard(corrected, pick, names)[0].points).toBe(0);
  });
});

describe("top stats", () => {
  const players = [
    { id: "a", name: "Ann", avatar_url: null },
    { id: "b", name: "Ben", avatar_url: null },
    { id: "c", name: "Cy", avatar_url: null },
  ];

  it("adds ledger deltas to event counts, hides zeros and ranks", () => {
    const rows = rankTotals(players, new Map([["a", 2]]), new Map([["a", 1], ["b", 3], ["c", -1]]));
    expect(rows.map((r) => [r.name, r.total])).toEqual([["Ann", 3], ["Ben", 3]]);
  });

  it("honours the limit", () => {
    expect(rankTotals(players, new Map([["a", 1], ["b", 1], ["c", 1]]), new Map(), 2)).toHaveLength(2);
  });
});
