"use client";
import { IconStar, IconEye, IconAlert } from "./Icons";

interface Props {
  state: string;
  county: string;
  probability: number;
  band: string;
  watched?: boolean;
  onToggleWatch?: () => void;
  dense?: boolean;
}

const BAND_COLOR: Record<string, string> = {
  Low: "#16A34A",
  Moderate: "#F59E0B",
  High: "#EA580C",
  "Very High": "#B91C1C",
};

const BAND_TINT: Record<string, string> = {
  Low: "bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]",
  Moderate: "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]",
  High: "bg-[#FFF7ED] text-[#9A3412] border-[#FED7AA]",
  "Very High": "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]",
};

export default function CountyCard({
  state,
  county,
  probability,
  band,
  watched,
  onToggleWatch,
  dense = false,
}: Props) {
  const color = BAND_COLOR[band] ?? "#78716C";
  const pct = Math.max(0, Math.min(1, probability)) * 100;

  return (
    <div
      className={`group rounded-2xl border border-[#E7E5E0] bg-white ${
        dense ? "p-3" : "p-4"
      } transition-colors hover:border-[#1E3A8A]/30`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-[#1C1917]">
            {county}
          </div>
          <div className="mt-0.5 truncate text-[11px] text-[#78716C]">
            {state}
          </div>
        </div>

        {onToggleWatch && (
          <button
            type="button"
            onClick={onToggleWatch}
            aria-label={watched ? "Remove from watchlist" : "Add to watchlist"}
            className={`grid h-7 w-7 shrink-0 place-items-center rounded-md transition-colors ${
              watched
                ? "bg-[#FEF3C7] text-[#B45309]"
                : "text-[#A8A29E] hover:bg-[#F1F0EC]"
            }`}
          >
            <IconStar className="h-3.5 w-3.5" filled={!!watched} />
          </button>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span
          className="font-mono text-2xl font-semibold tracking-tight"
          style={{ color }}
        >
          {pct.toFixed(1)}%
        </span>
        <span
          className={`inline-block rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider ${
            BAND_TINT[band] ?? "border-[#E7E5E0] bg-[#F8F7F4] text-[#57534E]"
          }`}
        >
          {band}
        </span>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#F1F0EC]">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>

      {band === "Very High" && (
        <div className="mt-3 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-[#991B1B]">
          <IconAlert className="h-3 w-3" />
          Early warning
        </div>
      )}
      {watched && band !== "Very High" && (
        <div className="mt-3 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-[#B45309]">
          <IconEye className="h-3 w-3" />
          Close monitoring
        </div>
      )}
    </div>
  );
}