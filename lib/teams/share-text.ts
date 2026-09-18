import { kitColour } from "@/components/teams/team-colours";
import { formatShortDate } from "@/lib/time/group-time";
import type { TeamView } from "@/lib/data/teams";

/** The message the organiser pastes into Messenger. Positions, never ratings. */
export function buildShareText(
  teams: TeamView[],
  session: { date: string; start_time: string },
  options: { groupName: string; timezone: string; venue?: string | null; notes?: string | null },
): string {
  const lines: string[] = [
    options.groupName.toUpperCase(),
    `${formatShortDate(session.date, options.timezone).toUpperCase()} · ${session.start_time.slice(0, 5)}`,
  ];

  if (options.venue) {
    lines.push(options.notes ? `${options.venue} — ${options.notes}` : options.venue);
  }

  for (const team of teams) {
    const kit = kitColour(team.colour);
    lines.push("", `${kit.emoji} ${team.name.toUpperCase()}`);
    for (const member of team.members) {
      lines.push(`${member.name} — ${member.assignedPosition}${member.isAvailable ? "" : " (out)"}`);
    }
  }

  return lines.join("\n");
}
