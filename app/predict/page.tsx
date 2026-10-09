"use client";
import { useState } from "react";
import ExportButtons from "@/components/ExportButtons";
import { PredictionRecord } from "@/lib/exporters";

const STATES = [
  "Abyei", "Central Equatoria", "Eastern Equatoria", "Jonglei", "Lakes",
  "Northern Bahr El Ghazal", "Unity", "Upper Nile", "Warrap",
  "Western Bahr El Ghazal", "Western Equatoria",
];

const PHASES = ["Minimal", "Stressed", "Crisis", "Emergency", "Catastrophe"];

const BAND_COLOR: Record<string, string> = {
  Low: "text-[#16A34A]",
  Moderate: "text-[#F59E0B]",
  High: "text-[#EA580C]",
  "Very High": "text-[#B91C1C]",
};

const BAND_BG: Record<string, string> = {
  Low: "bg-[#F0FDF4] border-[#BBF7D0]",
  Moderate: "bg-[#FFFBEB] border-[#FDE68A]",
  High: "bg-[#FFF7ED] border-[#FED7AA]",
  "Very High": "bg-[#FEF2F2] border-[#FECACA]",
};

const inputCls =
  "mt-1 w-full rounded-md border border-[#E7E5E0] bg-white px-3 py-2 text-sm " +
  "text-[#1C1917] outline-none transition-colors " +
  "focus:border-[#1E3A8A] focus:ring-1 focus:ring-[#1E3A8A]/30";

const labelCls = "block text-sm font-medium text-[#57534E]";

export default function PredictPage() {
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
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const removeFromSession = (i: number) =>
    setSession((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 pb-40">
      {/* Header */}
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#1E3A8A]">
          Risk assessment
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#1C1917]">
          Predict county-level food insecurity
        </h1>
        <p className="mt-2 text-sm text-[#57534E]">
          Enter prior-period context for a county. The model returns a
          probability of IPC Phase 3+ in the target period.
        </p>
      </header>

      {/* Form card */}
      <form
        onSubmit={submit}
        className="mt-8 rounded-2xl border border-[#E7E5E0] bg-white p-6 shadow-sm"
      >
        <div className="grid grid-cols-2 gap-4">
          <label className="col-span-2 md:col-span-1">
            <span className={labelCls}>State</span>
            <select
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              className={inputCls}
            >
              {STATES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>

          <label className="col-span-2 md:col-span-1">
            <span className={labelCls}>County</span>
            <input
              value={form.county}
              onChange={(e) => setForm({ ...form, county: e.target.value })}
              className={inputCls}
              placeholder="e.g. Akobo"
            />
          </label>

          <label>
            <span className={labelCls}>Population</span>
            <input
              type="number"
              value={form.population}
              onChange={(e) =>
                setForm({ ...form, population: +e.target.value })
              }
              className={inputCls}
            />
          </label>

          <label>
            <span className={labelCls}>Prior IPC phase</span>
            <select
              value={form.prior_period_ipc_phase}
              onChange={(e) =>
                setForm({ ...form, prior_period_ipc_phase: e.target.value })
              }
              className={inputCls}
            >
              {PHASES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>

          <label>
            <span className={labelCls}>Prior Phase 3+ %</span>
            <input
              type="number"
              step="0.1"
              value={form.prior_period_phase3plus_pct}
              onChange={(e) =>
                setForm({
                  ...form,
                  prior_period_phase3plus_pct: +e.target.value,
                })
              }
              className={inputCls}
            />
          </label>

          <label>
            <span className={labelCls}>Target period (year / month)</span>
            <div className="mt-1 flex gap-2">
              <input
                type="number"
                value={form.start_year}
                onChange={(e) =>
                  setForm({ ...form, start_year: +e.target.value })
                }
                className={`${inputCls} mt-0`}
              />
              <input
                type="number"
                value={form.start_month}
                onChange={(e) =>
                  setForm({ ...form, start_month: +e.target.value })
                }
                className={`${inputCls} mt-0`}
              />
            </div>
          </label>

          <label className="col-span-2">
            <span className={labelCls}>Prior cereal production (t)</span>
            <input
              type="number"
              value={form.prior_year_cereal_production_tonnes}
              onChange={(e) =>
                setForm({
                  ...form,
                  prior_year_cereal_production_tonnes: +e.target.value,
                })
              }
              className={inputCls}
            />
          </label>

          <label className="col-span-2">
            <span className={labelCls}>Prior cereal gap (t)</span>
            <input
              type="number"
              value={form.prior_year_cereal_gap_tonnes}
              onChange={(e) =>
                setForm({
                  ...form,
                  prior_year_cereal_gap_tonnes: +e.target.value,
                })
              }
              className={inputCls}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-[#1E3A8A] py-3 text-sm font-medium text-white transition-colors hover:bg-[#1E40AF] disabled:opacity-50"
        >
          {loading ? "Predicting…" : "Predict risk"}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="mt-6 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#991B1B]">
          <p className="font-medium">Prediction failed</p>
          <p className="mt-1 font-mono text-xs">{error}</p>
        </div>
      )}

      {/* Result card */}
      {result && (
        <div
          className={`mt-8 rounded-2xl border p-6 shadow-sm ${BAND_BG[result.band]}`}
        >
          <div className="text-xs font-semibold uppercase tracking-widest text-[#57534E]">
            Predicted risk of IPC Phase 3+
          </div>
          <div
            className={`mt-2 font-mono text-6xl font-semibold tracking-tight ${BAND_COLOR[result.band]}`}
          >
            {(result.probability * 100).toFixed(1)}%
          </div>
          <div className={`mt-3 text-lg font-medium ${BAND_COLOR[result.band]}`}>
            {result.band} risk
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-black/5 pt-4">
            <p className="text-xs text-[#57534E]">
              Added to your session report below.
            </p>
            <ExportButtons
              records={[toRecord(result.band, result.probability)]}
              label={form.county.toLowerCase().replace(/\s+/g, "-")}
            />
          </div>
        </div>
      )}

      {/* Session — sticky footer */}
      {session.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#E7E5E0] bg-white/95 backdrop-blur shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
          <div className="mx-auto max-w-3xl px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-medium text-[#1C1917]">
                📋 {session.length} prediction
                {session.length !== 1 ? "s" : ""} in report
              </div>
              <div className="flex items-center gap-2">
                <ExportButtons records={session} label="report" />
                <button
                  onClick={() => setSession([])}
                  className="rounded-md border border-[#E7E5E0] bg-white px-3 py-1.5 text-xs font-medium text-[#57534E] hover:bg-[#F8F7F4]"
                >
                  Clear
                </button>
              </div>
            </div>

            <ul className="mt-3 max-h-32 overflow-y-auto text-xs">
              {session.map((r, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between border-t border-[#F1F0EC] py-1.5 text-[#57534E]"
                >
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-mono text-[#1C1917]">
                      {r.state} / {r.county}
                    </span>
                    <span className="text-[#A8A29E]">·</span>
                    <span className={`font-medium ${BAND_COLOR[r.band]}`}>
                      {(r.probability * 100).toFixed(1)}% {r.band}
                    </span>
                    <span className="text-[#A8A29E]">·</span>
                    <span>{r.period}</span>
                  </span>
                  <button
                    onClick={() => removeFromSession(i)}
                    className="text-[#A8A29E] transition-colors hover:text-[#B91C1C]"
                    aria-label="Remove from report"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </main>
  );
}