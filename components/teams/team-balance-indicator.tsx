import { Alert } from "@/components/ui/alert";
import type { ArrangementSummary } from "@/lib/teams/summarise";

/**
 * A single readable indicator, not a scientific measure (spec §12). It updates
 * after every manual move so the admin sees the cost of their own change.
 */
export function TeamBalanceIndicator({ summary }: { summary: ArrangementSummary }) {
  if (summary.balanceScore === null) return null;

  const tone =
    summary.balanceScore >= 90 ? "text-kit-green" : summary.balanceScore >= 75 ? "text-lime" : "text-kit-yellow";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4 rounded-2xl border border-pitch-700 bg-pitch-900 px-4 py-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-chalk-faint">Balance</p>
          <p className={`tabular text-3xl font-black leading-none ${tone}`}>
            {summary.balanceScore}
            <span className="text-base font-bold text-chalk-faint"> / 100</span>
          </p>
        </div>
        <dl className="ml-auto grid grid-cols-2 gap-x-5 gap-y-1 text-right text-xs">
          <dt className="text-chalk-faint">Rating spread</dt>
          <dd className="tabular font-bold">{summary.averageRatingSpread ?? "—"}</dd>
          <dt className="text-chalk-faint">First choice</dt>
          <dd className="tabular font-bold">
            {summary.firstChoiceCount}/{summary.playerCount}
          </dd>
        </dl>
      </div>

      {summary.warnings
        .filter((warning) => warning !== summary.sizeBalance.message)
        .map((warning) => (
          <Alert key={warning} tone="warning">
            {warning}
          </Alert>
        ))}
    </div>
  );
}
