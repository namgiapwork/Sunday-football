import type { PositionCode } from "./positions";

/** 8-a-side shape: 1 goalkeeper, then 2-2-2-1 (defenders, midfielders, wingers, striker). */
export type FormationLine = "GK" | "DEF" | "MID" | "WING" | "ST";

export const FORMATION: { line: FormationLine; slots: number }[] = [
  { line: "GK", slots: 1 },
  { line: "DEF", slots: 2 },
  { line: "MID", slots: 2 },
  { line: "WING", slots: 2 },
  { line: "ST", slots: 1 },
];

/** Positions that suit each line, best fit first. */
const SUITS: Record<FormationLine, PositionCode[]> = {
  GK: ["GK"],
  DEF: ["DEF", "DM"],
  MID: ["DM", "CM", "AM"],
  WING: ["WING", "AM"],
  ST: ["ST", "AM", "WING"],
};

/** Slot numbers stored in `team_members.lineup_slot`, in board order. */
export const SLOT_LINES: FormationLine[] = ["GK", "DEF", "DEF", "MID", "MID", "WING", "WING", "ST"];
export const SLOT_COUNT = SLOT_LINES.length;

export interface FormationPlayer {
  position: PositionCode;
  isAvailable: boolean;
  /** Chosen by an organiser; when nobody on the team has one the lineup is automatic. */
  lineupSlot?: number | null;
}

export interface Lineup<T> {
  /** Players per line, in formation order. Missing players are `null`. */
  lines: { line: FormationLine; players: (T | null)[] }[];
  substitutes: T[];
}

/**
 * Lays a squad onto the formation from each player's assigned position. Players
 * who dropped out are never fielded. Slots nobody suits are filled from whoever
 * is left (a goalkeeper last), and anyone beyond eight is a substitute.
 */
export function buildLineup<T extends FormationPlayer>(members: T[]): Lineup<T> {
  if (members.some((m) => m.lineupSlot != null)) return manualLineup(members);
  return autoLineup(members);
}

/**
 * The slot each starter gets from the automatic pick, ready to store in
 * `team_members.lineup_slot`. Substitutes are absent from the map.
 */
export function autoSlots<T extends FormationPlayer & { id: string }>(members: T[]): Map<string, number> {
  const slots = new Map<string, number>();
  autoLineup(members)
    .lines.flatMap((l) => l.players)
    .forEach((player, slot) => {
      if (player) slots.set(player.id, slot);
    });
  return slots;
}

/** Ignores any stored slots and works purely from assigned positions. */
export function autoLineup<T extends FormationPlayer>(members: T[]): Lineup<T> {
  const pool = members.filter((m) => m.isAvailable);
  const out = members.filter((m) => !m.isAvailable);

  const lines = FORMATION.map(({ line, slots }) => {
    const players: (T | null)[] = [];
    for (const position of SUITS[line]) {
      while (players.length < slots) {
        const index = pool.findIndex((m) => m.position === position);
        if (index === -1) break;
        players.push(pool.splice(index, 1)[0]);
      }
    }
    while (players.length < slots) players.push(null);
    return { line, players };
  });

  // Fill gaps with leftovers, keeping goalkeepers for the bench unless nothing else is left.
  const fillOrder = [...pool.filter((m) => m.position !== "GK"), ...pool.filter((m) => m.position === "GK")];
  for (const { line, players } of lines) {
    if (line === "GK") continue;
    for (let i = 0; i < players.length; i++) {
      if (players[i] === null && fillOrder.length > 0) players[i] = fillOrder.shift()!;
    }
  }

  return { lines, substitutes: [...fillOrder, ...out] };
}

/** The organiser's own pick: each player sits exactly where they were put. */
function manualLineup<T extends FormationPlayer>(members: T[]): Lineup<T> {
  const bySlot = new Map<number, T>();
  for (const m of members) {
    if (m.lineupSlot != null && m.isAvailable && !bySlot.has(m.lineupSlot)) bySlot.set(m.lineupSlot, m);
  }

  let next = 0;
  const lines = FORMATION.map(({ line, slots }) => {
    const players: (T | null)[] = [];
    for (let i = 0; i < slots; i++) players.push(bySlot.get(next++) ?? null);
    return { line, players };
  });

  const placed = new Set(bySlot.values());
  return { lines, substitutes: members.filter((m) => !placed.has(m)) };
}
