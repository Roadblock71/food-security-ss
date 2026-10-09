"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import countiesJson from "@/data/counties.json";
import RiskGauge from "@/components/RiskGauge";
import MetricCard from "@/components/MetricCard";
import CountyCard from "@/components/CountyCard";
import StateBreakdown from "@/components/StateBreakdown";
import { useWatchlist, countyKey } from "@/components/Watchlist";
import {
  IconMap, IconTrend, IconAlert, IconEye, IconArrow,
} from "@/components/Icons";

interface RawCounty {
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

interface Prediction { probability: number; band: string }
interface ScoredCounty extends RawCounty { probability: number; band: string }

const COUNTIES = countiesJson as RawCounty[];
const STATES = Array.from(new Set(COUNTIES.map((c) => c.state))).sort();

export default function Dashboard() {
  const [scored, setScored] = useState<ScoredCounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState<string>("All states");
  const [tab, setTab] = useState<"all" | "warnings" | "watching">("all");

  const { watched, toggle, hydrated } = useWatchlist();

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
        setScored(COUNTIES.map((c, i) => ({
          ...c,
          probability: preds[i].probability,
          band: preds[i].band,
        })));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Aggregates
  const national = useMemo(() => {
    if (!scored.length) return { avg: 0, veryHigh: 0, high: 0, lowMod: 0 };
    const avg = scored.reduce((s, c) => s + c.probability, 0) / scored.length;
    return {
      avg,
      veryHigh: scored.filter((c) => c.probability >= 0.85).length,
      high: scored.filter((c) => c.probability >= 0.60 && c.probability < 0.85).length,
      lowMod: scored.filter((c) => c.probability < 0.60).length,
    };
  }, [scored]);

  const stateRows = useMemo(() => {
    const map = new Map<string, ScoredCounty[]>();
    scored.forEach((c) => {
      if (!map.has(c.state)) map.set(c.state, []);
      map.get(c.state)!.push(c);
    });
    return Array.from(map.entries()).map(([state, list]) => ({
      state,
      counties: list.length,
      avgRisk: list.reduce((s, c) => s + c.probability, 0) / list.length,
      veryHigh: list.filter((c) => c.probability >= 0.85).length,
      highRisk: list.filter((c) => c.probability >= 0.60 && c.probability < 0.85).length,
    }));
  }, [scored]);

  // County list — filtered by tab + state dropdown, then sorted by risk desc
  const visibleCounties = useMemo(() => {
    let base = scored;
    if (tab === "warnings") base = base.filter((c) => c.probability >= 0.85);
    if (tab === "watching")
      base = base.filter((c) => watched.has(countyKey(c.state, c.county)));
    if (stateFilter !== "All states")
      base = base.filter((c) => c.state === stateFilter);
    return [...base].sort((a, b) => b.probability - a.probability);
  }, [scored, stateFilter, tab, watched]);

  const watchingCount = hydrated ? watched.size : 0;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      {/* ─── Hero ─────────────────────────────────────────────── */}
      <section className="grid gap-6 rounded-3xl border border-[#E7E5E0] bg-white p-6 shadow-sm sm:p-8 md:grid-cols-[minmax(0,1fr)_320px] md:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#1E3A8A]">
            National command view · 2026-04
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Food security intelligence{" "}
            <span className="text-[#1E3A8A]">for South Sudan</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-[#57534E] sm:text-base">
            Live risk scores for all 79 counties, aggregated from historical
            IPC context and prior-period cereal data. An early-warning
            complement to the IPC&rsquo;s expert-led process.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/predict"
              className="inline-flex items-center gap-2 rounded-lg bg-[#1E3A8A] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1E40AF]"
            >
              Run an assessment <IconArrow className="h-4 w-4" />
            </Link>
            <Link
              href="/map"
              className="inline-flex items-center gap-2 rounded-lg border border-[#E7E5E0] bg-white px-5 py-2.5 text-sm font-medium hover:bg-[#F8F7F4]"
            >
              <IconMap className="h-4 w-4" /> View risk atlas
            </Link>
          </div>
        </div>

        <div className="flex justify-center md:justify-end">
          {loading ? (
            <div className="h-[200px] w-[200px] animate-pulse rounded-full bg-[#F1F0EC]" />
          ) : (
            <RiskGauge value={national.avg} label="National average risk" />
          )}
        </div>
      </section>

      {/* ─── KPI tiles ────────────────────────────────────────── */}
      <section className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <MetricCard
          icon={<IconAlert className="h-4 w-4" />}
          label="Very high"
          value={loading ? "—" : String(national.veryHigh)}
          sub="≥ 85% predicted risk"
          accent="bg-[#FEF2F2] text-[#991B1B]"
          bar={loading ? 0 : national.veryHigh / Math.max(1, scored.length)}
          barColor="#B91C1C"
        />
        <MetricCard
          icon={<IconTrend className="h-4 w-4" />}
          label="High risk"
          value={loading ? "—" : String(national.high)}
          sub="60 – 85% predicted"
          accent="bg-[#FFF7ED] text-[#9A3412]"
          bar={loading ? 0 : national.high / Math.max(1, scored.length)}
          barColor="#EA580C"
        />
        <MetricCard
          icon={<IconEye className="h-4 w-4" />}
          label="In watchlist"
          value={hydrated ? String(watchingCount) : "—"}
          sub="Close-monitoring list"
          accent="bg-[#FEF3C7] text-[#B45309]"
        />
        <MetricCard
          icon={<IconTrend className="h-4 w-4" />}
          label="Validation AUC"
          value="0.964"
          sub="Zindi public leaderboard"
          accent="bg-[#EEF2FF] text-[#1E3A8A]"
          bar={0.964}
          barColor="#1E3A8A"
        />
      </section>

      {/* ─── County explorer ─────────────────────────────────── */}
      <section className="mt-8 rounded-3xl border border-[#E7E5E0] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Counties
            </h2>
            <p className="mt-1 text-xs text-[#57534E] sm:text-sm">
              {loading
                ? "Scoring all 79 counties…"
                : `${visibleCounties.length} of ${scored.length} counties`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="rounded-md border border-[#E7E5E0] bg-white px-3 py-1.5 text-xs outline-none focus:border-[#1E3A8A] focus:ring-1 focus:ring-[#1E3A8A]/30"
            >
              <option>All states</option>
              {STATES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {(
            [
              { id: "all", label: "All counties", icon: IconMap },
              { id: "warnings", label: "Early warnings", icon: IconAlert },
              { id: "watching", label: "Close monitoring", icon: IconEye },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "border-[#1E3A8A] bg-[#1E3A8A] text-white"
                    : "border-[#E7E5E0] bg-white text-[#57534E] hover:bg-[#F8F7F4]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
                {t.id === "warnings" && national.veryHigh > 0 && (
                  <span className={`rounded-full px-1.5 text-[10px] ${active ? "bg-white/25" : "bg-[#FEF2F2] text-[#991B1B]"}`}>
                    {national.veryHigh}
                  </span>
                )}
                {t.id === "watching" && watchingCount > 0 && (
                  <span className={`rounded-full px-1.5 text-[10px] ${active ? "bg-white/25" : "bg-[#FEF3C7] text-[#B45309]"}`}>
                    {watchingCount}
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
            {visibleCounties.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-[#E7E5E0] p-10 text-center text-sm text-[#78716C]">
                {tab === "watching" && "Your watchlist is empty. Star counties to add them here."}
                {tab === "warnings" && "No counties are currently flagged as very high risk."}
                {tab === "all" && "No counties match the current filter."}
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {visibleCounties.map((c) => (
                  <CountyCard
                    key={`${c.state}-${c.county}`}
                    state={c.state}
                    county={c.county}
                    probability={c.probability}
                    band={c.band}
                    watched={hydrated && watched.has(countyKey(c.state, c.county))}
                    onToggleWatch={() => toggle(countyKey(c.state, c.county))}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* ─── State analytics ─────────────────────────────────── */}
      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-[#E7E5E0] bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold tracking-tight">
            State risk profile
          </h2>
          <p className="mt-1 text-xs text-[#57534E] sm:text-sm">
            Average predicted probability per state.
          </p>
          <div className="mt-5">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded bg-[#F1F0EC]" />
                ))}
              </div>
            ) : (
              <StateBreakdown rows={stateRows} />
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-[#E7E5E0] bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold tracking-tight">
            Early warning &amp; response
          </h2>
          <p className="mt-1 text-xs text-[#57534E] sm:text-sm">
            Counties the model flags for closer assessment.
          </p>

          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#991B1B]">
                  <IconAlert className="h-4 w-4" />
                  Early warning
                </div>
                <span className="font-mono text-2xl font-semibold text-[#991B1B]">
                  {loading ? "—" : national.veryHigh}
                </span>
              </div>
              <p className="mt-2 text-xs text-[#7F1D1D]">
                Counties with predicted risk ≥ 85%. Prioritise for field
                verification and resource pre-positioning.
              </p>
              <button
                type="button"
                onClick={() => setTab("warnings")}
                className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-[#991B1B] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#7F1D1D]"
              >
                <IconArrow className="h-3.5 w-3.5" /> Review flagged counties
              </button>
            </div>

            <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#92400E]">
                  <IconEye className="h-4 w-4" />
                  Close monitoring
                </div>
                <span className="font-mono text-2xl font-semibold text-[#92400E]">
                  {hydrated ? watchingCount : "—"}
                </span>
              </div>
              <p className="mt-2 text-xs text-[#78350F]">
                Counties you have starred. Persisted in this browser only.
              </p>
              <button
                type="button"
                onClick={() => setTab("watching")}
                className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-[#B45309] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#92400E]"
              >
                <IconArrow className="h-3.5 w-3.5" /> Open watchlist
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10 rounded-xl border border-[#E7E5E0] bg-[#F8F7F4] p-5 text-sm text-[#57534E]">
        <p className="font-medium text-[#1C1917]">Disclaimer</p>
        <p className="mt-1">
          This tool provides an early-warning signal between formal IPC
          assessment cycles. It is not a replacement for IPC classification and
          should be used alongside expert analysis.
        </p>
      </section>
    </main>
  );
}