import { ZodError } from "zod";
import { AuthError } from "@/lib/auth/errors";

export type ActionState =
  | { ok: true; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }
  | { ok: null };

export const IDLE: ActionState = { ok: null };

/**
 * Turns anything a server action throws into a message worth showing. Technical
 * detail is logged, not surfaced (spec §70).
 */
export function toActionState(error: unknown): ActionState {
  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of error.issues) {
      const key = issue.path.join(".") || "form";
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, error: error.issues[0]?.message ?? "Check the form and try again.", fieldErrors };
  }

  if (error instanceof AuthError) return { ok: false, error: error.message };

  if (error instanceof Error) {
    console.error("[action]", error);
    return { ok: false, error: error.message };
  }

  console.error("[action] unknown error", error);
  return { ok: false, error: "Something failed while saving. Try again." };
}
