"use client";

import { useActionState } from "react";
import { publishTeamsAction, unpublishTeamsAction } from "@/app/actions/admin-teams";
import { IDLE } from "@/lib/actions/result";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";

export function PublishControls({ sessionId, published }: { sessionId: string; published: boolean }) {
  const [publishState, publish] = useActionState(publishTeamsAction, IDLE);
  const [hideState, hide] = useActionState(unpublishTeamsAction, IDLE);

  const error =
    (publishState.ok === false && publishState.error) || (hideState.ok === false && hideState.error) || null;

  return (
    <div className="flex flex-col gap-3">
      {published ? (
        <>
          <Alert tone="success">Teams are published. Everyone can see them.</Alert>
          <form action={hide}>
            <input type="hidden" name="sessionId" value={sessionId} />
            <SubmitButton variant="secondary" pendingLabel="Hiding…">
              Hide from players again
            </SubmitButton>
          </form>
        </>
      ) : (
        <form action={publish}>
          <input type="hidden" name="sessionId" value={sessionId} />
          <SubmitButton size="lg" pendingLabel="Publishing…">
            Publish teams
          </SubmitButton>
          <p className="mt-2 text-xs text-chalk-faint">
            Until you publish, only organisers can see these teams.
          </p>
        </form>
      )}

      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}
