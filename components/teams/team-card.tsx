import { PlayerAvatar } from "@/components/players/player-avatar";
import { PositionBadge, RatingBadge } from "@/components/players/position-badge";
import { kitColour } from "./team-colours";
import { TacticsBoard } from "./tactics-board";
import type { TeamView } from "@/lib/data/teams";

/**
 * `showRatings` is admin-only. The player-facing pages are handed teams whose
 * rating snapshots were never loaded, so there is nothing to leak (spec §76).
 */
export function TeamCard({
  team,
  highlight = false,
  showRatings = false,
}: {
  team: TeamView;
  highlight?: boolean;
  showRatings?: boolean;
}) {
  const kit = kitColour(team.colour);

  return (
    <section
      className={`overflow-hidden rounded-2xl border bg-pitch-900 ${
        highlight ? `${kit.border} ring-1 ring-inset ${kit.border}` : "border-pitch-700"
      }`}
    >
      <header className={`flex items-baseline justify-between px-4 py-3 ${kit.soft}`}>
        <h3 className="flex items-center gap-2 text-lg font-black tracking-tight">
          <span aria-hidden className={`size-3 rounded-full ${kit.dot}`} />
          <span className={kit.text}>{team.name}</span>
          <span className="text-sm font-semibold text-chalk-faint">{team.members.length}</span>
        </h3>
        {showRatings && team.averageRating !== null ? (
          <span className="tabular text-sm text-chalk-faint">
            avg <span className="font-bold text-chalk-dim">{team.averageRating}</span>
          </span>
        ) : null}
      </header>

      <ul className="divide-y divide-pitch-850">
        {team.members.map((member) => (
          <li
            key={member.id}
            className={`flex items-center gap-3 px-4 py-2.5 ${member.isAvailable ? "" : "opacity-50"}`}
          >
            <PlayerAvatar name={member.name} avatarUrl={member.avatarUrl} size="sm" />
            <span className="flex-1 font-semibold">
              {member.name}
              {member.isAvailable ? null : (
                <span className="ml-2 text-xs font-normal text-kit-red">dropped out</span>
              )}
            </span>
            <PositionBadge position={member.assignedPosition} />
            {showRatings && member.ratingSnapshot !== null ? (
              <RatingBadge rating={member.ratingSnapshot} />
            ) : null}
          </li>
        ))}
      </ul>

      <details className="group border-t border-pitch-700">
        <summary
          className={`flex min-h-12 cursor-pointer list-none items-center justify-between px-4 py-3 text-sm
            font-bold hover:bg-pitch-850 [&::-webkit-details-marker]:hidden ${kit.text}`}
        >
          Possible lineup
          <span aria-hidden className="text-chalk-faint transition-transform group-open:rotate-180">
            ▾
          </span>
        </summary>
        <div className="px-3 pb-3">
          <p className="mb-3 rounded-xl border border-pitch-700 bg-pitch-850 px-3 py-2 text-xs leading-snug text-chalk-dim">
            This lineup is assigned automatically from everyone&apos;s positions. The organisers can change it,
            so talk it through with your team.
          </p>
          <TacticsBoard team={team} showRatings={showRatings} />
        </div>
      </details>
    </section>
  );
}
