"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import countiesJson from "@/data/counties.json";
import historyJson from "@/data/county-history.json";
import CountyCard from "./CountyCard";
import { useWatchlist, countyKey } from "./Watchlist";
import { IconMap, IconAlert, IconEye } from "./Icons";

export interface RawCounty {
  state: string;
  county: string;
  population: number;
  start_year: number;
  start_month: number;
  prior_period_ipc_phase: string;
  prior_period_phase3plus_pct: number;
  prior_year_cereal_production_tonnes: number;
  prior_year_cereal_gap_tonnes: number;
}

export interface ScoredCounty extends RawCounty {
  probability: number;
  band: string;
}

interface Prediction { probability: number; band: string }

const COUNTIES = countiesJson as RawCounty[];

const HISTORY = historyJson as {
  counties: Record<
    string,
    { state: string; county: string; points: { period: string; pct: number }[] }
  >;
};

function trajectoryFor(state: string, county: string): number[] {
  const key = `${state}||${county}`;
  const entry = HISTORY.counties[key];
  return entry ? entry.points.map((p) => p.pct) : [];
}

const BAND_RANGES: Record<string, [number, number]> = {
  "very-high": [0.85, 1.01],
  "high":      [0.60, 0.85],
  "moderate":  [0.35, 0.60],
  "low":       [0,    0.35],
};

const BAND_LABEL: Record<string, string> = {
  "very-high": "Very high",
  "high":      "High",
  "moderate":  "Moderate",
  "low":       "Low",
};

const BAND_ACCENT: Record<string, string> = {
  "very-high": "border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]",
  "high":      "border-[#FED7AA] bg-[#FFF7ED] text-[#9A3412]",
  "moderate":  "border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]",
  "low":       "border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]",
};

interface Props {
  mode?: "all" | "alerts";
  onScored?: (scored: ScoredCounty[]) => void;
  showFilters?: boolean;
}

