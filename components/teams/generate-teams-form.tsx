"use client";

import { useActionState, useState } from "react";
import { generateTeamsAction } from "@/app/actions/admin-teams";
import { IDLE } from "@/lib/actions/result";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import type { TeamSizeOption } from "@/lib/teams/team-sizes";

const TOGGLES = [
  { name: "balanceAbility", label: "Balance ability" },
  { name: "balancePositions", label: "Balance position coverage" },
  { name: "respectPreferences", label: "Respect preferred positions" },
  { name: "balanceGoalkeepers", label: "Spread goalkeepers" },
] as const;

export function GenerateTeamsForm({
  sessionId,
  confirmedCount,
  options,
  hasExistingTeams,
}: {
  sessionId: string;
  confirmedCount: number;
  options: TeamSizeOption[];
  hasExistingTeams: boolean;
}) {
  const [state, action] = useActionState(generateTeamsAction, IDLE);
  const [teamCount, setTeamCount] = useState(() => options.find((o) => o.recommended)?.teamCount ?? 2);

  if (options.length === 0) {
    return (
      <Alert tone="warning">
        {confirmedCount} confirmed {confirmedCount === 1 ? "player is" : "players are"} not enough to make
        teams of a sensible size. Wait for more signups.
      </Alert>
    );
  }

  const chosen = options.find((o) => o.teamCount === teamCount);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="teamCount" value={teamCount} />

      <div>
        <p className="mb-2 text-sm font-semibold">How many teams?</p>
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <button
              key={option.teamCount}
              type="button"
              onClick={() => setTeamCount(option.teamCount)}
              aria-pressed={option.teamCount === teamCount}
              className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                option.teamCount === teamCount
                  ? "border-lime bg-lime/10"
                  : "border-pitch-700 bg-pitch-900 hover:bg-pitch-850"
              }`}
            >
              <span className="block text-lg font-black leading-none">{option.teamCount}</span>
              <span className="text-xs text-chalk-faint">{option.label}</span>
              {option.recommended ? (
                <span className="ml-1 text-xs font-bold text-lime">suggested</span>
              ) : null}
            </button>
          ))}
        </div>
        {chosen ? (
          <p className="mt-2 text-sm text-chalk-dim">
            {chosen.sizes.length} teams: {chosen.label}
          </p>
        ) : null}
      </div>

      <fieldset className="rounded-2xl border border-pitch-700 bg-pitch-900 p-4">
        <legend className="px-1 text-xs font-bold uppercase tracking-[0.12em] text-chalk-faint">
          Balancing
        </legend>
        <div className="flex flex-col gap-2">
          {TOGGLES.map((toggle) => (
            <label key={toggle.name} className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                name={toggle.name}
                defaultChecked
                className="size-5 accent-lime"
              />
              {toggle.label}
            </label>
          ))}
        </div>
      </fieldset>

      {state.ok === false ? <Alert tone="error">{state.error}</Alert> : null}
      {state.ok === true ? <Alert tone="success">{state.message}</Alert> : null}

      <SubmitButton size="lg" pendingLabel="Generating teams…">
        {hasExistingTeams ? "Regenerate teams" : "Generate teams"}
      </SubmitButton>

      {hasExistingTeams ? (
        <p className="text-xs text-chalk-faint">
          Regenerating replaces the current teams with a different balanced arrangement.
        </p>
      ) : null}
    </form>
  );
}
