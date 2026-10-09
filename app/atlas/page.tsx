"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import countiesJson from "@/data/counties.json";
import { IconArrow } from "@/components/Icons";

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

const BAND_TINT: Record<string, string> = {
  Low: "bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]",
  Moderate: "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]",
  High: "bg-[#FFF7ED] text-[#9A3412] border-[#FED7AA]",
  "Very High": "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]",
};

export default function RegionsPage() {
  const [scored, setScored] = useState<ScoredCounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState("All states");

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
        if (!r1.ok) throw new Error(`HTTP ${r1.status}`);
        if (!r2.ok) throw new Error(`HTTP ${r2.status}`);
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

  const grouped = useMemo(() => {
    const byState = new Map<string, ScoredCounty[]>();
    scored.forEach((c) => {
      if (!byState.has(c.state)) byState.set(c.state, []);
      byState.get(c.state)!.push(c);
    });
    return Array.from(byState.entries())
      .map(([state, list]) => ({
        state,
        counties: [...list].sort((a, b) => b.probability - a.probability),
        avgRisk: list.reduce((s, c) => s + c.probability, 0) / list.length,
        veryHigh: list.filter((c) => c.probability >= 0.85).length,
      }))
      .sort((a, b) => b.avgRisk - a.avgRisk);
  }, [scored]);

  const STATES = grouped.map((g) => g.state);
  const visible = stateFilter === "All states"
    ? grouped
    : grouped.filter((g) => g.state === stateFilter);

  return (
    <main className="px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#1E3A8A]">
          Regional view
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          State &amp; county matrix
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#57534E]">
          A data-driven grid of every state and its counties — sorted by
          average predicted risk.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
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
          <span className="text-xs text-[#78716C]">
            {loading ? "Loading…" : `${visible.length} of ${STATES.length} states`}
          </span>
        </div>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs text-[#991B1B]">
          <span className="font-medium">Could not load scores: </span>
          <span className="font-mono">{error}</span>
        </div>
      )}

      {loading && (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-3xl bg-[#F1F0EC]" />
          ))}
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((g) => {
            const avgColor =
              g.avgRisk < 0.35 ? "#16A34A"
              : g.avgRisk < 0.60 ? "#F59E0B"
              : g.avgRisk < 0.85 ? "#EA580C"
              : "#B91C1C";
            return (
              <section
                key={g.state}
                className="rounded-3xl border border-[#E7E5E0] bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold tracking-tight sm:text-lg">
                      {g.state}
                    </h2>
                    <p className="mt-0.5 text-xs text-[#78716C]">
                      {g.counties.length} counties ·{" "}
                      {g.veryHigh > 0 ? (
                        <span className="font-medium text-[#991B1B]">
                          {g.veryHigh} very high
                        </span>
                      ) : (
                        <span>no very-high flags</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <div
                      className="font-mono text-xl font-semibold tracking-tight sm:text-2xl"
                      style={{ color: avgColor }}
                    >
                      {(g.avgRisk * 100).toFixed(0)}%
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-[#78716C]">
                      avg risk
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {g.counties.map((c) => (
                    <div
                      key={c.county}
                      className="rounded-xl border border-[#E7E5E0] bg-[#F8F7F4] p-2.5"
                    >
                      <div className="truncate text-xs font-medium text-[#1C1917]">
                        {c.county}
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span
                          className="font-mono text-xs font-semibold"
                          style={{ color: BAND_COLOR[c.band] }}
                        >
                          {(c.probability * 100).toFixed(0)}%
                        </span>
                        <span
                          className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider ${BAND_TINT[c.band]}`}
                        >
                          {c.band === "Very High" ? "VH"
                            : c.band === "Moderate" ? "M"
                            : c.band === "High" ? "H"
                            : "L"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <section className="mt-8 rounded-3xl border border-[#E7E5E0] bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold tracking-tight">How to read this</h2>
        <p className="mt-2 text-sm text-[#57534E]">
          Each card is a state. Chips inside it are the counties, sorted by
          predicted risk. States are ranked from highest to lowest average risk.
          Colours follow the standard IPC risk bands — green under 35%, amber
          35–60%, orange 60–85%, red 85% and above.
        </p>
        <div className="mt-4">
          <Link
            href="/counties"
            className="inline-flex items-center gap-2 rounded-lg bg-[#1E3A8A] px-4 py-2 text-sm font-medium text-white hover:bg-[#1E40AF]"
          >
            Open full county list <IconArrow className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}