export default function CountyGrid({
  mode = "all",
  onScored,
  showFilters = true,
}: Props) {
  const [scored, setScored] = useState<ScoredCounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState<string>("All states");
  const [tab, setTab] = useState<"all" | "alerts" | "watching">(
    mode === "alerts" ? "alerts" : "all"
  );

  const { watched, toggle, hydrated } = useWatchlist();

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const bandParam = searchParams.get("band");
  const bandRange = bandParam ? BAND_RANGES[bandParam] ?? null : null;

  function clearBandFilter() {
    router.replace(pathname, { scroll: false });
  }

  useEffect(() => {
    (async () => {
      try {
        const mid = Math.ceil(COUNTIES.length / 2);
        const payloads = (arr: RawCounty[]) =>
          arr.map((c) => ({
            state: c.state, county: c.county,
            population: c.population,
            start_year: c.start_year, start_month: c.start_month,
            prior_period_ipc_phase: c.prior_period_ipc_phase,
            prior_period_phase3plus_pct: c.prior_period_phase3plus_pct,
            prior_year_cereal_production_tonnes: c.prior_year_cereal_production_tonnes,
            prior_year_cereal_gap_tonnes: c.prior_year_cereal_gap_tonnes,
          }));

        const [r1, r2] = await Promise.all([
          fetch("/api/predict_batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payloads(COUNTIES.slice(0, mid))),
          }),
          fetch("/api/predict_batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payloads(COUNTIES.slice(mid))),
          }),
        ]);
        if (!r1.ok) throw new Error(`Batch 1 HTTP ${r1.status}`);
        if (!r2.ok) throw new Error(`Batch 2 HTTP ${r2.status}`);

        const preds: Prediction[] = [...(await r1.json()), ...(await r2.json())];
        const joined = COUNTIES.map((c, i) => ({
          ...c,
          probability: preds[i].probability,
          band: preds[i].band,
        }));
        setScored(joined);
        onScored?.(joined);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const STATES = useMemo(
    () => Array.from(new Set(scored.map((c) => c.state))).sort(),
    [scored]
  );

  const inScope = useMemo(() => {
    if (stateFilter === "All states") return scored;
    return scored.filter((c) => c.state === stateFilter);
  }, [scored, stateFilter]);

  const alertsCount = inScope.filter((c) => c.probability >= 0.85).length;
  const watchingCount = hydrated
    ? inScope.filter((c) => watched.has(countyKey(c.state, c.county))).length
    : 0;

  const visible = useMemo(() => {
    let base = inScope;
    if (bandRange) {
      base = base.filter(
        (c) => c.probability >= bandRange[0] && c.probability < bandRange[1]
      );
    }
    if (tab === "alerts") base = base.filter((c) => c.probability >= 0.85);
    if (tab === "watching")
      base = base.filter((c) => watched.has(countyKey(c.state, c.county)));
    return [...base].sort((a, b) => b.probability - a.probability);
  }, [inScope, tab, watched, bandRange]);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Counties</h2>
          <p className="mt-1 text-xs text-[#57534E] sm:text-sm">
            {loading
              ? "Scoring all 79 counties…"
              : stateFilter === "All states"
                ? `${visible.length} of ${scored.length} counties`
                : `${visible.length} in ${stateFilter} (${inScope.length} total)`}
          </p>
        </div>

        {showFilters && !loading && (
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="rounded-md border border-[#EBE8E2] bg-white px-3 py-1.5 text-xs outline-none transition-colors focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]/30"
          >
            <option>All states</option>
            {STATES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        )}
      </div>

      {bandParam && bandRange && (
        <div className="mt-3">
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${
              BAND_ACCENT[bandParam] ?? "border-[#EBE8E2] bg-[#F8F7F4] text-[#57534E]"
            }`}
          >
            Band: {BAND_LABEL[bandParam] ?? bandParam}
            <button
              type="button"
              onClick={clearBandFilter}
              aria-label="Clear band filter"
              className="grid h-4 w-4 place-items-center rounded-full text-current opacity-60 transition-opacity hover:opacity-100"
            >
              <svg
                className="h-3 w-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </span>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-1.5">
        {(
          [
            { id: "all",      label: "All counties",     icon: IconMap },
            { id: "alerts",   label: "Priority alerts",  icon: IconAlert },
            { id: "watching", label: "Close monitoring", icon: IconEye },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          const badge =
            t.id === "alerts" ? alertsCount :
            t.id === "watching" ? watchingCount : 0;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "border-[#1E3A8A] bg-[#1E3A8A] text-white"
                  : "border-[#EBE8E2] bg-white text-[#57534E] hover:bg-[#F8F7F4]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
              {badge > 0 && (
                <span
                  className={`rounded-full px-1.5 text-[10px] ${
                    active
                      ? "bg-white/25"
                      : t.id === "alerts"
                      ? "bg-[#FEF2F2] text-[#991B1B]"
                      : "bg-[#FEF3C7] text-[#B45309]"
                  }`}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs text-[#991B1B]">
          <span className="font-medium">Could not load scores: </span>
          <span className="font-mono">{error}</span>
        </div>
      )}

      {loading && (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-[#F1F0EC]" />
          ))}
        </div>
      )}

      {!loading && !error && (
        <>
          {visible.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-[#EBE8E2] p-10 text-center text-sm text-[#78716C]">
              {tab === "watching" && "No starred counties in the current scope."}
              {tab === "alerts" && "No counties flagged as very high risk in the current scope."}
              {tab === "all" && "No counties match the current filter."}
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((c) => (
                <CountyCard
                  key={`${c.state}-${c.county}`}
                  state={c.state}
                  county={c.county}
                  probability={c.probability}
                  band={c.band}
                  trajectory={trajectoryFor(c.state, c.county)}
                  watched={hydrated && watched.has(countyKey(c.state, c.county))}
                  onToggleWatch={() => toggle(countyKey(c.state, c.county))}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}