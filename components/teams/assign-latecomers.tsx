"use client";

import { useActionState } from "react";
import { addPlayerToTeamAction } from "@/app/actions/admin-teams";
import { IDLE } from "@/lib/actions/result";
import { Alert } from "@/components/ui/alert";
import { kitColour } from "./team-colours";
import type { TeamView } from "@/lib/data/teams";

export interface Latecomer {
  id: string;
  name: string;
}

/**
 * Somebody signed up after teams were picked. Dropping them into a team leaves
 * everyone else exactly where they are — far better than regenerating and
 * reshuffling players who have already seen their team (spec §27).
 */
export function AssignLatecomers({
  players,
  teams,
}: {
  players: Latecomer[];
  teams: TeamView[];
}) {
  const [state, action] = useActionState(addPlayerToTeamAction, IDLE);

  if (players.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <Alert tone="warning">
        {players.length === 1
          ? `${players[0].name} signed up after the teams were picked.`
          : `${players.length} players signed up after the teams were picked.`}{" "}
        Put them in a team below, or regenerate to start again.
      </Alert>

      {players.map((player) => (
        <div key={player.id} className="rounded-2xl border border-pitch-700 bg-pitch-900 px-4 py-3">
          <p className="mb-2 font-semibold">{player.name}</p>
          <div className="flex flex-wrap gap-2">
            {teams.map((team) => {
              const kit = kitColour(team.colour);
              return (
                <form key={team.id} action={action}>
                  <input type="hidden" name="playerId" value={player.id} />
                  <input type="hidden" name="targetTeamId" value={team.id} />
                  <button
                    type="submit"
                    className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold
                      ${kit.border} ${kit.soft} ${kit.text}`}
                  >
                    <span aria-hidden className={`size-2.5 rounded-full ${kit.dot}`} />
                    {team.name}
                    <span className="text-xs text-chalk-faint">{team.members.length}</span>
                  </button>
                </form>
              );
            })}
          </div>
        </div>
      ))}

      {state.ok === false ? <Alert tone="error">{state.error}</Alert> : null}
      {state.ok === true ? <Alert tone="success">{state.message}</Alert> : null}
    </div>
  );
}
