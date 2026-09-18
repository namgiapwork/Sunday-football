"use client";

import { useActionState } from "react";
import { setTeamsRevealAction } from "@/app/actions/admin-teams";
import { IDLE } from "@/lib/actions/result";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";

export function RevealControls({
  sessionId,
  revealed,
  revealLabel,
}: {
  sessionId: string;
  revealed: boolean;
  revealLabel: string | null;
}) {
  const [state, action] = useActionState(setTeamsRevealAction, IDLE);

  return (
    <div className="flex flex-col gap-3">
      {revealed ? (
        <Alert tone="success">Players can see the teams.</Alert>
      ) : (
        <Alert tone="info">
          {revealLabel
            ? `Players see the teams ${revealLabel}. Until then only organisers can.`
            : "Players will see the teams as soon as you publish."}
        </Alert>
      )}

      <form action={action} className="flex flex-wrap gap-3">
        <input type="hidden" name="sessionId" value={sessionId} />
        <input type="hidden" name="when" value={revealed ? "scheduled" : "now"} />
        <SubmitButton variant="secondary" pendingLabel="Saving…">
          {revealed ? "Put reveal back to the usual time" : "Reveal now"}
        </SubmitButton>
      </form>

      {state.ok === false ? <Alert tone="error">{state.error}</Alert> : null}
      {state.ok === true ? <Alert tone="success">{state.message}</Alert> : null}
    </div>
  );
}
