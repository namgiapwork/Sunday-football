"use client";

import { useActionState } from "react";
import { setSessionStatusAction } from "@/app/actions/admin-sessions";
import { IDLE } from "@/lib/actions/result";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function CancelSessionForm({ sessionId }: { sessionId: string }) {
  const [state, action] = useActionState(setSessionStatusAction, IDLE);

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm("Cancel this Sunday? Everyone will see it as cancelled.")) {
          event.preventDefault();
        }
      }}
      className="flex flex-col gap-3"
    >
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="status" value="cancelled" />
      <Input name="reason" placeholder="Why? e.g. Pitch closed because of weather" required maxLength={200} />

      {state.ok === false ? <Alert tone="error">{state.error}</Alert> : null}

      <SubmitButton variant="danger" pendingLabel="Cancelling…">
        Cancel Sunday
      </SubmitButton>
    </form>
  );
}
