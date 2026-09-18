import type { GeneratorPlayer } from "@/lib/teams/types";
import type { PositionCode } from "@/lib/teams/positions";

type Row = [string, PositionCode, number, PositionCode?, number?, PositionCode?, number?];

/** The same 35 players as supabase/seed.sql, so tests mirror real data. */
const ROWS: Row[] = [
  ["Khoi", "CM", 8, "AM", 7, "WING", 6],
  ["Alex", "GK", 8, "DEF", 6],
  ["Minh", "ST", 8, "AM", 7, "WING", 7],
  ["David", "DEF", 7, "DM", 6, "CM", 5],
  ["James", "WING", 8, "ST", 7, "AM", 6],
  ["Tom", "DEF", 8, "DM", 7],
  ["Sam", "AM", 7, "CM", 7, "WING", 6],
  ["Ruben", "GK", 7, "DEF", 5],
  ["Bart", "DEF", 6, "CM", 6, "DM", 5],
  ["Youssef", "ST", 9, "AM", 8, "WING", 7],
  ["Sven", "GK", 6, "ST", 4],
  ["Daan", "CM", 7, "DM", 7, "DEF", 6],
  ["Lucas", "WING", 7, "AM", 6, "ST", 6],
  ["Mateo", "DM", 8, "CM", 7, "DEF", 7],
  ["Omar", "AM", 8, "CM", 7],
  ["Finn", "DEF", 7, "DM", 6],
  ["Nico", "ST", 7, "WING", 6, "AM", 5],
  ["Jasper", "CM", 6, "AM", 6, "WING", 5],
  ["Ravi", "DEF", 6, "DM", 6, "CM", 5],
  ["Marco", "GK", 7, "DEF", 6, "DM", 5],
  ["Ethan", "WING", 8, "ST", 7],
  ["Hugo", "DM", 7, "DEF", 7, "CM", 6],
  ["Lars", "CM", 8, "DM", 7, "AM", 7],
  ["Pieter", "DEF", 5, "CM", 5],
  ["Ibrahim", "ST", 8, "WING", 7, "AM", 6],
  ["Noah", "AM", 7, "WING", 7, "CM", 6],
  ["Tomas", "GK", 8, "DEF", 5],
  ["Andre", "DEF", 8, "DM", 7],
  ["Kai", "CM", 6, "WING", 6, "AM", 5],
  ["Milan", "ST", 6, "AM", 6, "CM", 5],
  ["Joran", "DM", 6, "DEF", 6],
  ["Felix", "WING", 6, "ST", 5, "AM", 5],
  ["Arno", "CM", 7, "DEF", 6, "DM", 6],
  ["Diego", "AM", 8, "ST", 7, "WING", 7],
  ["Rick", "DEF", 6, "DM", 5, "CM", 5],
];

export const ALL_TEST_PLAYERS: GeneratorPlayer[] = ROWS.map(([name, p1, r1, p2, r2, p3, r3], i) => ({
  id: `p${String(i + 1).padStart(2, "0")}`,
  name,
  positions: [
    { position: p1, preferenceRank: 1, rating: r1 },
    ...(p2 && r2 ? [{ position: p2, preferenceRank: 2, rating: r2 }] : []),
    ...(p3 && r3 ? [{ position: p3, preferenceRank: 3, rating: r3 }] : []),
  ],
}));

/** First `count` players, keeping the goalkeeper spread realistic. */
export function testPlayers(count: number): GeneratorPlayer[] {
  if (count > ALL_TEST_PLAYERS.length) throw new Error(`only ${ALL_TEST_PLAYERS.length} test players exist`);
  return ALL_TEST_PLAYERS.slice(0, count);
}
