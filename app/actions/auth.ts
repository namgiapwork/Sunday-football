"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { clearPlayerSession, createPlayerSession } from "@/lib/auth/session";
import { dummyVerify, hashPin, LOCKOUT_MINUTES, MAX_FAILED_ATTEMPTS, verifyPin } from "@/lib/auth/pin";
import { getGroup } from "@/lib/data/groups";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { joinSchema, loginSchema, positionPreferencesSchema } from "@/lib/validation/schemas";
import { toActionState, type ActionState } from "@/lib/actions/result";

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let playerId: string;

  try {
    const input = loginSchema.parse({
      playerId: String(formData.get("playerId") ?? ""),
      pin: String(formData.get("pin") ?? ""),
    });

    const db = supabaseAdmin();
    const { data: credential } = await db
      .from("player_credentials")
      .select("player_id, pin_hash, failed_attempts, locked_until")
      .eq("player_id", input.playerId)
      .maybeSingle();

    if (!credential) {
      // Same shape and timing as a wrong PIN: never reveal who exists.
      await dummyVerify();
      return { ok: false, error: "Incorrect PIN. Try again." };
    }

    if (credential.locked_until && new Date(credential.locked_until) > new Date()) {
      return {
        ok: false,
        error: `Too many attempts. Try again in ${LOCKOUT_MINUTES} minutes, or ask an admin to reset your PIN.`,
      };
    }

    if (!(await verifyPin(input.pin, credential.pin_hash))) {
      const attempts = credential.failed_attempts + 1;
      await db
        .from("player_credentials")
        .update({
          failed_attempts: attempts,
          locked_until:
            attempts >= MAX_FAILED_ATTEMPTS
              ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString()
              : null,
        })
        .eq("player_id", credential.player_id);

      return { ok: false, error: "Incorrect PIN. Try again." };
    }

    await db
      .from("player_credentials")
      .update({ failed_attempts: 0, locked_until: null })
      .eq("player_id", credential.player_id);

    await createPlayerSession(credential.player_id);
    playerId = credential.player_id;
  } catch (error) {
    return toActionState(error);
  }

  void playerId;
  redirect("/home");
}

export async function joinAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const positions = positionPreferencesSchema.parse(JSON.parse(String(formData.get("positions") ?? "[]")));
    const input = joinSchema.parse({
      name: String(formData.get("name") ?? ""),
      pin: String(formData.get("pin") ?? ""),
      positions,
    });

    const group = await getGroup();
    if (!group) return { ok: false, error: "This football group has not been set up yet." };

    const db = supabaseAdmin();

    const { data: clash } = await db
      .from("players")
      .select("id")
      .ilike("name", input.name)
      .eq("is_active", true)
      .maybeSingle();

    if (clash) {
      return {
        ok: false,
        error: `Somebody already plays as "${input.name}". Add your surname or a nickname.`,
        fieldErrors: { name: "That name is taken." },
      };
    }

    const { data: player, error: playerError } = await db
      .from("players")
      .insert({ name: input.name })
      .select("id")
      .single();

    if (playerError || !player) throw playerError ?? new Error("Could not create the player.");

    await db.from("player_credentials").insert({
      player_id: player.id,
      pin_hash: await hashPin(input.pin),
    });

    await db.from("group_members").insert({ group_id: group.id, player_id: player.id, role: "player" });

    if (input.positions.length > 0) {
      await db.from("player_positions").insert(
        input.positions.map((p) => ({
          player_id: player.id,
          position: p.position,
          preference_rank: p.preferenceRank,
          self_rating: p.rating,
        })),
      );
    }

    await createPlayerSession(player.id);
  } catch (error) {
    return toActionState(error);
  }

  redirect("/home");
}

export async function logoutAction(): Promise<void> {
  await clearPlayerSession();
  try {
    const supabase = await supabaseServer();
    await supabase.auth.signOut();
  } catch {
    // No Supabase Auth session to end.
  }
  redirect("/");
}

const adminLoginSchema = z.object({
  email: z.email("Enter the email address you registered with."),
  password: z.string().min(8, "Passwords are at least 8 characters."),
});

export async function adminLoginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const input = adminLoginSchema.parse({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });

    const supabase = await supabaseServer();
    const { error } = await supabase.auth.signInWithPassword(input);

    if (error) return { ok: false, error: "That email and password did not match." };
  } catch (error) {
    return toActionState(error);
  }

  redirect("/admin");
}

const resetRequestSchema = z.object({
  email: z.email("Enter the email address you sign in with."),
});

/**
 * Sends the organiser a password reset link. Always reports success: whether an
 * address has an account is not something an anonymous visitor should learn.
 */
export async function requestPasswordResetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { email } = resetRequestSchema.parse({ email: String(formData.get("email") ?? "") });

    const supabase = await supabaseServer();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${publicEnv.appUrl}/admin-reset`,
    });

    if (error) console.error("[reset]", error);

    return {
      ok: true,
      message: "If that address has an account, a reset link is on its way. Check your inbox and spam.",
    };
  } catch (error) {
    return toActionState(error);
  }
}

const newPasswordSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "The two passwords do not match.",
    path: ["confirm"],
  });

/** Sets a new password using the recovery session from the emailed link. */
export async function setPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const input = newPasswordSchema.parse({
      password: String(formData.get("password") ?? ""),
      confirm: String(formData.get("confirm") ?? ""),
    });

    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        ok: false,
        error: "That reset link has expired. Request a new one and use it within the hour.",
      };
    }

    const { error } = await supabase.auth.updateUser({ password: input.password });
    if (error) return { ok: false, error: error.message };

    return { ok: true, message: "Password changed. You can sign in with it now." };
  } catch (error) {
    return toActionState(error);
  }
}
