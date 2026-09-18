"use client";

import { useActionState } from "react";
import { createVenueAction } from "@/app/actions/admin-sessions";
import { IDLE } from "@/lib/actions/result";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function VenueForm() {
  const [state, action] = useActionState(createVenueAction, IDLE);
  const fieldErrors = state.ok === false ? state.fieldErrors : undefined;

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Name" error={fieldErrors?.name}>
        <Input name="name" required maxLength={80} placeholder="Sportpark Rotterdam" />
      </Field>
      <Field label="Address" error={fieldErrors?.address}>
        <Input name="address" maxLength={200} placeholder="Sportlaan 12, 3062 Rotterdam" />
      </Field>
      <Field label="Google Maps link" hint="Optional. Paste the share link." error={fieldErrors?.mapsUrl}>
        <Input name="mapsUrl" type="url" placeholder="https://maps.google.com/..." />
      </Field>
      <Field label="Notes" hint="e.g. Pitch 3, gate code 1234" error={fieldErrors?.notes}>
        <Input name="notes" maxLength={200} />
      </Field>

      {state.ok === false ? <Alert tone="error">{state.error}</Alert> : null}
      {state.ok === true ? <Alert tone="success">{state.message}</Alert> : null}

      <SubmitButton pendingLabel="Saving…">Save venue</SubmitButton>
    </form>
  );
}
