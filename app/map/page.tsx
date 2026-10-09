"use client";
import { useEffect, useMemo, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import ExportButtons from "@/components/ExportButtons";
import { PredictionRecord } from "@/lib/exporters";
import countiesJson from "@/data/counties.json";

interface Prediction { probability: number; band: string }

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

interface CountyEntry {
  state: string;
  county: string;
  payload: RawCounty;
}

interface MapPath {
  key: string;
  d: string;
  rawName: string;
  matchedCounty: string | undefined;
  prob: number;
  band: string;
}

interface GeoFeature {
  type: string;
  properties: Record<string, unknown>;
  geometry: unknown;
}

interface GeoData {
  type: string;
  features: GeoFeature[];
}

// Every common name key that could appear in a South Sudan admin-2 GeoJSON.
const NAME_KEYS = [
  "admin2Name", "ADM2_EN", "adm2_name", "adm2Name", "ADM2_NAME",
  "ADM2_EN_1", "name", "NAME_2", "adm2_en", "County",
];

const COLOR = (p: number) =>
  p < 0.35 ? "#16A34A" : p < 0.60 ? "#F59E0B" : p < 0.85 ? "#EA580C" : "#B91C1C";

const COUNTIES: CountyEntry[] = (countiesJson as RawCounty[]).map((r) => ({
  state: r.state,
  county: r.county,
  payload: r,
}));

function normalize(s: string): string {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/(county|state|area)$/, "")
    .replace(/centre/g, "center")
    .trim();
}

