import { ReactNode } from "react";

interface Props {
  icon?: ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: string;    // tailwind color class for the icon bg
  bar?: number;       // 0–1, optional progress bar
  barColor?: string;
}

export default function MetricCard({
  icon,
  label,
  value,
  sub,
  accent = "bg-[#1E3A8A]/10 text-[#1E3A8A]",
  bar,
  barColor = "#1E3A8A",
}: Props) {
  return (
    <div className="rounded-2xl border border-[#E7E5E0] bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between">
        {icon && (
          <span
            className={`grid h-8 w-8 place-items-center rounded-lg ${accent}`}
          >
            {icon}
          </span>
        )}
        <span className="text-[10px] font-medium uppercase tracking-wider text-[#78716C]">
          {label}
        </span>
      </div>

      <div className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
        {value}
      </div>

      {sub && <div className="mt-1 text-xs text-[#78716C]">{sub}</div>}

      {typeof bar === "number" && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#F1F0EC]">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.max(0, Math.min(1, bar)) * 100}%`,
              background: barColor,
            }}
          />
        </div>
      )}
    </div>
  );
}