"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import countiesJson from "@/data/counties.json";
import RiskGauge from "@/components/RiskGauge";
import MetricCard from "@/components/MetricCard";
import {
  IconAlert, IconTrend, IconEye, IconArrow, IconGauge, IconMap,
} from "@/components/Icons";
import { useWatchlist } from "@/components/Watchlist";

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

const BAND_COLOR: Record<string, string> = {
  Low: "#16A34A",
  Moderate: "#F59E0B",
  High: "#EA580C",
  "Very High": "#B91C1C",
};

export default function Dashboard() {
  const [scored, setScored] = useState<ScoredCounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { watched, hydrated } = useWatchlist();

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
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payloads(COUNTIES.slice(0, mid))),
          }),
          fetch("/api/predict_batch", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payloads(COUNTIES.slice(mid))),
          }),
        ]);
        if (!r1.ok) throw new Error(`Batch 1 HTTP ${r1.status}`);
        if (!r2.ok) throw new Error(`Batch 2 HTTP ${r2.status}`);
        const preds: Prediction[] = [...(await r1.json()), ...(await r2.json())];
        setScored(COUNTIES.map((c, i) => ({
          ...c, probability: preds[i].probability, band: preds[i].band,
        })));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const national = useMemo(() => {
    if (!scored.length)
      return { avg: 0, veryHigh: 0, high: 0, lowMod: 0, top: [] as ScoredCounty[] };
    const avg = scored.reduce((s, c) => s + c.probability, 0) / scored.length;
    const sorted = [...scored].sort((a, b) => b.probability - a.probability);
    return {
      avg,
      veryHigh: scored.filter((c) => c.probability >= 0.85).length,
      high: scored.filter((c) => c.probability >= 0.60 && c.probability < 0.85).length,
      lowMod: scored.filter((c) => c.probability < 0.60).length,
      top: sorted.slice(0, 5),
    };
  }, [scored]);

  return (
    <main className="px-4 py-6 sm:px-6 sm:py-10">
      {/* ─── Hero ─────────────────────────────────────────────── */}
      <section className="grid gap-6 rounded-3xl border border-[#E7E5E0] bg-white p-6 shadow-sm sm:p-8 md:grid-cols-[minmax(0,1fr)_300px] md:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#1E3A8A]">
            National command view · 2026-04
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Food security intelligence{" "}
            <span className="text-[#1E3A8A]">for South Sudan</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-[#57534E] sm:text-base">
            Live risk scores for all 79 counties. A complement to the
            IPC&rsquo;s expert-led classification process.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/predict"
              className="inline-flex items-center gap-2 rounded-lg bg-[#1E3A8A] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1E40AF]"
            >
              <IconGauge className="h-4 w-4" /> Run an assessment
            </Link>
            <Link
              href="/atlas"
              className="inline-flex items-center gap-2 rounded-lg border border-[#E7E5E0] bg-white px-5 py-2.5 text-sm font-medium hover:bg-[#F8F7F4]"
            >
              <IconMap className="h-4 w-4" /> View atlas
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

      {/* ─── KPIs ─────────────────────────────────────────────── */}
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
          value={hydrated ? String(watched.size) : "—"}
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

      {/* ─── Top 5 alerts ─────────────────────────────────────── */}
      <section className="mt-8 rounded-3xl border border-[#E7E5E0] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Top priority counties
            </h2>
            <p className="mt-1 text-xs text-[#57534E] sm:text-sm">
              Highest-risk counties for the next assessment period.
            </p>
          </div>
          <Link
            href="/warnings"
            className="inline-flex items-center gap-1.5 rounded-md border border-[#E7E5E0] bg-white px-3 py-1.5 text-xs font-medium hover:bg-[#F8F7F4]"
          >
            View all warnings <IconArrow className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading && (
          <div className="mt-5 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-md bg-[#F1F0EC]" />
            ))}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs text-[#991B1B]">
            <span className="font-medium">Could not load scores: </span>
            <span className="font-mono">{error}</span>
          </div>
        )}

        {!loading && !error && (
          <ul className="mt-5 divide-y divide-[#F1F0EC]">
            {national.top.map((c, i) => (
              <li
                key={`${c.state}-${c.county}`}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[#F1F0EC] text-xs font-semibold text-[#57534E]">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{c.county}</div>
                    <div className="truncate text-xs text-[#78716C]">{c.state}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="font-mono text-sm font-semibold"
                    style={{ color: BAND_COLOR[c.band] }}
                  >
                    {(c.probability * 100).toFixed(1)}%
                  </span>
                  <span className="hidden rounded-full border border-[#E7E5E0] bg-[#F8F7F4] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#57534E] sm:inline-block">
                    {c.band}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
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