function pickName(props: Record<string, unknown>): string {
  for (const k of NAME_KEYS) {
    const v = props[k];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return "";
}

export default function MapPage() {
  const [data, setData] = useState<Record<string, Prediction>>({});
  const [records, setRecords] = useState<PredictionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [geoData, setGeoData] = useState<GeoData | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [debug, setDebug] = useState<{ features: number; paths: number; bounds: string } | null>(null);

  const normToCounty = useMemo(() => {
    const map: Record<string, string> = {};
    COUNTIES.forEach((c) => { map[normalize(c.county)] = c.county; });
    return map;
  }, []);

  // Load GeoJSON
  useEffect(() => {
    fetch("/ss_admin2.geojson")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<GeoData>;
      })
      .then((j) => {
        console.log("[map] GeoJSON loaded:", {
          type: j.type,
          features: j.features?.length,
          firstProps: j.features?.[0]?.properties,
          firstGeomType: (j.features?.[0]?.geometry as { type?: string } | undefined)?.type,
        });
        setGeoData(j);
      })
      .catch((err) => setGeoError(String(err)));
  }, []);

  // Fetch predictions in two batches
  useEffect(() => {
    (async () => {
      try {
        const mid = Math.ceil(COUNTIES.length / 2);
        const [r1, r2] = await Promise.all([
          fetch("/api/predict_batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(COUNTIES.slice(0, mid).map((c) => c.payload)),
          }),
          fetch("/api/predict_batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(COUNTIES.slice(mid).map((c) => c.payload)),
          }),
        ]);
        if (!r1.ok) throw new Error(`Batch 1 HTTP ${r1.status}`);
        if (!r2.ok) throw new Error(`Batch 2 HTTP ${r2.status}`);
        const preds: Prediction[] = [...(await r1.json()), ...(await r2.json())];

        const byCounty: Record<string, Prediction> = {};
        const recs: PredictionRecord[] = [];
        COUNTIES.forEach((c, i) => {
          byCounty[c.county] = preds[i];
          recs.push({
            timestamp: new Date().toISOString(),
            state: c.state, county: c.county,
            period: `${c.payload.start_year}-${String(c.payload.start_month).padStart(2, "0")}`,
            population: c.payload.population,
            priorPhase: c.payload.prior_period_ipc_phase,
            priorPhase3Pct: c.payload.prior_period_phase3plus_pct,
            productionTonnes: c.payload.prior_year_cereal_production_tonnes,
            gapTonnes: c.payload.prior_year_cereal_gap_tonnes,
            probability: preds[i].probability, band: preds[i].band,
          });
        });
        setData(byCounty);
        setRecords(recs);
      } catch (err) {
        setApiError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const MAP_W = 800;
  const MAP_H = 700;

  const paths = useMemo<MapPath[]>(() => {
    if (!geoData?.features?.length) return [];

    // ── AUTO-FIT: computes the ideal scale + center from the actual geometry ──
    let projection;
    try {
      projection = geoMercator().fitExtent(
        [[30, 30], [MAP_W - 30, MAP_H - 30]],
        geoData as never
      );
    } catch (err) {
      console.error("[map] fitExtent failed, falling back:", err);
      projection = geoMercator().center([30, 7.5]).scale(2400).translate([MAP_W / 2, MAP_H / 2]);
    }

    const pathGen = geoPath(projection);
    const unmatchedNames: string[] = [];

    const out: MapPath[] = geoData.features.map((feat, i) => {
      const props = feat.properties || {};
      const rawName = pickName(props);
      const matchedCounty = rawName ? normToCounty[normalize(rawName)] : undefined;
      if (!matchedCounty) unmatchedNames.push(rawName || "(unnamed)");

      const pred = matchedCounty ? data[matchedCounty] : undefined;
      const prob = pred?.probability ?? 0;
      const band = pred?.band ?? "no data";

      const dAttr = pathGen(feat as never) || "";

      return {
        key: `${i}-${rawName || i}`,
        d: dAttr,
        rawName: rawName || "(unnamed)",
        matchedCounty,
        prob,
        band,
      };
    });

    // Debug snapshot
    const sampleBounds = (() => {
      try {
        const nonEmpty = out.filter((p) => p.d.length > 0);
        return `${nonEmpty.length}/${out.length} paths have geometry`;
      } catch { return "unknown"; }
    })();

    setDebug({
      features: geoData.features.length,
      paths: out.filter((p) => p.d.length > 0).length,
      bounds: sampleBounds,
    });

    setUnmatched((prev) => {
      const same =
        prev.length === unmatchedNames.length &&
        prev.every((n, i) => n === unmatchedNames[i]);
      return same ? prev : unmatchedNames;
    });

    return out;
  }, [geoData, data, normToCounty]);

  const hasData = Object.keys(data).length > 0;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#1E3A8A]">
            Risk atlas
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            County-level risk — South Sudan
          </h1>
          <p className="mt-2 text-sm text-[#57534E]">
            Predicted probability of IPC Phase 3+ for each county, using its
            most recent prior-period values.
          </p>
        </div>
        <ExportButtons records={records} label="all-counties" />
      </div>

      {loading && (
        <div className="mt-8 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-4 text-sm text-[#1E3A8A]">
          Loading predictions for {COUNTIES.length} counties…
          <span className="ml-2 text-[#57534E]">(first request may take 10–30 seconds)</span>
        </div>
      )}

      {apiError && (
        <div className="mt-8 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#991B1B]">
          <p className="font-medium">Failed to load predictions</p>
          <p className="mt-1 font-mono text-xs">{apiError}</p>
        </div>
      )}

      {geoError && (
        <div className="mt-8 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#991B1B]">
          <p className="font-medium">Failed to load map geometry</p>
          <p className="mt-1 font-mono text-xs">{geoError}</p>
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-[#E7E5E0] bg-white p-4 shadow-sm">
        {!geoData && !geoError && (
          <p className="py-32 text-center text-[#78716C]">Loading map…</p>
        )}

        {geoData && (
          <svg
            viewBox={`0 0 ${MAP_W} ${MAP_H}`}
            width="100%"
            height="auto"
            style={{ display: "block", background: "#F8F7F4", borderRadius: 8 }}
          >
            {paths.map((p: MapPath) => (
              <path
                key={p.key}
                d={p.d}
                fill={p.d ? COLOR(p.prob) : "#E7E5E0"}
                stroke="#ffffff"
                strokeWidth={0.6}
                onMouseEnter={() =>
                  setHover(
                    p.matchedCounty
                      ? `${p.matchedCounty} — ${(p.prob * 100).toFixed(0)}% (${p.band})`
                      : `${p.rawName} — no prediction match`
                  )
                }
                onMouseLeave={() => setHover(null)}
              />
            ))}
          </svg>
        )}

        {hover && (
          <div className="mt-2 text-center font-mono text-sm text-[#57534E]">{hover}</div>
        )}

        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-[#57534E]">
          {[
            ["<35% Low", "#16A34A"],
            ["35–60% Moderate", "#F59E0B"],
            ["60–85% High", "#EA580C"],
            ["≥85% Very High", "#B91C1C"],
          ].map(([label, color]) => (
            <span key={label} className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded" style={{ background: color }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {!loading && hasData && (
        <p className="mt-4 text-center text-xs text-[#78716C]">
          Loaded {Object.keys(data).length} of {COUNTIES.length} counties.
        </p>
      )}

      {/* Debug panel — always visible while we diagnose */}
      {debug && (
        <div className="mt-4 rounded-lg border border-[#E7E5E0] bg-[#F8F7F4] p-3 text-xs font-mono text-[#57534E]">
          <div>GeoJSON features: {debug.features}</div>
          <div>Paths with geometry: {debug.paths}</div>
          <div>{debug.bounds}</div>
        </div>
      )}

      {unmatched.length > 0 && (
        <div className="mt-4 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4 text-sm">
          <p className="font-medium text-[#92400E]">
            ⚠ {unmatched.length} GeoJSON name{unmatched.length !== 1 ? "s" : ""} could not be matched
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-1 font-mono text-xs text-[#92400E]">
            {unmatched.map((name, i) => (
              <li key={`${name}-${i}`}>{name}</li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}