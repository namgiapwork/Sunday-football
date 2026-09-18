import { describe, expect, it } from "vitest";
import {
  allowedTransitions,
  assertTransition,
  canTransition,
  nextAdminAction,
  signupClosedReason,
  signupIsOpen,
  teamsArePublic,
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
