export type FixtureStatus = "scheduled" | "finished" | "postponed" | "cancelled";
export type Pick = "home" | "draw" | "away";

export interface FixtureTiming {
  status: FixtureStatus;
  kickoff_at: string;
}

/** Picks are open only for a scheduled fixture that has not kicked off. */
export function predictionsOpen(fixture: FixtureTiming, now: Date = new Date()): boolean {
  return fixture.status === "scheduled" && now.getTime() < new Date(fixture.kickoff_at).getTime();
}

/** The outcome is always derived from the score, so it can never disagree with it. */
export function outcomeOf(homeGoals: number, awayGoals: number): Pick {
  if (homeGoals > awayGoals) return "home";
  if (homeGoals < awayGoals) return "away";
  return "draw";
}

/**
 * Other players' picks are revealed once kickoff has passed or the fixture is
 * finished. A postponed match with a future kickoff stays hidden: it can be
 * reopened, and picks must not be visible while they can still be changed.
 */
export function picksRevealed(fixture: FixtureTiming, now: Date = new Date()): boolean {
  return fixture.status === "finished" || now.getTime() >= new Date(fixture.kickoff_at).getTime();
}

export function hasKickedOff(kickoffAt: string, now: Date = new Date()): boolean {
  return now.getTime() >= new Date(kickoffAt).getTime();
}
