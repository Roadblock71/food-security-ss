"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import countiesJson from "@/data/counties.json";

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

interface ScoredCounty extends RawCounty {
  probability: number;
  band: string;
}

const COUNTIES = countiesJson as RawCounty[];

const STATES = Array.from(new Set(COUNTIES.map((c) => c.state))).sort();

const BAND_COLOR: Record<string, string> = {
  Low: "text-[#16A34A]",
  Moderate: "text-[#F59E0B]",
  High: "text-[#EA580C]",
  "Very High": "text-[#B91C1C]",
};

const BAND_BG: Record<string, string> = {
  Low: "bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]",
  Moderate: "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]",
  High: "bg-[#FFF7ED] text-[#9A3412] border-[#FED7AA]",
  "Very High": "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]",
};

export default function Dashboard() {
  const [scored, setScored] = useState<ScoredCounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState<string>("All states");
  const [showCount, setShowCount] = useState<number>(5);

  // Load all 79 county scores once on mount
  useEffect(() => {
    (async () => {
      try {
        const mid = Math.ceil(COUNTIES.length / 2);
        const payloads = (arr: RawCounty[]) =>
          arr.map((c) => ({
            state: c.state,
            county: c.county,
            population: c.population,
            start_year: c.start_year,
            start_month: c.start_month,
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

        const joined: ScoredCounty[] = COUNTIES.map((c, i) => ({
          ...c,
          probability: preds[i].probability,
          band: preds[i].band,
        }));

        setScored(joined);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const base =
      stateFilter === "All states"
        ? scored
        : scored.filter((c) => c.state === stateFilter);
    return [...base].sort((a, b) => b.probability - a.probability);
  }, [scored, stateFilter]);

  const visible = filtered.slice(0, showCount);

  const stateCount = new Set(scored.map((c) => c.state)).size;
  const highRiskCount = scored.filter((c) => c.probability >= 0.85).length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Hero */}
      <section className="rounded-2xl border border-[#E7E5E0] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#1E3A8A]">
          Humanitarian early-warning
        </p>
        <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          Food security intelligence <br className="hidden sm:block" />
          for South Sudan
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-[#57534E] sm:text-base">
          Historical context, predictive signals, and county-level risk scores
          for analysts and responders — a complement to the expert-led IPC
          classification process.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/predict"
            className="rounded-lg bg-[#1E3A8A] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1E40AF]"
          >
            Run an assessment →
          </Link>
          <Link
            href="/about"
            className="rounded-lg border border-[#E7E5E0] bg-white px-5 py-2.5 text-sm font-medium hover:bg-[#F8F7F4]"
          >
            Read methodology
          </Link>
        </div>
      </section>

      {/* KPI strip */}
      <section className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {[
          {
            label: "Counties covered",
            value: loading ? "—" : String(scored.length),
            sub: loading ? "loading…" : `across ${stateCount} states`,
          },
          {
            label: "Very high risk",
            value: loading ? "—" : String(highRiskCount),
            sub: "predicted ≥ 85%",
          },
          {
            label: "Validation AUC",
            value: "0.964",
            sub: "temporal holdout",
          },
          {
            label: "Model",
            value: "RF × 500",
            sub: "class-balanced trees",
          },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-xl border border-[#E7E5E0] bg-white p-4 sm:p-5"
          >
            <div className="text-[10px] font-medium uppercase tracking-wider text-[#78716C] sm:text-xs">
              {k.label}
            </div>
            <div className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
              {k.value}
            </div>
            <div className="mt-1 text-[11px] text-[#78716C] sm:text-xs">
              {k.sub}
            </div>
          </div>
        ))}
      </section>

      {/* Top counties widget */}
      <section className="mt-8 rounded-2xl border border-[#E7E5E0] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight sm:text-lg">
              Highest-risk counties
            </h2>
            <p className="mt-1 text-xs text-[#57534E] sm:text-sm">
              Current predictions for the next assessment period (2026-04).
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

            <select
              value={showCount}
              onChange={(e) => setShowCount(Number(e.target.value))}
              className="rounded-md border border-[#E7E5E0] bg-white px-3 py-1.5 text-xs outline-none focus:border-[#1E3A8A] focus:ring-1 focus:ring-[#1E3A8A]/30"
            >
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
              <option value={20}>Top 20</option>
              <option value={79}>All</option>
            </select>
          </div>
        </div>

        {loading && (
          <div className="mt-5 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded-md bg-[#F1F0EC]"
              />
            ))}
            <p className="pt-1 text-center text-xs text-[#78716C]">
              Scoring {COUNTIES.length} counties… (first request may take up to
              30 seconds)
            </p>
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs text-[#991B1B]">
            <span className="font-medium">Could not load scores: </span>
            <span className="font-mono">{error}</span>
          </div>
        )}

        {!loading && !error && (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#E7E5E0] text-[10px] uppercase tracking-wider text-[#78716C] sm:text-xs">
                  <th className="py-2 pr-3 font-medium">#</th>
                  <th className="py-2 pr-3 font-medium">County</th>
                  <th className="hidden py-2 pr-3 font-medium sm:table-cell">
                    State
                  </th>
                  <th className="py-2 pr-3 font-medium">Risk</th>
                  <th className="py-2 pl-3 text-right font-medium">Band</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((c, i) => (
                  <tr
                    key={`${c.state}-${c.county}`}
                    className="border-b border-[#F1F0EC] last:border-0"
                  >
                    <td className="py-2 pr-3 text-xs text-[#78716C]">
                      {i + 1}
                    </td>
                    <td className="py-2 pr-3 font-medium">{c.county}</td>
                    <td className="hidden py-2 pr-3 text-xs text-[#57534E] sm:table-cell">
                      {c.state}
                    </td>
                    <td className="py-2 pr-3 font-mono text-sm">
                      <span className={BAND_COLOR[c.band]}>
                        {(c.probability * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2 pl-3 text-right">
                      <span
                        className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${BAND_BG[c.band]}`}
                      >
                        {c.band}
                      </span>
                    </td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-6 text-center text-sm text-[#78716C]"
                    >
                      No counties match the current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <p className="mt-3 text-center text-[11px] text-[#A8A29E] sm:text-xs">
              Showing {visible.length} of {filtered.length} counties
              {stateFilter !== "All states" ? ` in ${stateFilter}` : ""}
            </p>
          </div>
        )}
      </section>

      {/* Quick action cards */}
      <section className="mt-8 grid gap-3 sm:gap-4 md:grid-cols-2">
        <Link
          href="/predict"
          className="group rounded-xl border border-[#E7E5E0] bg-white p-5 transition-colors hover:border-[#1E3A8A]/30 hover:bg-[#F8F7F4]"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-[#1E3A8A]" />
          <h3 className="mt-3 text-base font-semibold">
            Run a risk assessment
          </h3>
          <p className="mt-1 text-sm text-[#57534E]">
            Pick a county from the dropdown, verify the context, and get a
            probability with exports to PDF, Excel, or JSON.
          </p>
          <span className="mt-3 inline-block text-sm font-medium text-[#1E3A8A] opacity-70 transition-opacity group-hover:opacity-100">
            Continue →
          </span>
        </Link>

        <Link
          href="/about"
          className="group rounded-xl border border-[#E7E5E0] bg-white p-5 transition-colors hover:border-[#1E3A8A]/30 hover:bg-[#F8F7F4]"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-[#B45309]" />
          <h3 className="mt-3 text-base font-semibold">
            Model & methodology
          </h3>
          <p className="mt-1 text-sm text-[#57534E]">
            Features, validation results, and honest limitations — read before
            relying on any output.
          </p>
          <span className="mt-3 inline-block text-sm font-medium text-[#B45309] opacity-70 transition-opacity group-hover:opacity-100">
            Continue →
          </span>
        </Link>
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