import { describe, expect, it } from "vitest";
import { sizeBalance, summariseArrangement, type TeamSummaryInput } from "@/lib/teams/summarise";
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

  it("names which team is over and which is short", () => {
    const summary = summariseArrangement([
      team("Red", [["GK", 7, 1], ["DEF", 7, 1], ["CM", 7, 1], ["ST", 7, 1]]),
      team("Blue", [["GK", 7, 1], ["DEF", 7, 1], ["DM", 7, 1], ["CM", 7, 1], ["AM", 7, 1], ["WING", 7, 1], ["ST", 7, 1]]),
    ]);
    expect(summary.warnings.some((w) => w.includes("Blue has 7"))).toBe(true);
    expect(summary.warnings.some((w) => w.includes("Red has 4"))).toBe(true);
  });

  it("handles no teams at all", () => {
    const summary = summariseArrangement([]);
    expect(summary.balanceScore).toBeNull();
    expect(summary.playerCount).toBe(0);
  });
});

describe("sizeBalance", () => {
  const team = (name: string, size: number) => ({ name, size });

  it("accepts an even split", () => {
    expect(sizeBalance([team("Red", 7), team("Blue", 7)]).even).toBe(true);
  });

  it("accepts a split that cannot be even", () => {
    // 30 across 4 is 8/8/7/7 — the best possible, so not a complaint.
    const balance = sizeBalance([team("Red", 8), team("Blue", 8), team("Green", 7), team("Yellow", 7)]);
    expect(balance.even).toBe(true);
    expect(balance.message).toBeNull();
  });

  it("names the team that gained and the one that lost", () => {
    // Moving one from Red to Blue out of an even 7/7/7/7.
    const balance = sizeBalance([team("Red", 6), team("Blue", 8), team("Green", 7), team("Yellow", 7)]);

    expect(balance.even).toBe(false);
    expect(balance.over).toEqual([{ name: "Blue", size: 8, excess: 1 }]);
    expect(balance.under).toEqual([{ name: "Red", size: 6, shortfall: 1 }]);
    expect(balance.message).toContain("Blue has 8 — 1 too many");
    expect(balance.message).toContain("Red has 6 — 1 short");
  });

  it("says what an even split would be", () => {
    const balance = sizeBalance([team("Red", 6), team("Blue", 8)]);
    expect(balance.message).toContain("7 / 7");
  });

  it("reports several teams at once", () => {
    const balance = sizeBalance([team("Red", 9), team("Blue", 9), team("Green", 5), team("Yellow", 5)]);
    expect(balance.over.map((t) => t.name)).toEqual(["Red", "Blue"]);
    expect(balance.under.map((t) => t.name)).toEqual(["Green", "Yellow"]);
  });

  it("counts an excess of more than one", () => {
    const balance = sizeBalance([team("Red", 10), team("Blue", 4)]);
    expect(balance.over[0].excess).toBe(3);
    expect(balance.under[0].shortfall).toBe(3);
  });

  it("has nothing to say about a single team", () => {
    expect(sizeBalance([team("Red", 7)]).even).toBe(true);
  });

  it("surfaces through the arrangement summary", () => {
    const summary = summariseArrangement([
      { name: "Red", members: [{ assignedPosition: "GK", ratingSnapshot: 7, preferenceRank: 1, isAvailable: true }] },
      {
        name: "Blue",
        members: [
          { assignedPosition: "GK", ratingSnapshot: 7, preferenceRank: 1, isAvailable: true },
          { assignedPosition: "CM", ratingSnapshot: 7, preferenceRank: 1, isAvailable: true },
          { assignedPosition: "ST", ratingSnapshot: 7, preferenceRank: 1, isAvailable: true },
        ],
      },
    ]);
    expect(summary.sizeBalance.even).toBe(false);
    expect(summary.warnings.some((w) => w.includes("Blue has 3"))).toBe(true);
  });
});
