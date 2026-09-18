export interface TeamSizeOption {
  teamCount: number;
  /** Team sizes, largest first. Sizes never differ by more than one. */
  sizes: number[];
  /** "4 × 7" or "8 / 7 / 7 / 7" when the split is uneven. */
  label: string;
  recommended: boolean;
}

/** Smallest and largest team we are willing to suggest for a kickabout. */
const MIN_TEAM_SIZE = 5;
const MAX_TEAM_SIZE = 9;
const IDEAL_TEAM_SIZE = 7.5;

/**
 * Splits `playerCount` into `teamCount` teams whose sizes differ by at most one,
 * larger teams first. 29 into 4 gives 8/7/7/7 (spec §9).
 */
export function computeTeamSizes(playerCount: number, teamCount: number): number[] {
  if (teamCount < 1) throw new Error("teamCount must be at least 1");
  const base = Math.floor(playerCount / teamCount);
  const remainder = playerCount % teamCount;
  return Array.from({ length: teamCount }, (_, i) => base + (i < remainder ? 1 : 0));
}

function describe(sizes: number[]): string {
  const even = sizes.every((s) => s === sizes[0]);
  return even ? `${sizes.length} × ${sizes[0]}` : sizes.join(" / ");
}

/**
 * Every workable way to split the confirmed players, best first. The admin
 * always chooses — this only orders the options (spec §9: do not force one).
 */
export function recommendTeamSizes(playerCount: number): TeamSizeOption[] {
  const options: TeamSizeOption[] = [];

  for (let teamCount = 2; teamCount <= 6; teamCount++) {
    const sizes = computeTeamSizes(playerCount, teamCount);
    const smallest = Math.min(...sizes);
    const largest = Math.max(...sizes);
    if (smallest < MIN_TEAM_SIZE || largest > MAX_TEAM_SIZE) continue;

    options.push({ teamCount, sizes, label: describe(sizes), recommended: false });
  }

  // Prefer teams close to 7-8 a side, and prefer an even split when it is a tie.
  options.sort((a, b) => {
    const aScore = Math.abs(playerCount / a.teamCount - IDEAL_TEAM_SIZE) + (isEven(a.sizes) ? 0 : 0.25);
    const bScore = Math.abs(playerCount / b.teamCount - IDEAL_TEAM_SIZE) + (isEven(b.sizes) ? 0 : 0.25);
    return aScore - bScore || a.teamCount - b.teamCount;
  });

  if (options.length > 0) options[0].recommended = true;
  return options;
}

function isEven(sizes: number[]): boolean {
  return sizes.every((s) => s === sizes[0]);
}
