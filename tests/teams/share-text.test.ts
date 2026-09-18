import { describe, expect, it } from "vitest";
import { buildShareText } from "@/lib/teams/share-text";
import type { TeamView } from "@/lib/data/teams";

function member(name: string, position: TeamView["members"][number]["assignedPosition"], available = true) {
  return {
    id: `m-${name}`,
    playerId: `p-${name}`,
    name,
    avatarUrl: null,
    assignedPosition: position,
    ratingSnapshot: 8,
    preferenceRank: 1,
    isAvailable: available,
  };
}

const TEAMS: TeamView[] = [
  {
    id: "t1",
    session_id: "s1",
    name: "Red",
    colour: "red",
    display_order: 0,
    published: true,
    created_by: null,
    created_at: "",
    updated_at: "",
    averageRating: 7.4,
    members: [member("Alex", "GK"), member("Khoi", "CM"), member("Sven", "ST", false)],
  },
  {
    id: "t2",
    session_id: "s1",
    name: "Blue",
    colour: "blue",
    display_order: 1,
    published: true,
    created_by: null,
    created_at: "",
    updated_at: "",
    averageRating: 7.3,
    members: [member("Tomas", "GK"), member("Minh", "ST")],
  },
];

describe("buildShareText", () => {
  const text = buildShareText(TEAMS, { date: "2026-09-20", start_time: "18:00:00" }, {
    groupName: "Sunday Football",
    timezone: "Europe/Amsterdam",
    venue: "Sportpark Rotterdam",
    notes: "Pitch 3",
  });

  it("leads with the group, date, time and place", () => {
    const lines = text.split("\n");
    expect(lines[0]).toBe("SUNDAY FOOTBALL");
    expect(lines[1]).toBe("20 SEPT · 18:00");
    expect(lines[2]).toBe("Sportpark Rotterdam — Pitch 3");
  });

  it("lists every team with a colour marker and each player's position", () => {
    expect(text).toContain("🔴 RED");
    expect(text).toContain("Alex — GK");
    expect(text).toContain("🔵 BLUE");
    expect(text).toContain("Minh — ST");
  });

  it("marks anyone who has dropped out", () => {
    expect(text).toContain("Sven — ST (out)");
  });

  it("never leaks ratings", () => {
    expect(text).not.toContain("7.4");
    expect(text).not.toMatch(/\b8\b/);
  });

  it("copes with no venue", () => {
    const plain = buildShareText(TEAMS, { date: "2026-09-20", start_time: "18:00:00" }, {
      groupName: "Sunday Football",
      timezone: "Europe/Amsterdam",
    });
    expect(plain.split("\n")[2]).toBe("");
  });
});
