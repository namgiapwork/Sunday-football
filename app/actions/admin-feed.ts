"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/current-user";
import { getGroup } from "@/lib/data/groups";
import { getFixture, getStatTotals } from "@/lib/data/feed";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { localToUtcIso } from "@/lib/time/group-time";
import {
  fixtureResultSchema,
  fixtureSchema,
  fixtureStatusSchema,
  statAdjustmentSchema,
} from "@/lib/validation/schemas";
import { toActionState, type ActionState } from "@/lib/actions/result";

function refresh() {
  revalidatePath("/feed");
  revalidatePath("/admin/feed");
}

/** Every action below authorises as an admin (Supabase Auth, not a PIN) first. */

export async function createFixtureAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const input = fixtureSchema.parse({
      homeTeam: formData.get("homeTeam"),
      awayTeam: formData.get("awayTeam"),
      competition: String(formData.get("competition") ?? "") || undefined,
      kickoffLocal: formData.get("kickoffLocal"),
    });
    const group = await getGroup();

    const { error } = await supabaseAdmin()
      .from("fixtures")
      .insert({
        group_id: admin.groupId,
        home_team: input.homeTeam,
        away_team: input.awayTeam,
        competition: input.competition ?? null,
        kickoff_at: localToUtcIso(input.kickoffLocal, group?.timezone),
        created_by: admin.player.id,
        updated_by: admin.player.id,
      });
    if (error) throw error;

    refresh();
    return { ok: true, message: `${input.homeTeam} vs ${input.awayTeam} added.` };
  } catch (error) {
    return toActionState(error);
  }
}

export async function setFixtureResultAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const fixtureId = String(formData.get("fixtureId") ?? "");
    const { homeGoals, awayGoals } = fixtureResultSchema.parse({
      homeGoals: formData.get("homeGoals"),
      awayGoals: formData.get("awayGoals"),
    });

    const fixture = await getFixture(fixtureId);
    if (!fixture || fixture.group_id !== admin.groupId) return { ok: false, error: "That match no longer exists." };
    if (fixture.status === "cancelled") return { ok: false, error: "A cancelled match cannot have a result." };
    if (new Date(fixture.kickoff_at).getTime() > Date.now()) {
      return { ok: false, error: "This match has not kicked off yet." };
    }

    // Re-entry corrects a result; scoring is derived, so the leaderboard follows.
    const { error } = await supabaseAdmin()
      .from("fixtures")
      .update({ status: "finished", home_goals: homeGoals, away_goals: awayGoals, updated_by: admin.player.id })
      .eq("id", fixtureId);
    if (error) throw error;

    refresh();
    return { ok: true, message: "Result saved." };
  } catch (error) {
    return toActionState(error);
  }
}

/** Postpone, cancel or reopen. Fixtures are never deleted. */
export async function setFixtureStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const fixtureId = String(formData.get("fixtureId") ?? "");
    const status = fixtureStatusSchema.parse(String(formData.get("status") ?? ""));

    const fixture = await getFixture(fixtureId);
    if (!fixture || fixture.group_id !== admin.groupId) return { ok: false, error: "That match no longer exists." };
    if (fixture.status === "finished") return { ok: false, error: "A finished match cannot change status." };

    const { error } = await supabaseAdmin()
      .from("fixtures")
      .update({ status, updated_by: admin.player.id })
      .eq("id", fixtureId);
    if (error) throw error;

    refresh();
    return { ok: true, message: `Marked as ${status}.` };
  } catch (error) {
    return toActionState(error);
  }
}

/**
 * The admin types the total they want; the server records the difference as a
 * new ledger row, so nothing is overwritten and the reason stays on file.
 */
export async function adjustPlayerStatAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const playerId = String(formData.get("playerId") ?? "");
    const input = statAdjustmentSchema.parse({
      stat: formData.get("stat"),
      target: formData.get("target"),
      reason: formData.get("reason"),
    });

    const { totals } = await getStatTotals(admin.groupId);
    const current = totals[input.stat].get(playerId);
    if (current === undefined) return { ok: false, error: "That player is not in the group." };

    const delta = input.target - current;
    if (delta === 0) return { ok: false, error: `They already have ${current}. Enter a different total.` };

    const { error } = await supabaseAdmin()
      .from("player_stat_adjustments")
      .insert({
        group_id: admin.groupId,
        player_id: playerId,
        stat: input.stat,
        delta,
        reason: input.reason,
        created_by: admin.player.id,
      });
    if (error) throw error;

    refresh();
    return { ok: true, message: `Total set to ${input.target}.` };
  } catch (error) {
    return toActionState(error);
  }
}

/** Undo a correction by voiding it (soft, like match events). */
export async function voidAdjustmentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const id = String(formData.get("adjustmentId") ?? "");

    const { error } = await supabaseAdmin()
      .from("player_stat_adjustments")
      .update({ voided_at: new Date().toISOString() })
      .eq("id", id)
      .eq("group_id", admin.groupId)
      .is("voided_at", null);
    if (error) throw error;

    refresh();
    return { ok: true, message: "Correction voided." };
  } catch (error) {
    return toActionState(error);
  }
}
