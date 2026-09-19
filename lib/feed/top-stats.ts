export interface StatTotal {
  playerId: string;
  name: string;
  avatarUrl: string | null;
  total: number;
}

/**
 * Total = live match events + ledger deltas. Zero (or negative) totals are
 * hidden; ranking is total desc, then name.
 */
export function rankTotals(
  players: { id: string; name: string; avatar_url: string | null }[],
  eventCounts: Map<string, number>,
  deltas: Map<string, number>,
  limit = 10,
): StatTotal[] {
  return players
    .map((p) => ({
      playerId: p.id,
      name: p.name,
      avatarUrl: p.avatar_url,
      total: (eventCounts.get(p.id) ?? 0) + (deltas.get(p.id) ?? 0),
    }))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
    .slice(0, limit);
}
