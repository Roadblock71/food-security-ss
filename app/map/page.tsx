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

const COLOR = (p: number) =>
  p < 0.35 ? "#10b981" : p < 0.60 ? "#eab308" : p < 0.85 ? "#f97316" : "#dc2626";

const COUNTIES: CountyEntry[] = (countiesJson as RawCounty[]).map((r) => ({
  state: r.state,
  county: r.county,
  payload: r,
}));

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/(county|state|area)$/, "")
    .replace(/centre/g, "center")
    .trim();
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

  const normToCounty = useMemo(() => {
    const map: Record<string, string> = {};
    COUNTIES.forEach((c) => { map[normalize(c.county)] = c.county; });
    return map;
  }, []);

  // Load the GeoJSON from /public
  useEffect(() => {
    fetch("/ss_admin2.geojson")
      .then((r) => {
        if (!r.ok) throw new Error(`GeoJSON HTTP ${r.status}`);
        return r.json() as Promise<GeoData>;
      })
      .then((j) => setGeoData(j))
      .catch((err) => setGeoError(String(err)));
  }, []);

  // Fetch all county predictions in two parallel batches
  useEffect(() => {
    (async () => {
      try {
        const mid = Math.ceil(COUNTIES.length / 2);
        const batch1 = COUNTIES.slice(0, mid).map((c) => c.payload);
        const batch2 = COUNTIES.slice(mid).map((c) => c.payload);

        const [r1, r2] = await Promise.all([
          fetch("/api/predict_batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(batch1),
          }),
          fetch("/api/predict_batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(batch2),
          }),
        ]);

        if (!r1.ok) throw new Error(`Batch 1 HTTP ${r1.status}`);
        if (!r2.ok) throw new Error(`Batch 2 HTTP ${r2.status}`);

        const p1: Prediction[] = await r1.json();
        const p2: Prediction[] = await r2.json();
        const preds: Prediction[] = [...p1, ...p2];

        const byCounty: Record<string, Prediction> = {};
        const recs: PredictionRecord[] = [];
        COUNTIES.forEach((c, i) => {
          byCounty[c.county] = preds[i];
          recs.push({
            timestamp: new Date().toISOString(),
            state: c.state,
            county: c.county,
            period: `${c.payload.start_year}-${String(c.payload.start_month).padStart(2, "0")}`,
            population: c.payload.population,
            priorPhase: c.payload.prior_period_ipc_phase,
            priorPhase3Pct: c.payload.prior_period_phase3plus_pct,
            productionTonnes: c.payload.prior_year_cereal_production_tonnes,
            gapTonnes: c.payload.prior_year_cereal_gap_tonnes,
            probability: preds[i].probability,
            band: preds[i].band,
          });
        });
        setData(byCounty);
        setRecords(recs);
      } catch (err) {
        console.error("Batch prediction failed:", err);
        setApiError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const MAP_W = 800;
  const MAP_H = 700;

  const paths = useMemo<MapPath[]>(() => {
    if (!geoData?.features) return [];

    const projection = geoMercator()
      .center([30, 7.5])
      .scale(1300)
      .translate([MAP_W / 2, MAP_H / 2]);
    const pathGen = geoPath(projection);

    const unmatchedNames: string[] = [];

    const out: MapPath[] = geoData.features.map((feat, i) => {
      const props = feat.properties || {};
      const rawName =
        (props.admin2Name as string) ||
        (props.ADM2_EN as string) ||
        (props.ADM1_EN as string) ||
        (props.name as string) ||
        "";
      const matchedCounty = normToCounty[normalize(rawName)];
      if (!matchedCounty) unmatchedNames.push(rawName);

      const pred = matchedCounty ? data[matchedCounty] : undefined;
      const prob = pred?.probability ?? 0;
      const band = pred?.band ?? "no data";

      return {
        key: `${i}-${rawName}`,
        d: pathGen(feat as never) || "",
        rawName,
        matchedCounty,
        prob,
        band,
      };
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
    <main className="mx-auto max-w-5xl p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            County-level risk — all of South Sudan
          </h1>
          <p className="mt-2 text-neutral-600">
            Predicted probability of IPC Phase 3+ for each county, using its most
            recent prior-period values.
          </p>
        </div>
        <ExportButtons records={records} label="all-counties" />
      </div>

      {loading && (
        <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          Loading predictions for {COUNTIES.length} counties…
          <span className="ml-2 text-blue-600">
            (first request can take 10–30 seconds on cold start)
          </span>
        </div>
      )}

      {apiError && (
        <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-medium">Failed to load predictions</p>
          <p className="mt-1 font-mono text-xs">{apiError}</p>
        </div>
      )}

      {geoError && (
        <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-medium">Failed to load map geometry</p>
          <p className="mt-1 font-mono text-xs">{geoError}</p>
          <p className="mt-2 text-xs">
            Expected file at <code>/ss_admin2.geojson</code>. Make sure it exists
            in <code>public/</code>.
          </p>
        </div>
      )}

      <div className="mt-8 rounded-xl border bg-white p-4 shadow-sm">
        {!geoData && !geoError && (
          <p className="py-32 text-center text-neutral-500">Loading map…</p>
        )}

        {geoData && (
          <svg
            viewBox={`0 0 ${MAP_W} ${MAP_H}`}
            width="100%"
            height="auto"
            style={{ display: "block", background: "#f8fafc" }}
          >
            {paths.map((p: MapPath) => (
              <path
                key={p.key}
                d={p.d}
                fill={COLOR(p.prob)}
                stroke="#ffffff"
                strokeWidth={0.6}
                onMouseEnter={() => {
                  setHover(
                    p.matchedCounty
                      ? `${p.matchedCounty} — ${(p.prob * 100).toFixed(0)}% (${p.band})`
                      : `${p.rawName} — no prediction match`
                  );
                }}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: "pointer", transition: "opacity 0.15s" }}
              />
            ))}
          </svg>
        )}

        {hover && (
          <div className="mt-2 text-center font-mono text-sm text-neutral-700">
            {hover}
          </div>
        )}

        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-neutral-600">
          {[
            ["<35% Low", "#10b981"],
            ["35–60% Moderate", "#eab308"],
            ["60–85% High", "#f97316"],
            ["≥85% Very High", "#dc2626"],
          ].map(([label, color]) => (
            <span key={label} className="flex items-center gap-1">
              <span
                className="inline-block h-3 w-3 rounded"
                style={{ background: color }}
              />
              {label}
            </span>
          ))}
        </div>
      </div>

      {!loading && hasData && (
        <p className="mt-4 text-center text-xs text-neutral-500">
          Loaded predictions for {Object.keys(data).length} of {COUNTIES.length}{" "}
          counties.
        </p>
      )}

      {unmatched.length > 0 && (
        <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm">
          <p className="font-medium text-yellow-900">
            ⚠ {unmatched.length} GeoJSON name
            {unmatched.length !== 1 ? "s" : ""} could not be matched
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-1 font-mono text-xs">
            {unmatched.map((name: string, i: number) => (
              <li key={`${name}-${i}`} className="text-yellow-900">
                {name}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-yellow-800">
            These render gray. Add a rule to <code>normalize()</code> if needed.
          </p>
        </div>
      )}
    </main>
  );
}