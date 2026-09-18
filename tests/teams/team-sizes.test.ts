import { describe, expect, it } from "vitest";
import { computeTeamSizes, recommendTeamSizes } from "@/lib/teams/team-sizes";

describe("computeTeamSizes", () => {
  it("splits evenly when it can", () => {
    expect(computeTeamSizes(28, 4)).toEqual([7, 7, 7, 7]);
    expect(computeTeamSizes(16, 2)).toEqual([8, 8]);
  });

  it("puts the extra player in the first team", () => {
    expect(computeTeamSizes(29, 4)).toEqual([8, 7, 7, 7]);
    expect(computeTeamSizes(30, 4)).toEqual([8, 8, 7, 7]);
  });

  it("never lets sizes differ by more than one", () => {
    for (let players = 10; players <= 40; players++) {
      for (let teams = 2; teams <= 6; teams++) {
        const sizes = computeTeamSizes(players, teams);
        expect(sizes.reduce((a, b) => a + b, 0)).toBe(players);
        expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("recommendTeamSizes", () => {
  it.each([
    [14, "2 × 7"],
    [16, "2 × 8"],
    [21, "3 × 7"],
    [24, "3 × 8"],
    [28, "4 × 7"],
    [32, "4 × 8"],
  ])("recommends %s players as %s", (players, expected) => {
    const top = recommendTeamSizes(players).find((o) => o.recommended);
    expect(top?.label).toBe(expected);
  });

  it("recommends 8 / 7 / 7 / 7 for an awkward 29", () => {
    const top = recommendTeamSizes(29).find((o) => o.recommended);
    expect(top?.label).toBe("8 / 7 / 7 / 7");
  });

  it("offers alternatives rather than forcing one answer", () => {
    expect(recommendTeamSizes(28).length).toBeGreaterThan(1);
  });

  it("never suggests a team smaller than five or larger than nine", () => {
    for (let players = 10; players <= 40; players++) {
      for (const option of recommendTeamSizes(players)) {
        expect(Math.min(...option.sizes)).toBeGreaterThanOrEqual(5);
        expect(Math.max(...option.sizes)).toBeLessThanOrEqual(9);
      }
    }
  });
});
