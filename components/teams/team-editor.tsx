"use client";

import { useActionState, useState } from "react";
import {
  movePlayerAction,
  removeFromTeamAction,
  setAssignedPositionAction,
  setMemberAvailabilityAction,
} from "@/app/actions/admin-teams";
import { IDLE } from "@/lib/actions/result";
import { POSITION_CODES, POSITION_LABELS } from "@/lib/teams/positions";
import { Alert } from "@/components/ui/alert";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { PositionBadge, RatingBadge } from "@/components/players/position-badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { kitColour } from "./team-colours";
import type { TeamView } from "@/lib/data/teams";

/**
 * Tap a player to move them, change their position, or mark them as dropped out.
 * Nothing is ever undone automatically — the admin's decision stands (spec §14).
 */
export function TeamEditor({ teams }: { teams: TeamView[] }) {
  const [openMember, setOpenMember] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {teams.map((team) => {
        const kit = kitColour(team.colour);
        return (
          <section key={team.id} className="overflow-hidden rounded-2xl border border-pitch-700 bg-pitch-900">
            <header className={`flex items-baseline justify-between px-4 py-3 ${kit.soft}`}>
              <h3 className="flex items-center gap-2 text-lg font-black tracking-tight">
                <span aria-hidden className={`size-3 rounded-full ${kit.dot}`} />
                <span className={kit.text}>{team.name}</span>
                <span className="text-sm font-semibold text-chalk-faint">{team.members.length}</span>
              </h3>
              {team.averageRating !== null ? (
                <span className="tabular text-sm text-chalk-faint">
                  avg <span className="font-bold text-chalk-dim">{team.averageRating}</span>
                </span>
              ) : null}
            </header>

            <ul className="divide-y divide-pitch-850">
              {team.members.map((member) => (
                <li key={member.id}>
                  <button
                    type="button"
                    onClick={() => setOpenMember(openMember === member.id ? null : member.id)}
                    aria-expanded={openMember === member.id}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-pitch-850
                      ${member.isAvailable ? "" : "opacity-50"}`}
                  >
                    <PlayerAvatar name={member.name} avatarUrl={member.avatarUrl} size="sm" />
                    <span className="flex-1 font-semibold">
                      {member.name}
                      {member.isAvailable ? null : (
                        <span className="ml-2 text-xs font-normal text-kit-red">dropped out</span>
                      )}
                    </span>
                    <PositionBadge position={member.assignedPosition} rank={member.preferenceRank} />
                    {member.ratingSnapshot !== null ? <RatingBadge rating={member.ratingSnapshot} /> : null}
                  </button>

                  {openMember === member.id ? (
                    <MemberActions
                      member={member}
                      teams={teams}
                      currentTeamId={team.id}
                      onDone={() => setOpenMember(null)}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function MemberActions({
  member,
  teams,
  currentTeamId,
  onDone,
}: {
  member: TeamView["members"][number];
  teams: TeamView[];
  currentTeamId: string;
  onDone: () => void;
}) {
  const [moveState, moveAction] = useActionState(movePlayerAction, IDLE);
  const [positionState, positionAction] = useActionState(setAssignedPositionAction, IDLE);
  const [availabilityState, availabilityAction] = useActionState(setMemberAvailabilityAction, IDLE);
  const [removeState, removeAction] = useActionState(removeFromTeamAction, IDLE);

  const error =
    (moveState.ok === false && moveState.error) ||
    (positionState.ok === false && positionState.error) ||
    (availabilityState.ok === false && availabilityState.error) ||
    (removeState.ok === false && removeState.error) ||
    null;

  return (
    <div className="border-t border-pitch-800 bg-pitch-850 px-4 py-4">
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-chalk-faint">Move to</p>
      <div className="flex flex-wrap gap-2">
        {teams
          .filter((team) => team.id !== currentTeamId)
          .map((team) => {
            const kit = kitColour(team.colour);
            return (
              <form key={team.id} action={moveAction} onSubmit={onDone}>
                <input type="hidden" name="memberId" value={member.id} />
                <input type="hidden" name="targetTeamId" value={team.id} />
                <button
                  type="submit"
                  className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold
                    ${kit.border} ${kit.soft} ${kit.text}`}
                >
                  <span aria-hidden className={`size-2.5 rounded-full ${kit.dot}`} />
                  {team.name}
                </button>
              </form>
            );
          })}
      </div>

      <form action={positionAction} className="mt-4 flex items-end gap-2">
        <input type="hidden" name="memberId" value={member.id} />
        <label className="flex-1">
          <span className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-chalk-faint">
            Position on Sunday
          </span>
          <select
            name="position"
            defaultValue={member.assignedPosition}
            className="h-10 w-full rounded-xl border border-pitch-700 bg-pitch-900 px-2 text-sm text-chalk"
          >
            {POSITION_CODES.map((code) => (
              <option key={code} value={code}>
                {code} — {POSITION_LABELS[code]}
              </option>
            ))}
          </select>
        </label>
        <SubmitButton size="sm" variant="secondary" pendingLabel="…">
          Set
        </SubmitButton>
      </form>

      <div className="mt-4 flex flex-wrap gap-3">
        <form action={availabilityAction}>
          <input type="hidden" name="memberId" value={member.id} />
          <input type="hidden" name="available" value={member.isAvailable ? "false" : "true"} />
          <SubmitButton size="sm" variant={member.isAvailable ? "danger" : "secondary"} pendingLabel="…">
            {member.isAvailable ? "Mark as dropped out" : "Mark as playing again"}
          </SubmitButton>
        </form>

        <form
          action={removeAction}
          onSubmit={(event) => {
            if (!window.confirm(`Take ${member.name} off the team sheet?`)) event.preventDefault();
          }}
        >
          <input type="hidden" name="memberId" value={member.id} />
          <SubmitButton size="sm" variant="ghost" pendingLabel="…">
            Take off team sheet
          </SubmitButton>
        </form>
      </div>

      {error ? (
        <div className="mt-3">
          <Alert tone="error">{error}</Alert>
        </div>
      ) : null}
    </div>
  );
}
