/** Position vocabulary for 7v7 / 8v8. Deliberately smaller than 11-a-side. */
export const POSITION_CODES = ["GK", "DEF", "DM", "CM", "AM", "WING", "ST"] as const;

export type PositionCode = (typeof POSITION_CODES)[number];

export type PositionCategory = "goalkeeper" | "defensive" | "midfield" | "attacking";

export const POSITION_LABELS: Record<PositionCode, string> = {
  GK: "Goalkeeper",
  DEF: "Defender",
  DM: "Defensive Midfielder",
  CM: "Central Midfielder",
  AM: "Attacking Midfielder",
  WING: "Winger",
  ST: "Striker",
};

/**
 * The category a position counts towards when measuring the *shape* of a team.
 * A 7-a-side team of 1 GK + 2 defensive + 2 midfield + 2 attacking falls out of
 * this mapping naturally.
 */
export const PRIMARY_CATEGORY: Record<PositionCode, PositionCategory> = {
  GK: "goalkeeper",
  DEF: "defensive",
  DM: "defensive",
  CM: "midfield",
  AM: "midfield",
  WING: "attacking",
  ST: "attacking",
};

/**
 * Positions overlap in reality (spec §10 objective 4): a DM covers midfield too,
 * an AM covers attack. Coverage checks use this wider membership so a team is
 * not flagged as missing a category it can actually field.
 */
export const COVERED_CATEGORIES: Record<PositionCode, PositionCategory[]> = {
  GK: ["goalkeeper"],
  DEF: ["defensive"],
  DM: ["defensive", "midfield"],
  CM: ["midfield"],
  AM: ["midfield", "attacking"],
  WING: ["attacking"],
  ST: ["attacking"],
};

export const OUTFIELD_CATEGORIES: PositionCategory[] = ["defensive", "midfield", "attacking"];

export function isPositionCode(value: string): value is PositionCode {
  return (POSITION_CODES as readonly string[]).includes(value);
}
