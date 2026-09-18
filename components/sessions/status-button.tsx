"use client";

import { useActionState } from "react";
import { setSessionStatusAction } from "@/app/actions/admin-sessions";
import { IDLE } from "@/lib/actions/result";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import type { SessionStatus } from "@/lib/sessions/state";

export function StatusButton({
  sessionId,
  status,
  children,
  variant = "primary",
  size = "md",
  pendingLabel = "Working…",
  confirm,
}: {
  sessionId: string;
  status: SessionStatus;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "xl";
  pendingLabel?: string;
  confirm?: string;
}) {
  const [state, action] = useActionState(setSessionStatusAction, IDLE);

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
      className="contents"
    >
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton variant={variant} size={size} pendingLabel={pendingLabel}>
        {children}
      </SubmitButton>
      {state.ok === false ? <Alert tone="error">{state.error}</Alert> : null}
    </form>
  );
}
