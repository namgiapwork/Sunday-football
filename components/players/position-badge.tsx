import { POSITION_LABELS, type PositionCode } from "@/lib/teams/positions";

export function PositionBadge({
  position,
  rank,
  className = "",
}: {
  position: PositionCode;
  rank?: number | null;
  className?: string;
}) {
  return (
    <span
      title={POSITION_LABELS[position]}
      className={`inline-flex items-center gap-1 rounded-md bg-pitch-700 px-1.5 py-0.5
        text-[11px] font-bold tracking-wide text-chalk-dim ${className}`}
    >
      {position}
      {rank ? <span className="text-chalk-faint">#{rank}</span> : null}
    </span>
  );
}

/** Ratings are private to the player and admins (spec §76) — never rendered for peers. */
export function RatingBadge({ rating }: { rating: number }) {
  const value = Math.round(rating * 10) / 10;
  const tone =
    value >= 8 ? "text-kit-green" : value >= 6 ? "text-lime" : value >= 4 ? "text-chalk-dim" : "text-chalk-faint";
  return <span className={`tabular text-sm font-bold ${tone}`}>{value}</span>;
}
