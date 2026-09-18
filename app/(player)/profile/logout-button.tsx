"use client";

import { logoutAction } from "@/app/actions/auth";
import { SubmitButton } from "@/components/ui/submit-button";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <SubmitButton variant="ghost" pendingLabel="Signing out…">
        Sign out
      </SubmitButton>
    </form>
  );
}
