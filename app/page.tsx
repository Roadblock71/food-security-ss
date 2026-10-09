"use client";
import { useState } from "react";
import Link from "next/link";
import ExportButtons from "@/components/ExportButtons";
import { PredictionRecord } from "@/lib/exporters";

const STATES = [
  "Abyei", "Central Equatoria", "Eastern Equatoria", "Jonglei", "Lakes",
  "Northern Bahr El Ghazal", "Unity", "Upper Nile", "Warrap",
  "Western Bahr El Ghazal", "Western Equatoria",
];
const PHASES = ["Minimal", "Stressed", "Crisis", "Emergency", "Catastrophe"];

const BAND_COLOR: Record<string, string> = {
  Low: "text-emerald-600",
  Moderate: "text-yellow-600",
  High: "text-orange-500",
  "Very High": "text-red-600",
};

export default function Home() {
  const [form, setForm] = useState({
    state: "Jonglei",
    county: "Akobo",
    population: 183725,
    start_year: 2026,
    start_month: 4,
    prior_period_ipc_phase: "Crisis",
    prior_period_phase3plus_pct: 54.7,
    prior_year_cereal_production_tonnes: 12258,
    prior_year_cereal_gap_tonnes: -14231,
  });
  const [result, setResult] = useState<{ probability: number; band: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<PredictionRecord[]>([]);

  function toRecord(band: string, probability: number): PredictionRecord {
    return {
      timestamp: new Date().toISOString(),
      state: form.state,
      county: form.county,
      period: `${form.start_year}-${String(form.start_month).padStart(2, "0")}`,
      population: form.population,
      priorPhase: form.prior_period_ipc_phase,
      priorPhase3Pct: form.prior_period_phase3plus_pct,
      productionTonnes: form.prior_year_cereal_production_tonnes,
      gapTonnes: form.prior_year_cereal_gap_tonnes,
      probability,
      band,
    };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setResult(data);
      setSession((prev) => [...prev, toRecord(data.band, data.probability)]);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  const removeFromSession = (i: number) =>
    setSession((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <main className="mx-auto max-w-3xl p-8 pb-40">
      <h1 className="text-3xl font-bold">South Sudan Food Security Risk</h1>
      <p className="mt-2 text-neutral-600">
        Early-warning signal for IPC Phase 3+ between formal assessments.
      </p>

      <form onSubmit={submit} className="mt-8 grid grid-cols-2 gap-4">
        <label className="col-span-2">
          <span className="text-sm font-medium">State</span>
          <select value={form.state}
            onChange={(e) => setForm({ ...form, state: e.target.value })}
            className="mt-1 w-full rounded border border-neutral-300 p-2">
            {STATES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>

        <label className="col-span-2">
          <span className="text-sm font-medium">County</span>
          <input value={form.county}
            onChange={(e) => setForm({ ...form, county: e.target.value })}
            className="mt-1 w-full rounded border border-neutral-300 p-2" />
        </label>

        <label>
          <span className="text-sm font-medium">Population</span>
          <input type="number" value={form.population}
            onChange={(e) => setForm({ ...form, population: +e.target.value })}
            className="mt-1 w-full rounded border border-neutral-300 p-2" />
        </label>

        <label>
          <span className="text-sm font-medium">Prior IPC phase</span>
          <select value={form.prior_period_ipc_phase}
            onChange={(e) => setForm({ ...form, prior_period_ipc_phase: e.target.value })}
            className="mt-1 w-full rounded border border-neutral-300 p-2">
            {PHASES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>

        <label>
          <span className="text-sm font-medium">Prior Phase 3+ %</span>
          <input type="number" step="0.1" value={form.prior_period_phase3plus_pct}
            onChange={(e) => setForm({ ...form, prior_period_phase3plus_pct: +e.target.value })}
            className="mt-1 w-full rounded border border-neutral-300 p-2" />
        </label>

        <label>
          <span className="text-sm font-medium">Year / Month</span>
          <div className="mt-1 flex gap-2">
            <input type="number" value={form.start_year}
              onChange={(e) => setForm({ ...form, start_year: +e.target.value })}
              className="w-full rounded border border-neutral-300 p-2" />
            <input type="number" value={form.start_month}
              onChange={(e) => setForm({ ...form, start_month: +e.target.value })}
              className="w-full rounded border border-neutral-300 p-2" />
          </div>
        </label>

        <label className="col-span-2">
          <span className="text-sm font-medium">Prior cereal production (t)</span>
          <input type="number" value={form.prior_year_cereal_production_tonnes}
            onChange={(e) => setForm({ ...form, prior_year_cereal_production_tonnes: +e.target.value })}
            className="mt-1 w-full rounded border border-neutral-300 p-2" />
        </label>

        <label className="col-span-2">
          <span className="text-sm font-medium">Prior cereal gap (t)</span>
          <input type="number" value={form.prior_year_cereal_gap_tonnes}
            onChange={(e) => setForm({ ...form, prior_year_cereal_gap_tonnes: +e.target.value })}
            className="mt-1 w-full rounded border border-neutral-300 p-2" />
        </label>

        <button type="submit" disabled={loading}
          className="col-span-2 rounded-lg bg-neutral-900 py-3 text-white disabled:opacity-50">
          {loading ? "Predicting…" : "Predict risk"}
        </button>
      </form>

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className={`font-mono text-5xl ${BAND_COLOR[result.band]}`}>
            {(result.probability * 100).toFixed(1)}%
          </div>
          <div className="mt-2 text-lg">{result.band} risk of IPC Phase 3+</div>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-neutral-500">Added to your report below.</p>
            <ExportButtons
              records={[toRecord(result.band, result.probability)]}
              label={form.county.toLowerCase().replace(/\s+/g, "-")} />
          </div>
        </div>
      )}

      <Link href="/map" className="mt-8 inline-block underline">
        View all-county risk map →
      </Link>

      {session.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <div className="mx-auto max-w-3xl p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">
                📋 {session.length} prediction{session.length !== 1 ? "s" : ""} in report
              </div>
              <div className="flex items-center gap-2">
                <ExportButtons records={session} label="report" />
                <button onClick={() => setSession([])}
                  className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs hover:bg-neutral-50">
                  Clear
                </button>
              </div>
            </div>

            <ul className="mt-3 max-h-32 overflow-y-auto text-xs text-neutral-700">
              {session.map((r, i) => (
                <li key={i} className="flex items-center justify-between border-t border-neutral-100 py-1">
                  <span>
                    <span className="font-mono">{r.state} / {r.county}</span>
                    <span className="mx-2 text-neutral-400">·</span>
                    <span className={BAND_COLOR[r.band]}>
                      {(r.probability * 100).toFixed(1)}% {r.band}
                    </span>
                    <span className="mx-2 text-neutral-400">·</span>
                    <span className="text-neutral-500">{r.period}</span>
                  </span>
                  <button onClick={() => removeFromSession(i)}
                    className="text-neutral-400 hover:text-red-600">×</button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </main>
  );
}