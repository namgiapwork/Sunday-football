import "server-only";
import { cache } from "react";
import { AuthError } from "@/lib/auth/errors";
import { readPlayerSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import type { MemberRole, PlayerRow } from "@/types/database";

export interface CurrentUser {
  player: PlayerRow;
  role: MemberRole;
  groupId: string;
  /** True when the session came from Supabase Auth rather than a 4-digit PIN. */
  strongAuth: boolean;
}

/**
 * Resolves who is asking. Supabase Auth wins over the PIN cookie, so an admin who
 * signed in properly keeps their privileges. The role always comes from the
 * database, never from the cookie (spec §26, §78).
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const db = supabaseAdmin();

  const authUser = await supabaseAuthUser();
  const playerId = authUser?.playerId ?? (await readPlayerSession());
  if (!playerId) return null;

  const { data: player } = await db
    .from("players")
    .select("*")
    .eq("id", playerId)
    .maybeSingle();

  if (!player || !player.is_active) return null;

  const { data: membership } = await db
    .from("group_members")
    .select("group_id, role, is_active")
    .eq("player_id", player.id)
    .maybeSingle();

  if (!membership || !membership.is_active) return null;

  return {
    player,
    // A PIN session never confers admin rights, however the database is set up.
    role: authUser ? membership.role : downgrade(membership.role),
    groupId: membership.group_id,
    strongAuth: Boolean(authUser),
  };
});

/** PIN holders can keep score; running the Sunday needs the stronger login. */
function downgrade(role: MemberRole): MemberRole {
  return role === "admin" ? "scorekeeper" : role;
}

async function supabaseAuthUser(): Promise<{ playerId: string } | null> {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: player } = await supabaseAdmin()
      .from("players")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    return player ? { playerId: player.id } : null;
  } catch {
    return null;
  }
}

export async function requirePlayer(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Sign in to continue.");
  return user;
}

export async function requireScorekeeper(): Promise<CurrentUser> {
  const user = await requirePlayer();
  if (user.role === "player") {
    throw new AuthError("You do not have permission to record match events.");
  }
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requirePlayer();
  if (user.role !== "admin") {
    throw new AuthError(
      user.strongAuth
        ? "You do not have permission to manage this Sunday."
        : "Admin actions need the email login, not a PIN.",
    );
  }
  return user;
}

export { AuthError };
