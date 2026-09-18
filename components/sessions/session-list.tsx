"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { setSignupAction } from "@/app/actions/signup";
import { IDLE } from "@/lib/actions/result";
import { signupClosedReason, signupIsOpen, teamsAwaitingReveal, teamsVisible } from "@/lib/sessions/state";
import { formatDeadline, formatSessionDate, formatTimeRange } from "@/lib/time/group-time";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Alert } from "@/components/ui/alert";
import { PlayerAvatar } from "@/components/players/player-avatar";
import type { Participant, RosterEntry, UpcomingSession } from "@/lib/data/sessions";
import type { SignupStatus } from "@/types/database";

/**
 * Every Sunday a player can answer for, soonest first. The nearest one is the
 * big card because that is what most visits are about; the rest are compact so
 * somebody planning ahead can tick several at once.
 */
export function SessionList({
  sessions,
  roster,
  timezone,
}: {
  sessions: UpcomingSession[];
  roster: RosterEntry[];
  timezone: string;
}) {
  const [live, setLive] = useState(sessions);

  // Server data wins whenever it arrives.
  const [lastFromServer, setLastFromServer] = useState(sessions);
  if (lastFromServer !== sessions) {
    setLastFromServer(sessions);
    setLive(sessions);
  }

  const ids = sessions.map((s) => s.session.id).join(",");

  useEffect(() => {
    if (!ids) return;
    const supabase = supabaseBrowser();
    const sessionIds = ids.split(",");

    const byId = new Map(roster.map((p) => [p.id, p]));

    async function refresh() {
      const { data } = await supabase
        .from("signups")
        .select("session_id, player_id, status")
        .in("session_id", sessionIds);
      if (!data) return;

      setLive((current) =>
        current.map((entry) => {
          const tally = { confirmed: 0, maybe: 0, declined: 0 };
          const participants: Participant[] = [];

          for (const row of data) {
            if (row.session_id !== entry.session.id) continue;
            tally[row.status as keyof typeof tally] += 1;

            const player = byId.get(row.player_id);
            if (player && row.status !== "declined") {
              participants.push({
                playerId: player.id,
                name: player.name,
                avatarUrl: player.avatarUrl,
                status: row.status as Participant["status"],
              });
            }
          }

          participants.sort((a, b) =>
            a.status !== b.status ? (a.status === "confirmed" ? -1 : 1) : a.name.localeCompare(b.name),
          );

          return {
            ...entry,
            summary: {
              ...entry.summary,
              ...tally,
              noResponse: Math.max(0, entry.summary.invited - tally.confirmed - tally.maybe - tally.declined),
            },
            participants,
          };
        }),
      );
    }

    // One subscription for the whole list; the group is small enough that
    // filtering per session would cost more channels than it saves traffic.
    const channel = supabase
      .channel(`signups:upcoming:${sessionIds[0]}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "signups" }, refresh)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [ids, roster]);

  if (live.length === 0) {
    return (
      <div className="px-5 py-8">
        <Alert tone="info">
          No Sundays are scheduled yet. The organisers will add some soon — you will see the next four
          here.
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-5 pb-8">
      {live.map((entry, index) => (
        <SessionCard key={entry.session.id} entry={entry} timezone={timezone} featured={index === 0} />
      ))}
      <p className="pt-2 text-center text-xs text-chalk-faint">
        Showing the next {live.length === 1 ? "Sunday" : `${live.length} Sundays`}. Answer for as many as you like.
      </p>
    </div>
  );
}

function SessionCard({
  entry,
  timezone,
  featured,
}: {
  entry: UpcomingSession;
  timezone: string;
  featured: boolean;
}) {
  const { session, summary, mySignup, participants } = entry;
  const [state, action] = useActionState(setSignupAction, IDLE);
  const [pressed, setPressed] = useState<SignupStatus | null>(null);
  // Opened by default on the nearest Sunday once you have answered.
  const [showPlayers, setShowPlayers] = useState(featured && mySignup !== null);

  const open = signupIsOpen(session);
  const cancelled = session.status === "cancelled";
  const venueName = session.venue?.name ?? session.venue_name_snapshot;

  return (
    <section
      className={`overflow-hidden rounded-3xl border ${
        featured ? "border-pitch-600 bg-pitch-900" : "border-pitch-800 bg-pitch-900/60"
      }`}
    >
      <header className="px-5 pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className={`font-black tracking-tight ${featured ? "text-2xl" : "text-lg"}`}>
            {formatSessionDate(session.date, timezone)}
          </h2>
          <StatusChip status={mySignup} cancelled={cancelled} />
        </div>
        <p className="tabular mt-0.5 text-sm text-chalk-dim">
          {formatTimeRange(session.start_time, session.end_time)}
          {venueName ? ` · ${venueName}` : ""}
          {session.location_notes ? ` · ${session.location_notes}` : ""}
        </p>
      </header>

      {cancelled ? (
        <div className="px-5 py-4">
          <Alert tone="error">Cancelled — {session.cancellation_reason}</Alert>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setShowPlayers((v) => !v)}
            aria-expanded={showPlayers}
            disabled={participants.length === 0}
            className="flex w-full items-baseline gap-2 px-5 pt-3 text-left disabled:cursor-default"
          >
            <span className={`tabular font-black ${featured ? "text-4xl" : "text-2xl"}`}>
              {summary.confirmed}
            </span>
            <span className="text-sm font-semibold text-chalk-dim">playing</span>
            {participants.length > 0 ? (
              <span aria-hidden className={`text-chalk-faint transition-transform ${showPlayers ? "rotate-180" : ""}`}>
                ▾
              </span>
            ) : null}
            <span className="ml-auto text-xs text-chalk-faint">
              {summary.maybe} maybe · {summary.declined} out
            </span>
          </button>

          {showPlayers && participants.length > 0 ? (
            <ul className="flex flex-wrap gap-2 px-5 pt-3">
              {participants.map((player) => (
                <li
                  key={player.playerId}
                  className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 ${
                    player.status === "maybe"
                      ? "border-kit-yellow/30 opacity-70"
                      : "border-pitch-700"
                  }`}
                >
                  <PlayerAvatar name={player.name} avatarUrl={player.avatarUrl} size="sm" />
                  <span className="text-sm font-semibold">{player.name}</span>
                  {player.status === "maybe" ? (
                    <span className="text-[10px] font-bold text-kit-yellow">maybe</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          {open ? (
            <form action={action} className="px-5 pt-3 pb-4">
              <input type="hidden" name="sessionId" value={session.id} />
              <div className="grid grid-cols-3 gap-2">
                <Choice value="confirmed" current={mySignup} pressed={pressed} onPress={setPressed} tone="in" featured={featured}>
                  I&apos;m in
                </Choice>
                <Choice value="maybe" current={mySignup} pressed={pressed} onPress={setPressed} tone="maybe" featured={featured}>
                  Maybe
                </Choice>
                <Choice value="declined" current={mySignup} pressed={pressed} onPress={setPressed} tone="out" featured={featured}>
                  Can&apos;t
                </Choice>
              </div>

              <p className="mt-2 text-xs text-chalk-faint">
                Closes {formatDeadline(session.signup_deadline, timezone)}
              </p>

              {state.ok === false ? (
                <div className="mt-2">
                  <Alert tone="error">{state.error}</Alert>
                </div>
              ) : null}
            </form>
          ) : (
            <div className="px-5 pt-3 pb-4">
              <p className="text-sm text-chalk-faint">{signupClosedReason(session)}</p>
            </div>
          )}

          {teamsVisible(session) ? (
            <Link
              href="/teams"
              className="flex items-center justify-between border-t border-pitch-800 bg-lime/10 px-5 py-3"
            >
              <span className="font-bold text-lime">Teams are ready</span>
              <span aria-hidden className="text-lime">
                →
              </span>
            </Link>
          ) : session.teams_reveal_at && new Date(session.teams_reveal_at) > new Date() ? (
            <p className="border-t border-pitch-800 px-5 py-3 text-sm text-chalk-faint">
              {teamsAwaitingReveal(session) ? "Teams are picked — they go up" : "Teams revealed"}{" "}
              {formatDeadline(session.teams_reveal_at, timezone)}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}

function StatusChip({ status, cancelled }: { status: SignupStatus | null; cancelled: boolean }) {
  if (cancelled) return <span className="text-xs font-bold text-kit-red">Cancelled</span>;
  if (status === "confirmed") return <span className="text-xs font-bold text-kit-green">You&apos;re in ✅</span>;
  if (status === "maybe") return <span className="text-xs font-bold text-kit-yellow">Maybe</span>;
  if (status === "declined") return <span className="text-xs font-bold text-chalk-faint">Not playing</span>;
  return <span className="text-xs font-bold text-chalk-faint">No answer yet</span>;
}

const TONES = {
  in: { on: "bg-lime text-pitch-950", off: "bg-pitch-800 text-chalk hover:bg-pitch-700" },
  maybe: { on: "bg-kit-yellow/20 text-kit-yellow", off: "bg-pitch-800 text-chalk-dim hover:bg-pitch-700" },
  out: { on: "bg-kit-red/20 text-kit-red", off: "bg-pitch-800 text-chalk-dim hover:bg-pitch-700" },
} as const;

function Choice({
  value,
  current,
  pressed,
  onPress,
  tone,
  featured,
  children,
}: {
  value: SignupStatus;
  current: SignupStatus | null;
  pressed: SignupStatus | null;
  onPress: (status: SignupStatus) => void;
  tone: keyof typeof TONES;
  featured: boolean;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  const selected = current === value;

  return (
    <button
      type="submit"
      name="status"
      value={value}
      disabled={pending}
      onClick={() => onPress(value)}
      className={`rounded-xl font-bold transition-colors disabled:opacity-50 ${
        featured ? "h-14 text-lg" : "h-11 text-sm"
      } ${selected ? TONES[tone].on : TONES[tone].off}`}
    >
      {pending && pressed === value ? "…" : children}
    </button>
  );
}
