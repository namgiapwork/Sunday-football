"use client";

import { useState } from "react";
import type { SizeBalance } from "@/lib/teams/summarise";

/**
 * Called out separately from the other warnings because it is the direct result
 * of the organiser's last move — taking a player out of one team always leaves
 * it short and the other over, and "uneven: 9 / 8 / 7 / 6" does not say which.
 *
 * It reappears whenever the imbalance changes, so dismissing it after one move
 * does not hide the next.
 */
export function SizeBalanceNotice({ balance }: { balance: SizeBalance }) {
  const [dismissed, setDismissed] = useState<string | null>(null);

  if (balance.even || !balance.message) return null;
  if (dismissed === balance.message) return null;

  return (
    <div
      role="status"
      className="sticky top-14 z-20 rounded-2xl border border-kit-yellow/50 bg-pitch-900 px-4 py-3 shadow-lg"
    >
      <div className="flex items-start gap-3">
        <span aria-hidden className="text-lg leading-none">
          ⚖️
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-kit-yellow">Teams are uneven</p>
          <p className="mt-0.5 text-sm leading-snug text-chalk-dim">{balance.message}</p>

          <ul className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
            {balance.over.map((team) => (
              <li key={team.name} className="rounded-md bg-kit-red/15 px-2 py-1 text-kit-red">
                {team.name} +{team.excess}
              </li>
            ))}
            {balance.under.map((team) => (
              <li key={team.name} className="rounded-md bg-kit-blue/15 px-2 py-1 text-kit-blue">
                {team.name} −{team.shortfall}
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          onClick={() => setDismissed(balance.message)}
          aria-label="Dismiss"
          className="shrink-0 rounded-lg px-2 py-1 text-chalk-faint hover:bg-pitch-800 hover:text-chalk"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
