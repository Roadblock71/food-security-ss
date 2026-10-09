import Link from "next/link";
import { ReactNode } from "react";

interface Props {
  icon?: ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  bar?: number;
  barColor?: string;
  /** If present, the whole card becomes a link with a hover affordance. */
  href?: string;
}

export default function MetricCard({
  icon,
  label,
  value,
  sub,
  accent = "bg-[#1E3A8A]/10 text-[#1E3A8A]",
  bar,
  barColor = "#1E3A8A",
  href,
}: Props) {
  const inner = (
    <>
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
    </>
  );

  const base = "rounded-2xl border border-[#EBE8E2] bg-white p-4 sm:p-5";

  if (href) {
    return (
      <Link
        href={href}
        aria-label={`View ${label} counties`}
        className={`group relative block ${base} transition-all hover:border-[#0D9488]/50 hover:shadow-[0_2px_10px_rgba(13,148,136,0.10)]`}
      >
        {inner}
        <span className="pointer-events-none absolute right-3 top-3 text-[#0D9488] opacity-0 transition-opacity group-hover:opacity-100">
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </Link>
    );
  }

  return <div className={base}>{inner}</div>;
}