import { PREFERENCE_PENALTY, coverageGapsOf, shapeImbalanceOf } from "./evaluate";
import type { PositionCategory, PositionCode } from "./positions";

export interface TeamSummaryInput {
  name: string;
  members: {
    assignedPosition: PositionCode;
    ratingSnapshot: number | null;
    preferenceRank: number | null;
    isAvailable: boolean;
  }[];
}

export interface TeamSummary {
  name: string;
  size: number;
  averageRating: number | null;
  hasGoalkeeper: boolean;
  missingCategories: PositionCategory[];
  unavailableCount: number;
}

export interface ArrangementSummary {
  teams: TeamSummary[];
  averageRatingSpread: number | null;
  balanceScore: number | null;
  firstChoiceCount: number;
  playerCount: number;
  warnings: string[];
}

const CATEGORY_LABELS: Record<PositionCategory, string> = {
  goalkeeper: "a goalkeeper",
  defensive: "defensive cover",
  midfield: "midfield cover",
  attacking: "an attacking player",
};

/**
 * Recomputes the indicator after a manual move, without re-running the generator
 * (spec §14: the admin's decision stands, the numbers just update).
 */
export function summariseArrangement(teams: TeamSummaryInput[]): ArrangementSummary {
  const summaries: TeamSummary[] = teams.map((team) => {
    const positions = team.members.map((m) => m.assignedPosition);
    const rated = team.members.filter((m) => m.ratingSnapshot !== null);

    return {
      name: team.name,
      size: team.members.length,
      averageRating: rated.length
        ? round2(rated.reduce((sum, m) => sum + (m.ratingSnapshot ?? 0), 0) / rated.length)
        : null,
      hasGoalkeeper: positions.includes("GK"),
      missingCategories: coverageGapsOf(positions),
      unavailableCount: team.members.filter((m) => !m.isAvailable).length,
    };
  });

  const averages = summaries.map((t) => t.averageRating).filter((v): v is number => v !== null);
  const spread = averages.length > 1 ? round2(Math.max(...averages) - Math.min(...averages)) : averages.length ? 0 : null;

  const allMembers = teams.flatMap((t) => t.members);
  const playerCount = allMembers.length;
  const preferencePenalty = playerCount
    ? allMembers.reduce((sum, m) => sum + penaltyForRank(m.preferenceRank), 0) / playerCount
    : 0;
  const shape = summaries.length
    ? teams.reduce((sum, t) => sum + shapeImbalanceOf(t.members.map((m) => m.assignedPosition)), 0) / teams.length
    : 0;
  const missingKeepers = summaries.filter((t) => !t.hasGoalkeeper).length;

  const penalty =
    4 * standardDeviation(averages) * 5 + 10 * missingKeepers + 6 * shape + 3 * preferencePenalty;

  const warnings: string[] = [];
  for (const team of summaries) {
    if (!team.hasGoalkeeper) warnings.push(`${team.name} has nobody in goal.`);
    for (const gap of team.missingCategories) warnings.push(`${team.name} has no ${CATEGORY_LABELS[gap]}.`);
    if (team.unavailableCount > 0) {
      warnings.push(
        `${team.name} is ${team.unavailableCount} player${team.unavailableCount === 1 ? "" : "s"} short — someone dropped out.`,
      );
    }
  }
  const sizes = summaries.map((t) => t.size);
  if (sizes.length > 1 && Math.max(...sizes) - Math.min(...sizes) > 1) {
    warnings.push(`Team sizes are uneven: ${sizes.join(" / ")}.`);
  }

  return {
    teams: summaries,
    averageRatingSpread: spread,
    balanceScore: averages.length ? Math.max(0, Math.min(100, Math.round(100 - penalty * 2.5))) : null,
    firstChoiceCount: allMembers.filter((m) => m.preferenceRank === 1).length,
    playerCount,
    warnings,
  };
}

function penaltyForRank(rank: number | null): number {
  if (rank === 1) return PREFERENCE_PENALTY[1];
  if (rank === 2) return PREFERENCE_PENALTY[2];
  if (rank === 3) return PREFERENCE_PENALTY[3];
  return PREFERENCE_PENALTY.outside;
}

function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
