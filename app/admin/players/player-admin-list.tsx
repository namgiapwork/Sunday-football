"use client";

import { useActionState, useMemo, useState } from "react";
import {
  deletePlayerAction,
  resetPinAction,
  setPlayerActiveAction,
  setRoleAction,
} from "@/app/actions/admin-players";
import { IDLE } from "@/lib/actions/result";
import type { PositionCode } from "@/lib/teams/positions";
import type { MemberRole } from "@/types/database";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/field";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { PositionBadge, RatingBadge } from "@/components/players/position-badge";
import { SubmitButton } from "@/components/ui/submit-button";

interface AdminPlayer {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: MemberRole;
  isActive: boolean;
  positions: { position: PositionCode; preferenceRank: number; rating: number }[];
}

export function PlayerAdminList({
  players,
  currentAdminId,
}: {
  players: AdminPlayer[];
  currentAdminId: string;
}) {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? players.filter((p) => p.name.toLowerCase().includes(needle)) : players;
  }, [players, query]);

  return (
    <div className="flex flex-col gap-4">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search players"
        aria-label="Search players"
      />

      <ul className="divide-y divide-pitch-800 overflow-hidden rounded-2xl border border-pitch-700 bg-pitch-900">
        {matches.map((player) => (
          <li key={player.id}>
            <button
              type="button"
              onClick={() => setOpenId(openId === player.id ? null : player.id)}
              aria-expanded={openId === player.id}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-pitch-850
                ${player.isActive ? "" : "opacity-50"}`}
            >
              <PlayerAvatar name={player.name} avatarUrl={player.avatarUrl} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{player.name}</span>
                <span className="flex flex-wrap items-center gap-1 pt-0.5">
                  {player.positions.slice(0, 3).map((position) => (
                    <PositionBadge
                      key={position.position}
                      position={position.position}
                      rank={position.preferenceRank}
                    />
                  ))}
                  {player.positions.length === 0 ? (
                    <span className="text-xs text-chalk-faint">No positions saved</span>
                  ) : null}
                </span>
              </span>
              <span className="shrink-0 text-right">
                {player.role !== "player" ? (
                  <span className="block text-xs font-bold text-lime capitalize">{player.role}</span>
                ) : null}
                {!player.isActive ? <span className="text-xs text-chalk-faint">Inactive</span> : null}
              </span>
            </button>

            {openId === player.id ? (
              <PlayerActions player={player} isSelf={player.id === currentAdminId} />
            ) : null}
          </li>
        ))}
        {matches.length === 0 ? (
          <li className="px-4 py-3 text-sm text-chalk-faint">No player matches “{query}”.</li>
        ) : null}
      </ul>
    </div>
  );
}

function PlayerActions({ player, isSelf }: { player: AdminPlayer; isSelf: boolean }) {
  const [roleState, roleAction] = useActionState(setRoleAction, IDLE);
  const [pinState, pinAction] = useActionState(resetPinAction, IDLE);
  const [activeState, activeAction] = useActionState(setPlayerActiveAction, IDLE);
  const [deleteState, deleteAction] = useActionState(deletePlayerAction, IDLE);

  const message =
    (roleState.ok === true && roleState.message) ||
    (pinState.ok === true && pinState.message) ||
    (activeState.ok === true && activeState.message) ||
    (deleteState.ok === true && deleteState.message) ||
    null;

  const error =
    (roleState.ok === false && roleState.error) ||
    (pinState.ok === false && pinState.error) ||
    (activeState.ok === false && activeState.error) ||
    (deleteState.ok === false && deleteState.error) ||
    null;

  return (
    <div className="border-t border-pitch-800 bg-pitch-850 px-4 py-4">
      {player.positions.length > 0 ? (
        <div className="mb-4">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-chalk-faint">Ratings</p>
          <ul className="flex flex-col gap-1 text-sm">
            {player.positions.map((position) => (
              <li key={position.position} className="flex items-baseline justify-between">
                <span>
                  {position.position}
                  <span className="ml-2 text-xs text-chalk-faint">choice {position.preferenceRank}</span>
                </span>
                <RatingBadge rating={position.rating} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <form action={roleAction} className="mb-4 flex items-end gap-2">
        <input type="hidden" name="playerId" value={player.id} />
        <label className="flex-1">
          <span className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-chalk-faint">
            Role
          </span>
          <select
            name="role"
            defaultValue={player.role}
            className="h-10 w-full rounded-xl border border-pitch-700 bg-pitch-900 px-2 text-sm text-chalk"
          >
            <option value="player">Player</option>
            <option value="scorekeeper">Scorekeeper</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <SubmitButton size="sm" variant="secondary" pendingLabel="…">
          Set role
        </SubmitButton>
      </form>

      <form action={pinAction} className="mb-4 flex items-end gap-2">
        <input type="hidden" name="playerId" value={player.id} />
        <label className="flex-1">
          <span className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-chalk-faint">
            Reset PIN
          </span>
          <Input
            name="pin"
            inputMode="numeric"
            maxLength={4}
            pattern="\d{4}"
            placeholder="New 4-digit PIN"
            required
            className="tabular h-10"
          />
        </label>
        <SubmitButton size="sm" variant="secondary" pendingLabel="…">
          Reset
        </SubmitButton>
      </form>

      {!isSelf ? (
        <div className="flex flex-wrap gap-3">
          <form action={activeAction}>
            <input type="hidden" name="playerId" value={player.id} />
            <input type="hidden" name="active" value={player.isActive ? "false" : "true"} />
            <SubmitButton size="sm" variant={player.isActive ? "danger" : "secondary"} pendingLabel="…">
              {player.isActive ? "Deactivate" : "Reactivate"}
            </SubmitButton>
          </form>

          <form
            action={deleteAction}
            onSubmit={(event) => {
              if (
                !window.confirm(
                  `Delete ${player.name} permanently? This cannot be undone. It is refused if they have ever played.`,
                )
              ) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="playerId" value={player.id} />
            <SubmitButton size="sm" variant="ghost" pendingLabel="…">
              Delete permanently
            </SubmitButton>
          </form>
        </div>
      ) : null}

      {message ? (
        <div className="mt-3">
          <Alert tone="success">{message}</Alert>
        </div>
      ) : null}
      {error ? (
        <div className="mt-3">
          <Alert tone="error">{error}</Alert>
        </div>
      ) : null}
    </div>
  );
}
