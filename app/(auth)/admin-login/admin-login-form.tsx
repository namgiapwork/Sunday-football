"use client";

import { useActionState, useState } from "react";
import { adminLoginAction, requestPasswordResetAction } from "@/app/actions/auth";
import { IDLE } from "@/lib/actions/result";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function AdminLoginForm() {
  const [state, action] = useActionState(adminLoginAction, IDLE);
  const [resetState, resetAction] = useActionState(requestPasswordResetAction, IDLE);
  const [forgot, setForgot] = useState(false);

  if (forgot) {
    return (
      <form action={resetAction} className="flex flex-col gap-4">
        <p className="text-sm text-chalk-dim">
          Enter your email and we will send you a link to set a new password.
        </p>
        <Field label="Email">
          <Input name="email" type="email" required autoComplete="email" autoFocus />
        </Field>

        {resetState.ok === true ? <Alert tone="success">{resetState.message}</Alert> : null}
        {resetState.ok === false ? <Alert tone="error">{resetState.error}</Alert> : null}

        <SubmitButton size="lg" pendingLabel="Sending…">
          Send reset link
        </SubmitButton>

        <button
          type="button"
          onClick={() => setForgot(false)}
          className="text-sm font-semibold text-chalk-faint underline-offset-4 hover:underline"
        >
          Back to sign in
        </button>
      </form>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Email">
        <Input name="email" type="email" required autoComplete="email" />
      </Field>
      <Field label="Password">
        <Input name="password" type="password" required autoComplete="current-password" />
      </Field>

      {state.ok === false ? <Alert tone="error">{state.error}</Alert> : null}

      <SubmitButton size="lg" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>

      <button
        type="button"
        onClick={() => setForgot(true)}
        className="text-sm font-semibold text-chalk-faint underline-offset-4 hover:underline"
      >
        Forgotten your password?
      </button>
    </form>
  );
}
