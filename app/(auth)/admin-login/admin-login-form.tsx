"use client";

import { useActionState } from "react";
import { adminLoginAction } from "@/app/actions/auth";
import { IDLE } from "@/lib/actions/result";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function AdminLoginForm() {
  const [state, action] = useActionState(adminLoginAction, IDLE);

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
    </form>
  );
}
