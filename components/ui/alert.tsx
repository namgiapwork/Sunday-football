import type { ReactNode } from "react";

type Tone = "info" | "warning" | "error" | "success";

const TONES: Record<Tone, string> = {
  info: "border-pitch-600 bg-pitch-850 text-chalk-dim",
  warning: "border-kit-yellow/40 bg-kit-yellow/10 text-kit-yellow",
  error: "border-kit-red/40 bg-kit-red/10 text-kit-red",
  success: "border-kit-green/40 bg-kit-green/10 text-kit-green",
};

/** Errors say what went wrong and what to do about it (spec §70). */
export function Alert({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={`rounded-xl border px-3 py-2.5 text-sm leading-snug ${TONES[tone]}`}
    >
      {children}
    </div>
  );
}
