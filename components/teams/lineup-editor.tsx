"use client";

import { useActionState } from "react";
import { resetLineupAction, setLineupAction } from "@/app/actions/admin-teams";
import { IDLE, type ActionState } from "@/lib/actions/result";
import { buildLineup, SLOT_COUNT } from "@/lib/teams/formation";
import type { PositionCode } from "@/lib/teams/positions";
import { Alert } from "@/components/ui/alert";
import { Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { kitColour } from "./team-colours";
import type { TeamView } from "@/lib/data/teams";

const SLOT_LABELS = [
  "Goalkeeper",
  "Defender",
  "Defender",
  "Midfielder",
  "Midfielder",
  "Winger",
  "Winger",
  "Striker",
];

/** Admin-only: choose who starts in each spot; everyone else is a substitute. */
export function LineupEditor({ teams }: { teams: TeamView[] }) {
  return (
    <div className="flex flex-col gap-4">
      {teams.map((team) => (
        <TeamLineup key={team.id} team={team} />
      ))}
    </div>
  );
}

function TeamLineup({ team }: { team: TeamView }) {
  const kit = kitColour(team.colour);
  // One form, two buttons: the pressed button's `intent` picks the action.
  const [state, action] = useActionState(
    (prev: ActionState, formData: FormData) =>
      formData.get("intent") === "reset" ? resetLineupAction(prev, formData) : setLineupAction(prev, formData),
    IDLE,
  );

  // Whatever the board currently shows, so the form starts from what players see.
  const lineup = buildLineup(
    team.members.map((m) => ({ ...m, position: m.assignedPosition as PositionCode, lineupSlot: m.lineupSlot })),
  );
  const current = lineup.lines.flatMap((l) => l.players).map((m) => m?.id ?? "");
  const options = team.members.filter((m) => m.isAvailable);

  return (
    <section className="overflow-hidden rounded-2xl border border-pitch-700 bg-pitch-900">
      <header className={`flex items-baseline justify-between px-4 py-3 ${kit.soft}`}>
        <h3 className="flex items-center gap-2 text-lg font-black tracking-tight">
          <span aria-hidden className={`size-3 rounded-full ${kit.dot}`} />
          <span className={kit.text}>{team.name}</span>
        </h3>
      </header>

      {/* key: remount so the selects follow the saved lineup after a save or reset */}
      <form action={action} key={current.join(",")} className="flex flex-col gap-3 p-4">
        <input type="hidden" name="teamId" value={team.id} />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: SLOT_COUNT }, (_, slot) => (
            <label key={slot} className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-chalk-faint">
                {SLOT_LABELS[slot]}
              </span>
              <Select name={`slot${slot}`} defaultValue={current[slot]} className="h-11">
                <option value="">Open</option>
                {options.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.assignedPosition})
                  </option>
                ))}
              </Select>
            </label>
          ))}
        </div>
        <p className="text-xs text-chalk-faint">
          Picked automatically when the teams were made. Change any spot and save; anyone not picked is a substitute.
        </p>

        {state.ok === true ? <Alert tone="success">{state.message}</Alert> : null}
        {state.ok === false ? <Alert tone="error">{state.error}</Alert> : null}

        <div className="flex gap-2">
          <SubmitButton name="intent" value="save" className="flex-1" pendingLabel="Saving…">
            Save lineup
          </SubmitButton>
          <SubmitButton name="intent" value="reset" variant="secondary" pendingLabel="Picking…">
            Re-pick automatically
          </SubmitButton>
        </div>
      </form>
    </section>
  );
}
