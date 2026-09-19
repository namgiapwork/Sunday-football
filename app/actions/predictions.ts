"use server";

import { revalidatePath } from "next/cache";
import { requirePlayer } from "@/lib/auth/current-user";
import { getFixture } from "@/lib/data/feed";
import { predictionsOpen } from "@/lib/feed/fixture-state";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { predictionPickSchema } from "@/lib/validation/schemas";
import { toActionState, type ActionState } from "@/lib/actions/result";

export async function setPredictionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requirePlayer();
    const fixtureId = String(formData.get("fixtureId") ?? "");
    const pick = predictionPickSchema.parse(String(formData.get("pick") ?? ""));

    const fixture = await getFixture(fixtureId);
    if (!fixture || fixture.group_id !== user.groupId) return { ok: false, error: "That match no longer exists." };

    // The lock is enforced here (and by a trigger), not in the browser.
    if (!predictionsOpen(fixture)) return { ok: false, error: "Predictions are closed for this match." };

    const { error } = await supabaseAdmin()
      .from("fixture_predictions")
      .upsert({ fixture_id: fixtureId, player_id: user.player.id, pick }, { onConflict: "fixture_id,player_id" });
    if (error) throw error;

    revalidatePath("/feed");
    return { ok: true, message: "Prediction saved." };
  } catch (error) {
    return toActionState(error);
  }
}
