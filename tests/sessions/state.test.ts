import { describe, expect, it } from "vitest";
import {
  allowedTransitions,
  assertTransition,
  canTransition,
  nextAdminAction,
  signupClosedReason,
  signupIsOpen,
  teamsArePublic,
  teamsAwaitingReveal,
  teamsVisible,
  SESSION_STATUSES,
} from "@/lib/sessions/state";

const DEADLINE = "2026-09-19T16:00:00.000Z";
const BEFORE = new Date("2026-09-18T09:00:00.000Z");
const AFTER = new Date("2026-09-19T17:00:00.000Z");

describe("session transitions", () => {
  it("walks the happy path from draft to completed", () => {
    const path = [
      "draft",
      "signup_open",
      "signup_closed",
      "teams_generated",
      "teams_published",
      "in_progress",
      "completed",
    ] as const;

    for (let i = 0; i < path.length - 1; i++) {
      expect(canTransition(path[i], path[i + 1]), `${path[i]} → ${path[i + 1]}`).toBe(true);
    }
  });

  it("lets an admin step back to discard generated teams", () => {
    expect(canTransition("teams_generated", "signup_closed")).toBe(true);
    expect(canTransition("signup_closed", "signup_open")).toBe(true);
  });

  it("lets an admin reopen a completed Sunday to fix a result", () => {
    expect(canTransition("completed", "in_progress")).toBe(true);
  });

  it("refuses to skip the middle of the lifecycle", () => {
    expect(canTransition("signup_open", "teams_published")).toBe(false);
    expect(canTransition("draft", "in_progress")).toBe(false);
    expect(() => assertTransition("draft", "completed")).toThrow(/cannot go from draft to completed/i);
  });

  it("allows cancelling anything that has not finished", () => {
    for (const status of SESSION_STATUSES) {
      if (status === "completed" || status === "cancelled") continue;
      expect(canTransition(status, "cancelled"), status).toBe(true);
    }
    expect(canTransition("completed", "cancelled")).toBe(false);
  });

  it("treats a no-op transition as fine", () => {
    expect(() => assertTransition("signup_open", "signup_open")).not.toThrow();
  });

  it("never offers a transition it would then reject", () => {
    for (const status of SESSION_STATUSES) {
      for (const target of allowedTransitions(status)) {
        expect(() => assertTransition(status, target)).not.toThrow();
      }
    }
  });
});

describe("signup window", () => {
  const open = { status: "signup_open" as const, signup_deadline: DEADLINE };

  it("is open before the deadline", () => {
    expect(signupIsOpen(open, BEFORE)).toBe(true);
    expect(signupClosedReason(open, BEFORE)).toBeNull();
  });

  it("closes once the deadline passes", () => {
    expect(signupIsOpen(open, AFTER)).toBe(false);
    expect(signupClosedReason(open, AFTER)).toMatch(/closed/i);
  });

  it("stays open once teams are generated or published", () => {
    // Somebody dropping out on the morning still has to be recorded.
    for (const status of ["teams_generated", "teams_published", "in_progress"] as const) {
      expect(signupIsOpen({ status, signup_deadline: DEADLINE }, BEFORE), status).toBe(true);
    }
  });

  it("stays open after the game until the deadline, so attendance can be corrected", () => {
    expect(signupIsOpen({ status: "completed", signup_deadline: DEADLINE }, BEFORE)).toBe(true);
  });

  it("is shut when the organiser closes it, cancels, or has not opened it", () => {
    for (const status of ["draft", "signup_closed", "cancelled"] as const) {
      expect(signupIsOpen({ status, signup_deadline: DEADLINE }, BEFORE), status).toBe(false);
    }
  });

  it("explains why it is shut", () => {
    expect(signupClosedReason({ status: "cancelled", signup_deadline: DEADLINE }, BEFORE)).toMatch(/cancelled/i);
    expect(signupClosedReason({ status: "draft", signup_deadline: DEADLINE }, BEFORE)).toMatch(/not opened/i);
    expect(signupClosedReason({ status: "signup_closed", signup_deadline: DEADLINE }, BEFORE)).toMatch(
      /organisers have closed/i,
    );
  });

  it("covers every status one way or the other", () => {
    for (const status of SESSION_STATUSES) {
      const session = { status, signup_deadline: DEADLINE };
      const isOpen = signupIsOpen(session, BEFORE);
      expect(typeof isOpen).toBe("boolean");
      expect(signupClosedReason(session, BEFORE) === null).toBe(isOpen);
    }
  });
});

describe("visibility and guidance", () => {
  it("keeps generated teams private until they are published", () => {
    expect(teamsArePublic("teams_generated")).toBe(false);
    expect(teamsArePublic("teams_published")).toBe(true);
    expect(teamsArePublic("in_progress")).toBe(true);
    expect(teamsArePublic("completed")).toBe(true);
  });

  describe("scheduled reveal", () => {
    const REVEAL = "2026-09-18T21:59:00.000Z";
    const published = { status: "teams_published" as const, teams_reveal_at: REVEAL };
    const before = new Date("2026-09-18T12:00:00Z");
    const after = new Date("2026-09-18T23:00:00Z");

    it("hides published teams until the reveal time", () => {
      expect(teamsVisible(published, before)).toBe(false);
      expect(teamsAwaitingReveal(published, before)).toBe(true);
    });

    it("shows them once the reveal time passes", () => {
      expect(teamsVisible(published, after)).toBe(true);
      expect(teamsAwaitingReveal(published, after)).toBe(false);
    });

    it("shows them immediately when no reveal time is set", () => {
      expect(teamsVisible({ status: "teams_published", teams_reveal_at: null }, before)).toBe(true);
    });

    it("never reveals teams that are not published, whatever the clock says", () => {
      expect(teamsVisible({ status: "teams_generated", teams_reveal_at: REVEAL }, after)).toBe(false);
      expect(teamsAwaitingReveal({ status: "teams_generated", teams_reveal_at: REVEAL }, before)).toBe(false);
    });

    it("keeps showing them on match day and afterwards", () => {
      for (const status of ["in_progress", "completed"] as const) {
        expect(teamsVisible({ status, teams_reveal_at: REVEAL }, after), status).toBe(true);
      }
    });
  });

  it("tells the admin what to do next at every live stage", () => {
    for (const status of SESSION_STATUSES) {
      const action = nextAdminAction(status);
      if (status === "completed" || status === "cancelled") {
        expect(action).toBeNull();
      } else {
        expect(action?.label, status).toBeTruthy();
      }
    }
  });
});
