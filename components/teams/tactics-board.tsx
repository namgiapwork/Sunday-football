import { PlayerAvatar } from "@/components/players/player-avatar";
import { RatingBadge } from "@/components/players/position-badge";
import { kitColour, type KitColour } from "./team-colours";
import { buildLineup, type Lineup } from "@/lib/teams/formation";
import type { TeamMemberView, TeamView } from "@/lib/data/teams";
import type { PositionCode } from "@/lib/teams/positions";

type BoardPlayer = TeamMemberView & { position: PositionCode };

/**
 * Where each starting slot (see SLOT_LINES) sits on the pitch, as % from the left
 * and the top. Wingers hug the touchlines, and the two midfielders are staggered:
 * one pushed up beside the wingers, one sitting deeper.
 */
const SLOT_POSITIONS: { x: number; y: number }[] = [
  { x: 50, y: 91 }, // 0 goalkeeper
  { x: 30, y: 74 }, // 1 defender
  { x: 70, y: 74 }, // 2 defender
  { x: 50, y: 55 }, // 3 midfielder, deeper
  { x: 50, y: 33 }, // 4 midfielder, higher
  { x: 15, y: 30 }, // 5 winger, left
  { x: 85, y: 30 }, // 6 winger, right
  { x: 50, y: 9 }, // 7 striker
];

/**
 * The starting eight on a pitch, substitutes alongside. Ratings only render when
 * the caller was handed them, which player-facing pages never are.
 */
export function TacticsBoard({ team, showRatings = false }: { team: TeamView; showRatings?: boolean }) {
  const kit = kitColour(team.colour);
  const lineup = buildLineup<BoardPlayer>(
    team.members.map((m) => ({ ...m, position: m.assignedPosition, lineupSlot: m.lineupSlot })),
  );

  return (
    <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,3fr)] gap-3">
      <Pitch lineup={lineup} kit={kit} showRatings={showRatings} />
      <div>
        <h4 className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-chalk-faint">Substitutes</h4>
        {lineup.substitutes.length === 0 ? (
          <p className="text-sm text-chalk-faint">None</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {lineup.substitutes.map((member) => (
              <li key={member.id} className={`flex items-center gap-2 ${member.isAvailable ? "" : "opacity-50"}`}>
                <PlayerAvatar name={member.name} avatarUrl={member.avatarUrl} size="sm" />
                <span className="min-w-0 flex-1 text-sm font-semibold leading-tight">
                  <span className="block truncate">{member.name}</span>
                  {member.isAvailable ? (
                    <span className="text-[11px] font-normal text-chalk-faint">{member.assignedPosition}</span>
                  ) : (
                    <span className="text-[11px] font-normal text-kit-red">dropped out</span>
                  )}
                </span>
                {showRatings && member.ratingSnapshot !== null ? <RatingBadge rating={member.ratingSnapshot} /> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Pitch({
  lineup,
  kit,
  showRatings,
}: {
  lineup: Lineup<BoardPlayer>;
  kit: KitColour;
  showRatings: boolean;
}) {
  const slots = lineup.lines.flatMap((l) => l.players);

  return (
    <div
      role="group"
      aria-label="Possible lineup, 1-2-3-1-1"
      className={`relative h-[27rem] overflow-hidden rounded-xl border ${kit.border} bg-pitch-850`}
    >
      {/* Halfway line and penalty box, just enough to read as a pitch. */}
      <div aria-hidden className="absolute inset-x-0 top-[44%] border-t border-pitch-700" />
      <div aria-hidden className="absolute bottom-0 left-[22%] h-[24%] w-[56%] rounded-t-md border border-b-0 border-pitch-700" />

      {slots.map((member, slot) => {
        const { x, y } = SLOT_POSITIONS[slot];
        return (
          <div
            key={member?.id ?? `open-${slot}`}
            className="absolute flex w-[4.25rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 text-center"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            {member ? (
              <>
                <span className={`rounded-full ring-2 ${kit.ring}`}>
                  <PlayerAvatar name={member.name} avatarUrl={member.avatarUrl} size="md" />
                </span>
                <span className="w-full truncate text-xs font-bold leading-tight">{member.name}</span>
                <span className="text-[10px] font-semibold text-chalk-faint">
                  {member.assignedPosition}
                  {showRatings && member.ratingSnapshot !== null
                    ? ` · ${Math.round(member.ratingSnapshot * 10) / 10}`
                    : ""}
                </span>
              </>
            ) : (
              <>
                <span className="size-10 rounded-full border-2 border-dashed border-pitch-600" aria-hidden />
                <span className="text-[10px] font-semibold text-chalk-faint">Open</span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
