import { describe, expect, it } from "vitest";
import { missingSundays, selectUpcoming, upcomingWindow } from "@/lib/sessions/upcoming";
import type { SessionStatus } from "@/lib/sessions/state";

// A Friday, so "the coming Sunday" is two days away.
const TODAY = new Date("2026-09-18T09:00:00Z");

const session = (date: string, status: SessionStatus = "signup_open") => ({ date, status });

describe("upcomingWindow", () => {
  it("runs from today to four weeks out", () => {
    expect(upcomingWindow(TODAY)).toEqual({ from: "2026-09-18", to: "2026-10-16" });
  });

  it("can be asked for a different horizon", () => {
    expect(upcomingWindow(TODAY, 1).to).toBe("2026-09-25");
  });
});

describe("selectUpcoming", () => {
  const all = [
    session("2026-09-13", "completed"),
    session("2026-09-20"),
    session("2026-09-27"),
    session("2026-10-04"),
    session("2026-10-11"),
    session("2026-10-18"),
  ];

  it("returns four Sundays, soonest first", () => {
    expect(selectUpcoming(all, TODAY).map((s) => s.date)).toEqual([
      "2026-09-20",
      "2026-09-27",
      "2026-10-04",
      "2026-10-11",
    ]);
  });

  it("drops anything beyond the four-week window", () => {
    expect(selectUpcoming(all, TODAY).map((s) => s.date)).not.toContain("2026-10-18");
  });

  it("drops Sundays that have been played", () => {
    expect(selectUpcoming(all, TODAY).map((s) => s.date)).not.toContain("2026-09-13");
  });

  it("keeps a cancelled Sunday, because players need to know it is off", () => {
    const withCancellation = [session("2026-09-20", "cancelled"), session("2026-09-27")];
    expect(selectUpcoming(withCancellation, TODAY).map((s) => s.status)).toEqual([
      "cancelled",
      "signup_open",
    ]);
  });

  it("hides drafts the admin has not opened yet", () => {
    expect(selectUpcoming([session("2026-09-20", "draft")], TODAY)).toEqual([]);
  });

  it("includes a Sunday that is today", () => {
    const sunday = new Date("2026-09-20T09:00:00Z");
    expect(selectUpcoming([session("2026-09-20")], sunday).map((s) => s.date)).toEqual(["2026-09-20"]);
  });

  it("copes with nothing scheduled", () => {
    expect(selectUpcoming([], TODAY)).toEqual([]);
  });
});

describe("missingSundays", () => {
  it("names the next four Sundays when none exist", () => {
    expect(missingSundays([], TODAY)).toEqual([
      "2026-09-20",
      "2026-09-27",
      "2026-10-04",
      "2026-10-11",
    ]);
  });

  it("skips Sundays that are already scheduled", () => {
    expect(missingSundays(["2026-09-20", "2026-10-04"], TODAY)).toEqual(["2026-09-27", "2026-10-11"]);
  });

  it("counts today when today is a Sunday", () => {
    const sunday = new Date("2026-09-20T09:00:00Z");
    expect(missingSundays([], sunday)[0]).toBe("2026-09-20");
  });

  it("returns nothing when the next four are all scheduled", () => {
    expect(
      missingSundays(["2026-09-20", "2026-09-27", "2026-10-04", "2026-10-11"], TODAY),
    ).toEqual([]);
  });
});
