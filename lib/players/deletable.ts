export interface PlayerHistory {
  /** Sundays they were confirmed for that have been played. */
  playedSessions: number;
  /** Teams they were placed in for a Sunday that has been played. */
  pastTeamPlacements: number;
  /** Goals or assists credited to them. */
  matchEvents: number;
  isSelf: boolean;
  isLastAdmin: boolean;
}

export type DeleteVerdict =
  | { allowed: true }
  | { allowed: false; reason: string };

/**
 * Deleting a player who has played rewrites history — their goals vanish and old
 * team sheets lose a name (spec §16). Deactivating keeps all of that while
 * removing them from future Sundays. A profile that never played, typically one
 * created by mistake, is safe to remove outright.
 */
export function canDeletePlayer(history: PlayerHistory): DeleteVerdict {
  if (history.isSelf) {
    return { allowed: false, reason: "You cannot delete your own profile." };
  }
  if (history.isLastAdmin) {
    return { allowed: false, reason: "This is the only admin left. Make somebody else an admin first." };
  }
  if (history.matchEvents > 0) {
    return {
      allowed: false,
      reason: `They have ${history.matchEvents} goal${
        history.matchEvents === 1 ? "" : "s"
      } or assists on record. Deactivate them instead — it removes them from future Sundays and keeps the history intact.`,
    };
  }
  if (history.playedSessions > 0 || history.pastTeamPlacements > 0) {
    const count = Math.max(history.playedSessions, history.pastTeamPlacements);
    return {
      allowed: false,
      reason: `They have played ${count} Sunday${
        count === 1 ? "" : "s"
      }. Deactivate them instead — it removes them from future Sundays and keeps the history intact.`,
    };
  }
  return { allowed: true };
}
