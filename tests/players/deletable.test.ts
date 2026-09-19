import { describe, expect, it } from "vitest";
import { canDeletePlayer, type PlayerHistory } from "@/lib/players/deletable";

const clean: PlayerHistory = {
  playedSessions: 0,
  pastTeamPlacements: 0,
  matchEvents: 0,
  statAdjustments: 0,
  predictions: 0,
  isSelf: false,
  isLastAdmin: false,
};

describe("canDeletePlayer", () => {
  it("allows removing a profile that never played", () => {
    expect(canDeletePlayer(clean)).toEqual({ allowed: true });
  });

  it("refuses somebody who has played, and points at deactivation", () => {
    const verdict = canDeletePlayer({ ...clean, playedSessions: 3 });
    expect(verdict.allowed).toBe(false);
    expect(verdict).toMatchObject({ reason: expect.stringContaining("Deactivate") });
    expect(verdict).toMatchObject({ reason: expect.stringContaining("3 Sundays") });
  });

  it("refuses somebody with goals on record", () => {
    expect(canDeletePlayer({ ...clean, matchEvents: 1 })).toMatchObject({
      reason: expect.stringContaining("1 goal"),
    });
  });

  it("refuses somebody who was on a past team sheet", () => {
    expect(canDeletePlayer({ ...clean, pastTeamPlacements: 2 }).allowed).toBe(false);
  });

  it("refuses self-deletion", () => {
    expect(canDeletePlayer({ ...clean, isSelf: true })).toMatchObject({
      reason: expect.stringContaining("your own"),
    });
  });

  it("refuses removing the last admin", () => {
    expect(canDeletePlayer({ ...clean, isLastAdmin: true })).toMatchObject({
      reason: expect.stringContaining("only admin"),
    });
  });

  it("reports the most serious reason first", () => {
    expect(canDeletePlayer({ ...clean, isSelf: true, matchEvents: 5, playedSessions: 9 })).toMatchObject({
      reason: expect.stringContaining("your own"),
    });
  });

  it("refuses when Feed adjustments or predictions exist", () => {
    expect(canDeletePlayer({ ...clean, statAdjustments: 1 })).toMatchObject({ allowed: false });
    expect(canDeletePlayer({ ...clean, predictions: 2 })).toMatchObject({ allowed: false });
  });
});
