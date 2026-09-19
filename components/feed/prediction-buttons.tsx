"use client";

import { useActionState } from "react";
import { setPredictionAction } from "@/app/actions/predictions";
import { IDLE } from "@/lib/actions/result";
import type { Pick } from "@/lib/feed/fixture-state";
import { Alert } from "@/components/ui/alert";

export function PredictionButtons({
  fixtureId,
  homeTeam,
  awayTeam,
  current,
}: {
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  current: Pick | null;
}) {
  const [state, action, pending] = useActionState(setPredictionAction, IDLE);
  const options: { pick: Pick; label: string }[] = [
    { pick: "home", label: homeTeam },
    { pick: "draw", label: "Draw" },
    { pick: "away", label: awayTeam },
  ];

  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="fixtureId" value={fixtureId} />
      <div className="grid grid-cols-3 gap-2">
        {options.map((o) => (
          <button
            key={o.pick}
            type="submit"
            name="pick"
            value={o.pick}
            disabled={pending}
            aria-pressed={current === o.pick}
            className={`min-h-12 rounded-xl px-2 text-sm font-semibold leading-tight transition-colors disabled:opacity-50
              ${current === o.pick ? "bg-lime text-pitch-950" : "bg-pitch-800 text-chalk hover:bg-pitch-700"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {state.ok === false ? (
        <div className="mt-2">
          <Alert tone="error">{state.error}</Alert>
        </div>
      ) : null}
    </form>
  );
}
