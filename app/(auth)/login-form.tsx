"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { loginAction } from "@/app/actions/auth";
import { IDLE } from "@/lib/actions/result";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/field";
import { PinInput } from "@/components/ui/pin-input";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { SubmitButton } from "@/components/ui/submit-button";

interface PlayerOption {
  id: string;
  name: string;
  avatar_url: string | null;
}

export function LoginForm({ players }: { players: PlayerOption[] }) {
  const [state, action] = useActionState(loginAction, IDLE);
  const [selected, setSelected] = useState<PlayerOption | null>(null);

  // Remount the PIN boxes after a wrong PIN so they clear and refocus, rather
  // than leaving the failed digits for the player to delete one by one.
  const [failures, setFailures] = useState(0);
  const [lastState, setLastState] = useState(state);
  if (lastState !== state) {
    setLastState(state);
    if (state.ok === false) setFailures((n) => n + 1);
  }

  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = needle ? players.filter((p) => p.name.toLowerCase().includes(needle)) : players;
    return list.slice(0, 40);
  }, [players, query]);

  if (!selected) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor="player-search" className="mb-2 block text-lg font-bold">
            Select your name
          </label>
          <Input
            id="player-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search players"
            autoComplete="off"
          />
        </div>

        {players.length === 0 ? (
          <Alert tone="info">Nobody has joined yet. Be the first.</Alert>
        ) : (
          <ul className="max-h-[45dvh] divide-y divide-pitch-800 overflow-y-auto rounded-2xl border border-pitch-700 bg-pitch-900">
            {matches.map((player) => (
              <li key={player.id}>
                <button
                  type="button"
                  onClick={() => setSelected(player)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-pitch-850"
                >
                  <PlayerAvatar name={player.name} avatarUrl={player.avatar_url} />
                  <span className="font-semibold">{player.name}</span>
                </button>
              </li>
            ))}
            {matches.length === 0 ? (
              <li className="px-4 py-3 text-sm text-chalk-faint">No player matches “{query}”.</li>
            ) : null}
          </ul>
        )}

        <Link href="/join" className="text-center text-sm font-semibold text-lime underline-offset-4 hover:underline">
          I&apos;m new
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="playerId" value={selected.id} />

      <div className="flex items-center gap-3 rounded-2xl border border-pitch-700 bg-pitch-900 px-4 py-3">
        <PlayerAvatar name={selected.name} avatarUrl={selected.avatar_url} size="lg" />
        <div className="flex-1">
          <p className="text-lg font-bold">{selected.name}</p>
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="text-sm text-chalk-faint underline-offset-4 hover:underline"
          >
            Not you?
          </button>
        </div>
      </div>

      <div>
        <p className="mb-2 text-lg font-bold">Enter PIN</p>
        <PinInput key={failures} autoFocus />
      </div>

      {state.ok === false ? <Alert tone="error">{state.error}</Alert> : null}

      <SubmitButton size="lg" pendingLabel="Checking…">
        Continue
      </SubmitButton>

      <Link href="/join" className="text-center text-sm font-semibold text-chalk-faint underline-offset-4 hover:underline">
        I&apos;m new
      </Link>
    </form>
  );
}
