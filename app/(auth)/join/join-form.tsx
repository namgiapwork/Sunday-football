"use client";

import { useActionState } from "react";
import { joinAction } from "@/app/actions/auth";
import { IDLE } from "@/lib/actions/result";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { PinInput } from "@/components/ui/pin-input";
import { PositionPicker } from "@/components/players/position-picker";
import { SectionTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";

export function JoinForm() {
  const [state, action] = useActionState(joinAction, IDLE);
  const fieldErrors = state.ok === false ? state.fieldErrors : undefined;

  return (
    <form action={action} className="flex flex-col gap-6">
      <Field label="Your name" hint="What everyone calls you." error={fieldErrors?.name}>
        <Input name="name" required maxLength={40} autoComplete="nickname" placeholder="e.g. Khoi" />
      </Field>

      <div>
        <p className="mb-1.5 text-sm font-semibold text-chalk">Choose a 4-digit PIN</p>
        <PinInput />
        <p className="mt-1 text-xs text-chalk-faint">
          You will use this to sign in. An admin can reset it if you forget.
        </p>
      </div>

      <div>
        <SectionTitle className="mb-2">Where do you play?</SectionTitle>
        <PositionPicker />
      </div>

      {state.ok === false ? <Alert tone="error">{state.error}</Alert> : null}

      <SubmitButton size="lg" pendingLabel="Creating your profile…">
        Join
      </SubmitButton>
    </form>
  );
}
