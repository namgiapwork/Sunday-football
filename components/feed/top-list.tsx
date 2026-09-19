import type { StatTotal } from "@/lib/feed/top-stats";
import { Card, CardBody, SectionTitle } from "@/components/ui/card";

export function TopList({ title, rows, unit }: { title: string; rows: StatTotal[]; unit: string }) {
  return (
    <Card>
      <CardBody className="pt-4">
        <SectionTitle className="mb-3">{title}</SectionTitle>
        {rows.length === 0 ? (
          <p className="text-sm text-chalk-faint">Nobody on the board yet.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {rows.map((row, i) => (
              <li key={row.playerId} className="flex items-center gap-3">
                <span className="tabular w-5 text-sm font-bold text-chalk-faint">{i + 1}</span>
                <span className="flex-1 font-semibold">{row.name}</span>
                <span className="tabular text-lg font-black text-lime">
                  {row.total}
                  <span className="sr-only"> {unit}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardBody>
    </Card>
  );
}
