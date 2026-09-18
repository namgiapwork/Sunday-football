"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/app/actions/profile";
import { IDLE } from "@/lib/actions/result";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { PositionPicker } from "@/components/players/position-picker";
import { SubmitButton } from "@/components/ui/submit-button";
import type { PositionCode } from "@/lib/teams/positions";

export function ProfileForm({
  name,
  positions,
}: {
  name: string;
  positions: { position: PositionCode; rating: number }[];
}) {
  const [state, action] = useActionState(updateProfileAction, IDLE);
  const fieldErrors = state.ok === false ? state.fieldErrors : undefined;

  return (
    <form action={action} className="flex flex-col gap-5">
      <Field label="Name" error={fieldErrors?.name}>
        <Input name="name" defaultValue={name} required maxLength={40} />
      </Field>

      <div>
        <p className="mb-2 text-sm font-semibold text-chalk">Your positions</p>
        <PositionPicker initial={positions} />
      </div>

      {state.ok === false ? <Alert tone="error">{state.error}</Alert> : null}
      {state.ok === true ? <Alert tone="success">{state.message}</Alert> : null}

      <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
    </form>
  );
}
