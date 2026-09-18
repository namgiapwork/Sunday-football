import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { GeneratorPlayer } from "@/lib/teams/types";
import type { PositionCode } from "@/lib/teams/positions";
import type { SessionRow, SignupStatus, VenueRow } from "@/types/database";

export interface AttendanceSummary {
  confirmed: number;
  maybe: number;
  declined: number;
  noResponse: number;
  invited: number;
}

export interface SessionWithVenue extends SessionRow {
  venue: Pick<VenueRow, "id" | "name" | "address" | "maps_url" | "notes"> | null;
}

const VENUE_FIELDS = "id, name, address, maps_url, notes";

/** The Sunday everyone is looking at: the next one that has not finished. */
export async function getCurrentSession(groupId: string): Promise<SessionWithVenue | null> {
  const db = supabaseAdmin();
  const today = new Date().toISOString().slice(0, 10);

  const { data: upcoming } = await db
    .from("sessions")
    .select(`*, venue:venues(${VENUE_FIELDS})`)
    .eq("group_id", groupId)
    .gte("date", today)
    .not("status", "in", "(completed,cancelled)")
    .order("date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (upcoming) return upcoming as unknown as SessionWithVenue;

  // Nothing scheduled: fall back to the most recent Sunday so the app is never blank.
  const { data: latest } = await db
    .from("sessions")
    .select(`*, venue:venues(${VENUE_FIELDS})`)
    .eq("group_id", groupId)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (latest as unknown as SessionWithVenue) ?? null;
}

export async function getSession(sessionId: string): Promise<SessionWithVenue | null> {
  const { data } = await supabaseAdmin()
    .from("sessions")
    .select(`*, venue:venues(${VENUE_FIELDS})`)
    .eq("id", sessionId)
    .maybeSingle();
  return (data as unknown as SessionWithVenue) ?? null;
}

export async function listSessions(groupId: string, limit = 30): Promise<SessionRow[]> {
  const { data } = await supabaseAdmin()
    .from("sessions")
    .select("*")
    .eq("group_id", groupId)
    .order("date", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export interface SignupEntry {
  playerId: string;
  name: string;
  avatarUrl: string | null;
  status: SignupStatus;
}

export async function listSignups(sessionId: string): Promise<SignupEntry[]> {
  const { data } = await supabaseAdmin()
    .from("signups")
    .select("status, player:players!inner(id, name, avatar_url)")
    .eq("session_id", sessionId);

  return (data ?? [])
    .map((row) => {
      const player = row.player as unknown as { id: string; name: string; avatar_url: string | null };
      return {
        playerId: player.id,
        name: player.name,
        avatarUrl: player.avatar_url,
        status: row.status as SignupStatus,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getAttendanceSummary(
  sessionId: string,
  groupId: string,
): Promise<AttendanceSummary> {
  const db = supabaseAdmin();

  const [{ data: signups }, { count: invited }] = await Promise.all([
    db.from("signups").select("status").eq("session_id", sessionId),
    db
      .from("group_members")
      .select("id", { count: "exact", head: true })
      .eq("group_id", groupId)
      .eq("is_active", true),
  ]);

  const counts = { confirmed: 0, maybe: 0, declined: 0 };
  for (const row of signups ?? []) counts[row.status as keyof typeof counts] += 1;

  const total = invited ?? 0;
  return {
    ...counts,
    invited: total,
    noResponse: Math.max(0, total - counts.confirmed - counts.maybe - counts.declined),
  };
}

export async function getMySignup(sessionId: string, playerId: string): Promise<SignupStatus | null> {
  const { data } = await supabaseAdmin()
    .from("signups")
    .select("status")
    .eq("session_id", sessionId)
    .eq("player_id", playerId)
    .maybeSingle();
  return (data?.status as SignupStatus) ?? null;
}

/** Confirmed players shaped for the balancing engine, ratings included. */
export async function getConfirmedPlayersForGeneration(sessionId: string): Promise<GeneratorPlayer[]> {
  const db = supabaseAdmin();

  const { data: signups } = await db
    .from("signups")
    .select("player_id, player:players!inner(id, name, is_active)")
    .eq("session_id", sessionId)
    .eq("status", "confirmed");

  const players = (signups ?? [])
    .map((s) => s.player as unknown as { id: string; name: string; is_active: boolean })
    .filter((p) => p.is_active);

  if (players.length === 0) return [];

  const { data: positions } = await db
    .from("player_positions")
    .select("player_id, position, preference_rank, effective_rating")
    .in("player_id", players.map((p) => p.id));

  const byPlayer = new Map<string, { position: PositionCode; preferenceRank: number; rating: number }[]>();
  for (const row of positions ?? []) {
    const list = byPlayer.get(row.player_id) ?? [];
    list.push({
      position: row.position,
      preferenceRank: row.preference_rank,
      rating: Number(row.effective_rating),
    });
    byPlayer.set(row.player_id, list);
  }

  return players
    .map((p) => ({ id: p.id, name: p.name, positions: byPlayer.get(p.id) ?? [] }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
