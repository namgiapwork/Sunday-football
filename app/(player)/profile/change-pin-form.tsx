"use client";

import { useActionState } from "react";
import { changePinAction } from "@/app/actions/profile";
import { IDLE } from "@/lib/actions/result";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function ChangePinForm() {
  const [state, action] = useActionState(changePinAction, IDLE);
  const fieldErrors = state.ok === false ? state.fieldErrors : undefined;

  const pinProps = {
    type: "password" as const,
    inputMode: "numeric" as const,
    maxLength: 4,
    pattern: "\\d{4}",
    required: true,
    className: "tabular tracking-[0.4em]",
  };

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Current PIN" error={fieldErrors?.currentPin}>
        <Input name="currentPin" autoComplete="current-password" {...pinProps} />
      </Field>
      <Field label="New PIN" error={fieldErrors?.newPin}>
        <Input name="newPin" autoComplete="new-password" {...pinProps} />
      </Field>
      <Field label="Repeat new PIN" error={fieldErrors?.confirmPin}>
        <Input name="confirmPin" autoComplete="new-password" {...pinProps} />
      </Field>

      {state.ok === false ? <Alert tone="error">{state.error}</Alert> : null}
      {state.ok === true ? <Alert tone="success">{state.message}</Alert> : null}

      <SubmitButton variant="secondary" pendingLabel="Changing…">
        Change PIN
      </SubmitButton>
    </form>
  );
}
