import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { PositionCode } from "@/lib/teams/positions";
import type { TeamRow } from "@/types/database";

export interface TeamMemberView {
  id: string;
  playerId: string;
  name: string;
  avatarUrl: string | null;
  assignedPosition: PositionCode;
  /** Admin-only: omitted for player-facing views (spec §76). */
  ratingSnapshot: number | null;
  preferenceRank: number | null;
  isAvailable: boolean;
  /** 0-7 on the tactics board, or null for a substitute (see lib/teams/formation.ts). */
  lineupSlot: number | null;
}

export interface TeamView extends TeamRow {
  members: TeamMemberView[];
  averageRating: number | null;
}

/**
 * `includeRatings` decides whether the rating snapshots come back at all — the
 * player-facing team page must never receive them.
 */
export async function getTeams(sessionId: string, includeRatings = false): Promise<TeamView[]> {
  const db = supabaseAdmin();

  const { data: teams } = await db
    .from("teams")
    .select("*")
    .eq("session_id", sessionId)
    .order("display_order");

  if (!teams || teams.length === 0) return [];

  const { data: members } = await db
    .from("team_members")
    .select(
      "id, team_id, player_id, assigned_position, position_rating_snapshot, preference_rank_snapshot, is_available, lineup_slot, created_at, player:players!inner(id, name, avatar_url)",
    )
    .eq("session_id", sessionId)
    .order("created_at");

  const byTeam = new Map<string, TeamMemberView[]>();
  for (const row of members ?? []) {
    const player = row.player as unknown as { id: string; name: string; avatar_url: string | null };
    const list = byTeam.get(row.team_id) ?? [];
    list.push({
      id: row.id,
      playerId: player.id,
      name: player.name,
      avatarUrl: player.avatar_url,
      assignedPosition: row.assigned_position,
      ratingSnapshot: includeRatings ? Number(row.position_rating_snapshot ?? 0) || null : null,
      preferenceRank: row.preference_rank_snapshot,
      isAvailable: row.is_available,
      lineupSlot: row.lineup_slot,
    });
    byTeam.set(row.team_id, list);
  }

  return teams.map((team) => {
    const teamMembers = (byTeam.get(team.id) ?? []).sort(sortByPosition);
    const rated = teamMembers.filter((m) => m.ratingSnapshot !== null);
    return {
      ...team,
      members: teamMembers,
      averageRating:
        includeRatings && rated.length
          ? Math.round((rated.reduce((s, m) => s + (m.ratingSnapshot ?? 0), 0) / rated.length) * 100) / 100
          : null,
    };
  });
}

const POSITION_ORDER: PositionCode[] = ["GK", "DEF", "DM", "CM", "AM", "WING", "ST"];

function sortByPosition(a: TeamMemberView, b: TeamMemberView): number {
  return (
    POSITION_ORDER.indexOf(a.assignedPosition) - POSITION_ORDER.indexOf(b.assignedPosition) ||
    a.name.localeCompare(b.name)
  );
}

export async function getMyTeam(sessionId: string, playerId: string): Promise<string | null> {
  const { data } = await supabaseAdmin()
    .from("team_members")
    .select("team_id")
    .eq("session_id", sessionId)
    .eq("player_id", playerId)
    .maybeSingle();
  return data?.team_id ?? null;
}
