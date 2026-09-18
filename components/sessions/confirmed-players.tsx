"use client";

import { useState } from "react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import type { SignupEntry } from "@/lib/data/sessions";

/** Names and faces only — no ratings are ever shown to other players (spec §76). */
export function ConfirmedPlayers({ signups }: { signups: SignupEntry[] }) {
  const [open, setOpen] = useState(false);
  const confirmed = signups.filter((s) => s.status === "confirmed");
  const maybe = signups.filter((s) => s.status === "maybe");

  if (confirmed.length === 0 && maybe.length === 0) return null;

  return (
    <section className="px-5 pb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-2xl border border-pitch-700
          bg-pitch-900 px-4 py-3 text-left font-semibold hover:bg-pitch-850"
      >
        <span>View confirmed players</span>
        <span aria-hidden className={`text-chalk-faint transition-transform ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {open ? (
        <div className="mt-3 flex flex-col gap-4">
          <Group title={`Playing (${confirmed.length})`} entries={confirmed} />
          {maybe.length > 0 ? <Group title={`Maybe (${maybe.length})`} entries={maybe} muted /> : null}
        </div>
      ) : null}
    </section>
  );
}

function Group({ title, entries, muted }: { title: string; entries: SignupEntry[]; muted?: boolean }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-chalk-faint">{title}</h3>
      <ul className="flex flex-wrap gap-2">
        {entries.map((entry) => (
          <li
            key={entry.playerId}
            className={`flex items-center gap-2 rounded-full border border-pitch-700 bg-pitch-900 py-1 pl-1 pr-3
              ${muted ? "opacity-60" : ""}`}
          >
            <PlayerAvatar name={entry.name} avatarUrl={entry.avatarUrl} size="sm" />
            <span className="text-sm font-semibold">{entry.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
