import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "../../../lib/trpc";

interface Props {
  boardId: string;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border/70 bg-surface/70 p-3">
      <span className="text-2xl font-bold leading-none text-foreground">{value}</span>
      <span className="text-xs font-medium text-muted">{label}</span>
    </div>
  );
}

export function AnalyticsPanel({ boardId }: Props) {
  const trpc = useTRPC();
  const query = useQuery(trpc.analytics.boardSummary.queryOptions({ boardId }));
  const s = query.data;

  if (query.isLoading) {
    return <p className="text-sm text-muted">Loading...</p>;
  }
  if (!s) {
    return <p className="text-sm text-muted">No analytics available.</p>;
  }

  const maxCount = Math.max(1, ...s.cardsPerColumn.map((c) => c.count));
  const cycle = s.avgCycleTimeDays == null ? "-" : `${s.avgCycleTimeDays}d`;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label="Total cards" value={s.totalCards} />
        <Stat label="Overdue" value={s.overdueCount} />
        <Stat label="Avg cycle time" value={cycle} />
        <Stat label="Done last 7d" value={s.completedLast7} />
        <Stat label="Done last 30d" value={s.completedLast30} />
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
          Cards per list
        </h3>
        {s.cardsPerColumn.length === 0 ? (
          <p className="text-sm text-muted">No lists yet.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {s.cardsPerColumn.map((c) => (
              <div key={c.columnId} className="flex items-center gap-2 text-sm">
                <span className="w-28 shrink-0 truncate text-foreground/80" title={c.columnName}>
                  {c.columnName}
                </span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className="h-full rounded-full bg-indigo-500"
                    style={{ width: `${Math.round((c.count / maxCount) * 100)}%` }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right tabular-nums text-foreground/70">
                  {c.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
