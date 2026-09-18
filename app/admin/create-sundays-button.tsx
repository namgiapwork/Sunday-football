"use client";

import { useActionState } from "react";
import { createUpcomingSundaysAction } from "@/app/actions/admin-sessions";
import { IDLE } from "@/lib/actions/result";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";

export function CreateSundaysButton() {
  const [state, action] = useActionState(createUpcomingSundaysAction, IDLE);

  return (
    <form action={action} className="flex flex-col gap-2">
      <SubmitButton variant="secondary" pendingLabel="Creating…">
        Create the next 4 Sundays
      </SubmitButton>
      {state.ok === true ? <Alert tone="success">{state.message}</Alert> : null}
      {state.ok === false ? <Alert tone="error">{state.error}</Alert> : null}
    </form>
  );
}
