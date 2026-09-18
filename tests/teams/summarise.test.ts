import { describe, expect, it } from "vitest";
import { summariseArrangement, type TeamSummaryInput } from "@/lib/teams/summarise";
import type { PositionCode } from "@/lib/teams/positions";

function team(
  name: string,
  members: [PositionCode, number, number | null][],
  unavailable: string[] = [],
): TeamSummaryInput {
  return {
    name,
    members: members.map(([assignedPosition, ratingSnapshot, preferenceRank], i) => ({
      assignedPosition,
      ratingSnapshot,
      preferenceRank,
      isAvailable: !unavailable.includes(`${name}-${i}`),
    })),
  };
}

const BALANCED: TeamSummaryInput[] = [
  team("Red", [["GK", 8, 1], ["DEF", 7, 1], ["DM", 7, 1], ["CM", 7, 1], ["AM", 7, 1], ["WING", 7, 1], ["ST", 7, 1]]),
  team("Blue", [["GK", 7, 1], ["DEF", 7, 1], ["DM", 7, 1], ["CM", 7, 1], ["AM", 7, 1], ["WING", 8, 1], ["ST", 7, 1]]),
];

describe("summariseArrangement", () => {
  it("scores a balanced pair of teams highly", () => {
    const summary = summariseArrangement(BALANCED);
    expect(summary.balanceScore).toBeGreaterThanOrEqual(95);
    expect(summary.averageRatingSpread).toBe(0);
    expect(summary.warnings).toEqual([]);
    expect(summary.firstChoiceCount).toBe(14);
    expect(summary.playerCount).toBe(14);
  });

  it("penalises a team with nobody in goal and says so", () => {
    const summary = summariseArrangement([
      team("Red", [["CM", 7, 1], ["DEF", 7, 1], ["DM", 7, 1], ["AM", 7, 1], ["WING", 7, 1], ["ST", 7, 1], ["CM", 7, 1]]),
      BALANCED[1],
    ]);

    expect(summary.warnings).toContain("Red has nobody in goal.");
    expect(summary.balanceScore!).toBeLessThan(summariseArrangement(BALANCED).balanceScore!);
  });

  it("warns when a team has no defensive cover", () => {
    const summary = summariseArrangement([
      team("Red", [["GK", 7, 1], ["CM", 7, 1], ["AM", 7, 1], ["WING", 7, 1], ["ST", 7, 1], ["ST", 7, 1], ["WING", 7, 1]]),
      BALANCED[1],
    ]);
    expect(summary.warnings).toContain("Red has no defensive cover.");
  });

  it("flags a dropout so the admin can fill the gap", () => {
    const summary = summariseArrangement([
      team(
        "Red",
        [["GK", 8, 1], ["DEF", 7, 1], ["DM", 7, 1], ["CM", 7, 1], ["AM", 7, 1], ["WING", 7, 1], ["ST", 7, 1]],
        ["Red-3"],
      ),
      BALANCED[1],
    ]);
    expect(summary.warnings).toContain("Red is 1 player short — someone dropped out.");
  });

  it("notices a big rating gap between teams", () => {
    const strong = team("Red", [["GK", 9, 1], ["DEF", 9, 1], ["DM", 9, 1], ["CM", 9, 1], ["AM", 9, 1], ["WING", 9, 1], ["ST", 9, 1]]);
    const weak = team("Blue", [["GK", 4, 1], ["DEF", 4, 1], ["DM", 4, 1], ["CM", 4, 1], ["AM", 4, 1], ["WING", 4, 1], ["ST", 4, 1]]);
    const summary = summariseArrangement([strong, weak]);

    expect(summary.averageRatingSpread).toBe(5);
    expect(summary.balanceScore!).toBeLessThan(50);
  });

  it("counts players left off their own list", () => {
    const summary = summariseArrangement([
      team("Red", [["GK", 8, 1], ["DEF", 7, null], ["DM", 7, 3], ["CM", 7, 1], ["AM", 7, 1], ["WING", 7, 1], ["ST", 7, 2]]),
      BALANCED[1],
    ]);
    // Red: four of seven on their first choice; Blue: all seven.
    expect(summary.firstChoiceCount).toBe(11);
  });

  it("reports uneven teams", () => {
    const summary = summariseArrangement([
      team("Red", [["GK", 7, 1], ["DEF", 7, 1], ["CM", 7, 1], ["ST", 7, 1]]),
      team("Blue", [["GK", 7, 1], ["DEF", 7, 1], ["DM", 7, 1], ["CM", 7, 1], ["AM", 7, 1], ["WING", 7, 1], ["ST", 7, 1]]),
    ]);
    expect(summary.warnings.some((w) => w.includes("uneven"))).toBe(true);
  });

  it("handles no teams at all", () => {
    const summary = summariseArrangement([]);
    expect(summary.balanceScore).toBeNull();
    expect(summary.playerCount).toBe(0);
  });
});
