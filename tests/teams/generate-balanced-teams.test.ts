import { describe, expect, it } from "vitest";
import { generateBalancedTeams } from "@/lib/teams/generate-balanced-teams";
import { COVERED_CATEGORIES, OUTFIELD_CATEGORIES } from "@/lib/teams/positions";
import type { GenerateTeamsResult } from "@/lib/teams/types";
import { ALL_TEST_PLAYERS, testPlayers } from "../helpers/players";

/** Attendance numbers the spec asks us to validate against (§40). */
const SCENARIOS: { players: number; teams: number }[] = [
  { players: 14, teams: 2 },
  { players: 21, teams: 3 },
  { players: 24, teams: 3 },
  { players: 28, teams: 4 },
  { players: 29, teams: 4 },
  { players: 32, teams: 4 },
  { players: 35, teams: 5 },
];

function allAssigned(result: GenerateTeamsResult): string[] {
  return result.teams.flatMap((t) => t.players.map((p) => p.playerId));
}

describe.each(SCENARIOS)("$players players into $teams teams", ({ players, teams }) => {
  const squad = testPlayers(players);
  const result = generateBalancedTeams(squad, teams, { seed: 42, restarts: 60 });

  it("assigns every confirmed player exactly once", () => {
    const assigned = allAssigned(result);
    expect(assigned).toHaveLength(players);
    expect(new Set(assigned).size).toBe(players);
    expect(new Set(assigned)).toEqual(new Set(squad.map((p) => p.id)));
  });

  it("keeps team sizes within one of each other", () => {
    const sizes = result.teams.map((t) => t.players.length);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
  });

  it("keeps team average ratings close", () => {
    expect(result.metrics.averageRatingSpread).toBeLessThanOrEqual(0.8);
  });

  it("gives every team a goalkeeper when there are enough to go round", () => {
    const capable = result.metrics.goalkeeperCapableCount;
    const expectedWithKeeper = Math.min(capable, teams);
    expect(result.teams.filter((t) => t.hasGoalkeeper).length).toBe(expectedWithKeeper);
  });

  it("puts exactly one player in goal per team", () => {
    for (const team of result.teams) {
      expect(team.players.filter((p) => p.assignedPosition === "GK")).toHaveLength(1);
    }
  });

  it("covers defence, midfield and attack in every team", () => {
    for (const team of result.teams) {
      const covered = new Set(team.players.flatMap((p) => COVERED_CATEGORIES[p.assignedPosition]));
      for (const category of OUTFIELD_CATEGORIES) {
        expect(covered.has(category), `${category} missing from team ${team.index}`).toBe(true);
      }
    }
  });

  it("favours first-choice positions for most players", () => {
    expect(result.metrics.firstChoiceCount / players).toBeGreaterThan(0.5);
  });

  it("reports a healthy balance score", () => {
    expect(result.metrics.balanceScore).toBeGreaterThanOrEqual(70);
    expect(result.metrics.balanceScore).toBeLessThanOrEqual(100);
  });
});

describe("determinism", () => {
  it("returns the same arrangement for the same seed", () => {
    const a = generateBalancedTeams(testPlayers(28), 4, { seed: 7, restarts: 30 });
    const b = generateBalancedTeams(testPlayers(28), 4, { seed: 7, restarts: 30 });
    expect(allAssigned(a)).toEqual(allAssigned(b));
    expect(a.penalty).toBe(b.penalty);
  });

  it("returns a different arrangement for a different seed", () => {
    const a = generateBalancedTeams(testPlayers(28), 4, { seed: 1, restarts: 30 });
    const b = generateBalancedTeams(testPlayers(28), 4, { seed: 2, restarts: 30 });
    expect(allAssigned(a)).not.toEqual(allAssigned(b));
  });
});

describe("regenerate", () => {
  it("moves a meaningful share of players away from the previous teams", () => {
    const squad = testPlayers(28);
    const first = generateBalancedTeams(squad, 4, { seed: 11, restarts: 60 });

    const previousAssignment: Record<string, number> = {};
    for (const team of first.teams) {
      for (const player of team.players) previousAssignment[player.playerId] = team.index;
    }

    const second = generateBalancedTeams(squad, 4, {
      seed: 12,
      restarts: 60,
      previousAssignment,
      minimumChangeRatio: 0.3,
    });

    let moved = 0;
    for (const team of second.teams) {
      for (const player of team.players) {
        if (previousAssignment[player.playerId] !== team.index) moved += 1;
      }
    }

    expect(moved / squad.length).toBeGreaterThanOrEqual(0.3);
    // ...and it is still a good arrangement, not just a shuffle.
    expect(second.metrics.balanceScore).toBeGreaterThanOrEqual(70);
  });
});

describe("awkward inputs", () => {
  it("splits 29 players as 8 / 7 / 7 / 7", () => {
    const squad = [...ALL_TEST_PLAYERS.slice(0, 29)];
    const result = generateBalancedTeams(squad, 4, { seed: 5, restarts: 30 });
    expect(result.teams.map((t) => t.players.length).sort((a, b) => b - a)).toEqual([8, 7, 7, 7]);
    expect(result.warnings.some((w) => w.includes("uneven"))).toBe(true);
  });

  it("still generates when there are fewer goalkeepers than teams", () => {
    const outfieldOnly = ALL_TEST_PLAYERS.filter((p) => !p.positions.some((x) => x.position === "GK"));
    const squad = [...outfieldOnly.slice(0, 26), ALL_TEST_PLAYERS.find((p) => p.name === "Alex")!];

    const result = generateBalancedTeams(squad, 4, { seed: 3, restarts: 30 });

    expect(allAssigned(result)).toHaveLength(27);
    expect(result.warnings.some((w) => w.includes("goalkeeper-capable"))).toBe(true);
    // Every team still fields someone in goal, chosen or not.
    for (const team of result.teams) {
      expect(team.players.filter((p) => p.assignedPosition === "GK")).toHaveLength(1);
    }
  });

  it("places players who never saved a position", () => {
    const squad = [
      ...testPlayers(20),
      { id: "new-1", name: "Newcomer", positions: [] },
      { id: "new-2", name: "Another", positions: [] },
    ];
    const result = generateBalancedTeams(squad, 3, { seed: 9, restarts: 30 });

    expect(allAssigned(result)).toContain("new-1");
    expect(allAssigned(result)).toContain("new-2");
    expect(result.warnings.some((w) => w.includes("no saved positions"))).toBe(true);
  });

  it("can be told to ignore ability and only balance shape", () => {
    const result = generateBalancedTeams(testPlayers(28), 4, {
      seed: 4,
      restarts: 30,
      balanceAbility: false,
    });
    expect(allAssigned(result)).toHaveLength(28);
  });
});

describe("refusals", () => {
  it("explains that there are no confirmed players", () => {
    expect(() => generateBalancedTeams([], 2)).toThrow(/no confirmed players/i);
  });

  it("explains that one team is not a split", () => {
    expect(() => generateBalancedTeams(testPlayers(10), 1)).toThrow(/at least two teams/i);
  });

  it("explains that there are too few players for the chosen team count", () => {
    expect(() => generateBalancedTeams(testPlayers(5), 4)).toThrow(/only 5 confirmed players/i);
  });

  it("rejects a duplicated player", () => {
    const squad = testPlayers(10);
    expect(() => generateBalancedTeams([...squad, squad[0]], 2)).toThrow(/appears twice/i);
  });
});
