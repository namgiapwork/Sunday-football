import { PREFERENCE_PENALTY, coverageGapsOf, shapeImbalanceOf } from "./evaluate";
import { computeTeamSizes } from "./team-sizes";
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

export interface SizeBalance {
  even: boolean;
  /** Teams carrying more players than the split allows. */
  over: { name: string; size: number; excess: number }[];
  /** Teams left short. */
  under: { name: string; size: number; shortfall: number }[];
  /** One sentence naming the teams, or null when the sizes are fine. */
  message: string | null;
}

export interface ArrangementSummary {
  teams: TeamSummary[];
  averageRatingSpread: number | null;
  balanceScore: number | null;
  firstChoiceCount: number;
  playerCount: number;
  sizeBalance: SizeBalance;
  warnings: string[];
}

/**
 * Whether the teams are evenly filled, and which ones are not.
 *
 * Moving a player leaves one team over and another short, and "uneven: 9/8/7/6"
 * does not tell an organiser which is which. This names them.
 */
export function sizeBalance(teams: { name: string; size: number }[]): SizeBalance {
  if (teams.length < 2) return { even: true, over: [], under: [], message: null };

  const total = teams.reduce((sum, t) => sum + t.size, 0);
  const ideal = computeTeamSizes(total, teams.length);
  const largest = Math.max(...ideal);
  const smallest = Math.min(...ideal);

  const over = teams
    .filter((t) => t.size > largest)
    .map((t) => ({ name: t.name, size: t.size, excess: t.size - largest }));
  const under = teams
    .filter((t) => t.size < smallest)
    .map((t) => ({ name: t.name, size: t.size, shortfall: smallest - t.size }));

  if (over.length === 0 && under.length === 0) {
    return { even: true, over: [], under: [], message: null };
  }

  const parts: string[] = [];
  for (const team of over) {
    parts.push(`${team.name} has ${team.size} — ${team.excess} too many`);
  }
  for (const team of under) {
    parts.push(`${team.name} has ${team.size} — ${team.shortfall} short`);
  }

  return {
    even: false,
    over,
    under,
    message: `${parts.join(", ")}. An even split of ${total} is ${ideal.join(" / ")}.`,
  };
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
  const sizes = sizeBalance(summaries.map((t) => ({ name: t.name, size: t.size })));
  if (sizes.message) warnings.push(sizes.message);

  return {
    teams: summaries,
    averageRatingSpread: spread,
    balanceScore: averages.length ? Math.max(0, Math.min(100, Math.round(100 - penalty * 2.5))) : null,
    firstChoiceCount: allMembers.filter((m) => m.preferenceRank === 1).length,
    playerCount,
    sizeBalance: sizes,
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
