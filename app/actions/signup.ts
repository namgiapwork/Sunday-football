"use server";

import { revalidatePath } from "next/cache";
import { requirePlayer } from "@/lib/auth/current-user";
import { getSession } from "@/lib/data/sessions";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { signupIsOpen, signupClosedReason } from "@/lib/sessions/state";
import { signupStatusSchema } from "@/lib/validation/schemas";
import { toActionState, type ActionState } from "@/lib/actions/result";

export async function setSignupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requirePlayer();
    const sessionId = String(formData.get("sessionId") ?? "");
    const status = signupStatusSchema.parse(String(formData.get("status") ?? ""));

    const session = await getSession(sessionId);
    if (!session) return { ok: false, error: "That Sunday no longer exists." };

    // The deadline is enforced here, not in the browser.
    if (!signupIsOpen(session)) {
      return { ok: false, error: signupClosedReason(session) ?? "Signup is closed." };
    }

    const { error } = await supabaseAdmin()
      .from("signups")
      .upsert(
        { session_id: sessionId, player_id: user.player.id, status },
        { onConflict: "session_id,player_id" },
      );

    if (error) throw error;

    // If teams are already picked, a change of heart has to show on the team
    // sheet — the organiser is warned, but nothing is reshuffled behind their
    // back (spec §27).
    await supabaseAdmin()
      .from("team_members")
      .update({ is_available: status === "confirmed" })
      .eq("session_id", sessionId)
      .eq("player_id", user.player.id);

    revalidatePath("/home");
    revalidatePath("/teams");
    return { ok: true, message: statusMessage(status) };
  } catch (error) {
    return toActionState(error);
  }
}

function statusMessage(status: string): string {
  if (status === "confirmed") return "You're playing.";
  if (status === "maybe") return "Marked as a maybe.";
  return "Marked as not playing.";
}
