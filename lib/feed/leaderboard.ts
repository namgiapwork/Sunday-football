import { outcomeOf, type Pick } from "./fixture-state";

export interface ScoredFixture {
  id: string;
  status: string;
  home_goals: number | null;
  away_goals: number | null;
}

export interface PlayerPick {
  fixtureId: string;
  playerId: string;
  pick: Pick;
}

export interface LeaderboardRow {
  playerId: string;
  name: string;
  points: number;
  picks: number;
}

/**
 * One point per correct pick on a finished fixture. Postponed and cancelled
 * fixtures score nothing and do not count towards `picks`. Ties break on the
 * number of scored picks (more is higher), then name.
 */
export function buildLeaderboard(
  fixtures: ScoredFixture[],
  picks: PlayerPick[],
  names: Map<string, string>,
): LeaderboardRow[] {
  const finished = new Map<string, ScoredFixture>();
  for (const f of fixtures) {
    if (f.status === "finished" && f.home_goals !== null && f.away_goals !== null) finished.set(f.id, f);
  }

  const rows = new Map<string, LeaderboardRow>();
  for (const p of picks) {
    const fixture = finished.get(p.fixtureId);
    const name = names.get(p.playerId);
    if (!fixture || name === undefined) continue;
    const row = rows.get(p.playerId) ?? { playerId: p.playerId, name, points: 0, picks: 0 };
    row.picks += 1;
    if (outcomeOf(fixture.home_goals!, fixture.away_goals!) === p.pick) row.points += 1;
    rows.set(p.playerId, row);
  }

  return [...rows.values()].sort(
    (a, b) => b.points - a.points || b.picks - a.picks || a.name.localeCompare(b.name),
  );
}
