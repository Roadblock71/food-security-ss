interface StateRow {
  state: string;
  counties: number;
  avgRisk: number;
  highRisk: number;
  veryHigh: number;
}

interface Props {
  rows: StateRow[];
}

function color(v: number): string {
  if (v < 0.35) return "#16A34A";
  if (v < 0.60) return "#F59E0B";
  if (v < 0.85) return "#EA580C";
  return "#B91C1C";
}

export default function StateBreakdown({ rows }: Props) {
  const sorted = [...rows].sort((a, b) => b.avgRisk - a.avgRisk);
  const max = Math.max(0.01, ...sorted.map((r) => r.avgRisk));

  return (
    <div className="space-y-3">
      {sorted.map((r) => {
        const c = color(r.avgRisk);
        return (
          <div key={r.state}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-sm font-medium text-[#1C1917]">
                {r.state}
              </span>
              <span className="shrink-0 text-xs text-[#78716C]">
                {r.counties} counties
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#F1F0EC]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(r.avgRisk / max) * 100}%`,
                    background: c,
                  }}
                />
              </div>
              <span
                className="w-12 shrink-0 text-right font-mono text-xs font-medium"
                style={{ color: c }}
              >
                {(r.avgRisk * 100).toFixed(0)}%
              </span>
            </div>
            <div className="mt-1 flex gap-3 text-[10px] text-[#78716C]">
              {r.veryHigh > 0 && (
                <span>
                  <span className="font-medium text-[#991B1B]">
                    {r.veryHigh}
                  </span>{" "}
                  very high
                </span>
              )}
              {r.highRisk > 0 && (
                <span>
                  <span className="font-medium text-[#9A3412]">
                    {r.highRisk}
                  </span>{" "}
                  high
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}