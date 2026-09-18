"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { AttendanceSummary } from "@/lib/data/sessions";

type Counts = Pick<AttendanceSummary, "confirmed" | "maybe" | "declined">;

/**
 * Live confirmed count. Subscribes only to this session's signups (spec §25:
 * scoped subscriptions, not a firehose) and falls back to the server-rendered
 * number if realtime is unavailable.
 */
export function AttendanceCounter({
  sessionId,
  initial,
}: {
  sessionId: string;
  initial: AttendanceSummary;
}) {
  const [live, setLive] = useState<Counts | null>(null);

  // When the server sends fresher numbers, they win over anything realtime saw.
  const [lastFromServer, setLastFromServer] = useState(initial);
  if (lastFromServer !== initial) {
    setLastFromServer(initial);
    setLive(null);
  }

  useEffect(() => {
    const supabase = supabaseBrowser();

    async function refresh() {
      const { data } = await supabase.from("signups").select("status").eq("session_id", sessionId);
      if (!data) return;

      const counts: Counts = { confirmed: 0, maybe: 0, declined: 0 };
      for (const row of data) counts[row.status as keyof Counts] += 1;
      setLive(counts);
    }

    const channel = supabase
      .channel(`signups:${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "signups", filter: `session_id=eq.${sessionId}` },
        refresh,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const summary: AttendanceSummary = live
    ? {
        ...initial,
        ...live,
        noResponse: Math.max(0, initial.invited - live.confirmed - live.maybe - live.declined),
      }
    : initial;

  return (
    <section className="px-5 py-6" aria-live="polite">
      <p className="tabular text-5xl font-black leading-none tracking-tight">
        {summary.confirmed}
        <span className="ml-2 text-xl font-bold text-chalk-dim">
          {summary.confirmed === 1 ? "player confirmed" : "players confirmed"}
        </span>
      </p>

      <dl className="mt-3 flex gap-4 text-sm text-chalk-faint">
        <div className="flex gap-1">
          <dt>Maybe</dt>
          <dd className="tabular font-bold text-chalk-dim">{summary.maybe}</dd>
        </div>
        <div className="flex gap-1">
          <dt>Out</dt>
          <dd className="tabular font-bold text-chalk-dim">{summary.declined}</dd>
        </div>
        <div className="flex gap-1">
          <dt>No reply</dt>
          <dd className="tabular font-bold text-chalk-dim">{summary.noResponse}</dd>
        </div>
      </dl>
    </section>
  );
}
