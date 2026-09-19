"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/current-user";
import { hashPin } from "@/lib/auth/pin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { clearAvatar } from "@/lib/players/avatar-storage";
import { canDeletePlayer } from "@/lib/players/deletable";
import { memberRoleSchema, pinSchema } from "@/lib/validation/schemas";
import { toActionState, type ActionState } from "@/lib/actions/result";

export async function resetPinAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
    const playerId = String(formData.get("playerId") ?? "");
    const pin = pinSchema.parse(String(formData.get("pin") ?? ""));

    const { error } = await supabaseAdmin()
      .from("player_credentials")
      .upsert(
        { player_id: playerId, pin_hash: await hashPin(pin), failed_attempts: 0, locked_until: null },
        { onConflict: "player_id" },
      );

    if (error) throw error;

    revalidatePath("/admin/players");
    return { ok: true, message: "PIN reset. Tell them their new PIN." };
  } catch (error) {
    return toActionState(error);
  }
}

export async function setRoleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const playerId = String(formData.get("playerId") ?? "");
    const role = memberRoleSchema.parse(String(formData.get("role") ?? ""));

    const db = supabaseAdmin();

    // Never leave the group without an admin who can still log in.
    if (role !== "admin") {
      const { count } = await db
        .from("group_members")
        .select("id", { count: "exact", head: true })
        .eq("group_id", admin.groupId)
        .eq("role", "admin")
        .eq("is_active", true);

      if ((count ?? 0) <= 1) {
        const { data: current } = await db
          .from("group_members")
          .select("role")
          .eq("group_id", admin.groupId)
          .eq("player_id", playerId)
          .maybeSingle();

        if (current?.role === "admin") {
          return { ok: false, error: "This is the only admin left. Make somebody else an admin first." };
        }
      }
    }

    const { error } = await db
      .from("group_members")
      .update({ role })
      .eq("group_id", admin.groupId)
      .eq("player_id", playerId);

    if (error) throw error;

    revalidatePath("/admin/players");
    return { ok: true, message: "Role updated." };
  } catch (error) {
    return toActionState(error);
  }
}

export async function setPlayerActiveAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const playerId = String(formData.get("playerId") ?? "");
    const active = String(formData.get("active") ?? "") === "true";

    if (playerId === admin.player.id && !active) {
      return { ok: false, error: "You cannot deactivate yourself." };
    }

    const db = supabaseAdmin();

    // Deactivate, never delete: their goals and Sundays stay on record (spec §16).
    const { error } = await db.from("players").update({ is_active: active }).eq("id", playerId);
    if (error) throw error;

    await db
      .from("group_members")
      .update({ is_active: active })
      .eq("group_id", admin.groupId)
      .eq("player_id", playerId);

    revalidatePath("/admin/players");
    return { ok: true, message: active ? "Player reactivated." : "Player deactivated. Their history is kept." };
  } catch (error) {
    return toActionState(error);
  }
}

/**
 * Removes a profile outright, but only one that never played. Anybody with a
 * Sunday behind them is deactivated instead, so history stays true (spec §16).
 */
export async function deletePlayerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const playerId = String(formData.get("playerId") ?? "");

    const db = supabaseAdmin();

    const { data: player } = await db.from("players").select("id, name").eq("id", playerId).maybeSingle();
    if (!player) return { ok: false, error: "That player no longer exists." };

    const [{ data: playedSignups }, { data: placements }, { count: events }, { data: membership }, { count: admins }] =
      await Promise.all([
        db
          .from("signups")
          .select("session:sessions!inner(status)")
          .eq("player_id", playerId)
          .eq("status", "confirmed")
          .eq("sessions.status", "completed"),
        db
          .from("team_members")
          .select("session:sessions!inner(status)")
          .eq("player_id", playerId)
          .eq("sessions.status", "completed"),
        db
          .from("match_events")
          .select("id", { count: "exact", head: true })
          .or(`player_id.eq.${playerId},assist_player_id.eq.${playerId}`),
        db.from("group_members").select("role").eq("group_id", admin.groupId).eq("player_id", playerId).maybeSingle(),
        db
          .from("group_members")
          .select("id", { count: "exact", head: true })
          .eq("group_id", admin.groupId)
          .eq("role", "admin")
          .eq("is_active", true),
      ]);

    const verdict = canDeletePlayer({
      playedSessions: playedSignups?.length ?? 0,
      pastTeamPlacements: placements?.length ?? 0,
      matchEvents: events ?? 0,
      isSelf: playerId === admin.player.id,
      isLastAdmin: membership?.role === "admin" && (admins ?? 0) <= 1,
    });

    if (!verdict.allowed) return { ok: false, error: verdict.reason };

    const { error } = await db.from("players").delete().eq("id", playerId);
    if (error) throw error;

    revalidatePath("/admin/players");
    revalidatePath("/home");
    return { ok: true, message: `${player.name} has been removed.` };
  } catch (error) {
    return toActionState(error);
  }
}

export async function removePlayerAvatarAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
    const playerId = String(formData.get("playerId") ?? "");

    await clearAvatar(playerId);

    revalidatePath("/", "layout");
    return { ok: true, message: "Picture removed." };
  } catch (error) {
    return toActionState(error);
  }
}
