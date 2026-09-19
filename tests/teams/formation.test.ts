import { describe, expect, it } from "vitest";
import { buildLineup } from "@/lib/teams/formation";
import type { PositionCode } from "@/lib/teams/positions";

const p = (position: PositionCode, id: string, isAvailable = true) => ({ id, position, isAvailable });

describe("buildLineup", () => {
  it("places a well-shaped squad of 8 with no substitutes", () => {
    const squad = [p("GK", "a"), p("DEF", "b"), p("DM", "c"), p("CM", "d"), p("AM", "e"), p("WING", "f"), p("WING", "g"), p("ST", "h")];
    const { lines, substitutes } = buildLineup(squad);
    expect(lines.map((l) => l.players.map((x) => x?.id))).toEqual([["a"], ["b", "c"], ["d", "e"], ["f", "g"], ["h"]]);
    expect(substitutes).toEqual([]);
  });

  it("puts extras on the bench and leaves gaps for a short squad", () => {
    const nine = [p("GK", "a"), p("GK", "b"), ...["DEF", "DEF", "CM", "CM", "WING", "WING", "ST"].map((x, i) => p(x as PositionCode, `x${i}`))];
    const full = buildLineup(nine);
    expect(full.substitutes.map((s) => s.id)).toEqual(["b"]);

    const short = buildLineup(nine.slice(1, 8));
    expect(short.lines.flatMap((l) => l.players).filter((x) => x === null)).toHaveLength(1);
  });

  it("fills unsuited slots from leftovers and never fields dropouts", () => {
    const squad = [p("GK", "a"), p("ST", "b"), p("ST", "c"), p("ST", "d"), p("DEF", "e", false)];
    const { lines, substitutes } = buildLineup(squad);
    expect(lines.flatMap((l) => l.players).some((x) => x?.id === "e")).toBe(false);
    expect(substitutes.map((s) => s.id)).toContain("e");
  });

  it("copes with no goalkeeper", () => {
    const { lines } = buildLineup([p("DEF", "a"), p("CM", "b")]);
    expect(lines[0].players).toEqual([null]);
  });

  it("honours a manual lineup exactly, wherever the players usually play", () => {
    const squad = [
      { ...p("GK", "a"), lineupSlot: 7 },
      { ...p("ST", "b"), lineupSlot: 0 },
      { ...p("DEF", "c"), lineupSlot: null },
      { ...p("CM", "d"), lineupSlot: 3 },
      { ...p("WING", "e", false), lineupSlot: 5 },
    ];
    const { lines, substitutes } = buildLineup(squad);
    expect(lines.map((l) => l.players.map((x) => x?.id ?? null))).toEqual([["b"], [null, null], ["d", null], [null, null], ["a"]]);
    expect(substitutes.map((s) => s.id)).toEqual(["c", "e"]);
  });
});

describe("autoSlots", () => {
  it("numbers starters in board order and leaves substitutes out", async () => {
    const { autoSlots } = await import("@/lib/teams/formation");
    const squad = ["GK", "DEF", "DEF", "CM", "CM", "WING", "WING", "ST", "ST"].map((pos, i) => ({
      id: `m${i}`,
      position: pos as PositionCode,
      isAvailable: true,
    }));
    const slots = autoSlots(squad);
    expect(slots.size).toBe(8);
    expect(slots.get("m0")).toBe(0);
    expect(slots.get("m7")).toBe(7);
    expect(slots.has("m8")).toBe(false);
  });
});
