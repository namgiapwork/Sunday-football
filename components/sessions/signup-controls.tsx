"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { setSignupAction } from "@/app/actions/signup";
import { IDLE } from "@/lib/actions/result";
import { Alert } from "@/components/ui/alert";
import type { SignupStatus } from "@/types/database";

const LABELS: Record<SignupStatus, string> = {
  confirmed: "You're playing",
  maybe: "You said maybe",
  declined: "You're not playing",
};

export function SignupControls({
  sessionId,
  current,
  disabled,
  disabledReason,
}: {
  sessionId: string;
  current: SignupStatus | null;
  disabled: boolean;
  disabledReason: string | null;
}) {
  const [state, action] = useActionState(setSignupAction, IDLE);
  // Which button was tapped, so only that one shows a pending label.
  const [pressed, setPressed] = useState<SignupStatus | null>(null);

  if (disabled) {
    return (
      <div className="px-5">
        {current ? (
          <p className="mb-2 text-lg font-bold text-chalk">{LABELS[current]}.</p>
        ) : null}
        <Alert tone="info">{disabledReason ?? "Signup is closed."}</Alert>
      </div>
    );
  }

  return (
    <form action={action} className="px-5" onSubmit={() => undefined}>
      <input type="hidden" name="sessionId" value={sessionId} />

      {current === "confirmed" ? (
        <Confirmed />
      ) : (
        <Choice
          name="status"
          value="confirmed"
          pressed={pressed}
          onPress={setPressed}
          className="h-20 w-full rounded-3xl bg-lime text-2xl font-black tracking-tight text-pitch-950
            transition-colors hover:bg-lime-dark disabled:opacity-50"
          pendingLabel="Signing you up…"
        >
          I&apos;M PLAYING
        </Choice>
      )}

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Choice
          name="status"
          value="maybe"
          pressed={pressed}
          onPress={setPressed}
          className={`h-12 rounded-xl text-base font-semibold transition-colors disabled:opacity-50 ${
            current === "maybe" ? "bg-kit-yellow/20 text-kit-yellow" : "bg-pitch-800 text-chalk-dim hover:bg-pitch-700"
          }`}
          pendingLabel="Saving…"
        >
          Maybe
        </Choice>
        <Choice
          name="status"
          value="declined"
          pressed={pressed}
          onPress={setPressed}
          className={`h-12 rounded-xl text-base font-semibold transition-colors disabled:opacity-50 ${
            current === "declined" ? "bg-kit-red/20 text-kit-red" : "bg-pitch-800 text-chalk-dim hover:bg-pitch-700"
          }`}
          pendingLabel="Saving…"
        >
          Can&apos;t play
        </Choice>
      </div>

      {state.ok === false ? (
        <div className="mt-3">
          <Alert tone="error">{state.error}</Alert>
        </div>
      ) : null}
    </form>
  );
}

function Confirmed() {
  return (
    <div className="rounded-3xl border border-kit-green/40 bg-kit-green/10 px-5 py-6 text-center">
      <p className="text-2xl font-black tracking-tight text-kit-green">You&apos;re playing ✅</p>
      <p className="mt-1 text-sm text-chalk-dim">Change your mind below if something comes up.</p>
    </div>
  );
}

function Choice({
  children,
  pendingLabel,
  pressed,
  onPress,
  value,
  ...props
}: React.ComponentProps<"button"> & {
  pendingLabel: string;
  pressed: SignupStatus | null;
  onPress: (status: SignupStatus) => void;
  value: SignupStatus;
}) {
  const { pending } = useFormStatus();
  const isThisOne = pending && pressed === value;

  return (
    <button
      type="submit"
      value={value}
      disabled={pending}
      onClick={() => onPress(value)}
      {...props}
    >
      {isThisOne ? pendingLabel : children}
    </button>
  );
}
