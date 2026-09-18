"use client";

import Link from "next/link";
import { useActionState } from "react";
import { setPasswordAction } from "@/app/actions/auth";
import { IDLE } from "@/lib/actions/result";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function SetPasswordForm() {
  const [state, action] = useActionState(setPasswordAction, IDLE);
  const fieldErrors = state.ok === false ? state.fieldErrors : undefined;

  if (state.ok === true) {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="success">{state.message}</Alert>
        <Link
          href="/admin-login"
          className="inline-flex h-12 items-center justify-center rounded-xl bg-lime font-bold text-pitch-950"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="New password" hint="At least 8 characters." error={fieldErrors?.password}>
        <Input name="password" type="password" required autoComplete="new-password" minLength={8} />
      </Field>
      <Field label="Repeat it" error={fieldErrors?.confirm}>
        <Input name="confirm" type="password" required autoComplete="new-password" minLength={8} />
      </Field>

      {state.ok === false ? <Alert tone="error">{state.error}</Alert> : null}

      <SubmitButton size="lg" pendingLabel="Saving…">
        Set password
      </SubmitButton>
    </form>
  );
}
