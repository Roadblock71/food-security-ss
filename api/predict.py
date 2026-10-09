"""Vercel Python Function — FastAPI backend for food security risk prediction."""
import json
import sys
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from model.feature_pipeline import build_feature_matrix

ART = Path(__file__).resolve().parent.parent / "model" / "artifacts"

# ── Load the RF model (pickle) ──
try:
    bundle = joblib.load(ART / "blend_model.pkl")
    FEATURES = joblib.load(ART / "feature_list.pkl")
except Exception as e:
    raise RuntimeError(
        f"Model artifact load failed: {type(e).__name__}: {e}\n"
        f"ART dir contents: "
        f"{sorted(p.name for p in ART.iterdir()) if ART.exists() else 'missing'}"
    ) from e

# ── Load the imputer medians (JSON — no sklearn pickle issues) ──
try:
    with open(ART / "imputer_medians.json") as f:
        IMPUTER_MEDIANS: dict = json.load(f)
except Exception as e:
    raise RuntimeError(
        f"imputer_medians.json load failed: {type(e).__name__}: {e}"
    ) from e


def _impute(X: pd.DataFrame) -> np.ndarray:
    """Median-impute using saved JSON values. Pure pandas — no sklearn version issues."""
    X = X.copy()
    for col, val in IMPUTER_MEDIANS.items():
        if col in X.columns:
            X[col] = X[col].fillna(val)
    return X.to_numpy(dtype=float)


app = FastAPI(title="South Sudan Food Security Risk API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)


class Payload(BaseModel):
    population: float = Field(..., gt=0)
    start_year: int = Field(..., ge=2000, le=2100)
    start_month: int = Field(..., ge=1, le=12)
    prior_period_ipc_phase: str
    prior_period_phase3plus_pct: float = Field(..., ge=0, le=100)
    prior_year_cereal_production_tonnes: float
    prior_year_cereal_gap_tonnes: float
    state: str
    county: str


class Prediction(BaseModel):
    probability: float
    band: str


def _band(p: float) -> str:
    if p < 0.35: return "Low"
    if p < 0.60: return "Moderate"
    if p < 0.85: return "High"
    return "Very High"


def _predict(frame: pd.DataFrame) -> np.ndarray:
    X = _impute(frame[FEATURES])
    X_df = pd.DataFrame(X, columns=FEATURES)
    probs = np.zeros(len(X_df))
    total_w = sum(bundle["weights"].values())
    for name, model in bundle["models"].items():
        probs += bundle["weights"][name] * model.predict_proba(X_df)[:, 1]
    return probs / total_w


def _err_response(prefix: str, e: Exception) -> HTTPException:
    tb = traceback.format_exc()
    print(f"=== {prefix} ===")
    print(tb)
    return HTTPException(
        status_code=500,
        detail=f"{prefix}: {type(e).__name__}: {e}\n\n{tb[-2000:]}",
    )


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "features": len(FEATURES),
        "models": list(bundle["models"]),
        "imputer_medians_loaded": len(IMPUTER_MEDIANS),
        "artifacts_present": sorted(p.name for p in ART.iterdir()) if ART.exists() else [],
    }


@app.get("/api/debug")
def debug():
    from model.feature_pipeline import load_history, ART as FP_ART
    try:
        hist = load_history()
        return {
            "history_loaded": True,
            "history_rows": int(len(hist)),
            "history_columns": list(hist.columns),
            "history_path": str(FP_ART / "history.csv"),
            "medians_count": len(IMPUTER_MEDIANS),
            "medians_sample": dict(list(IMPUTER_MEDIANS.items())[:3]),
        }
    except Exception as e:
        return {
            "history_loaded": False,
            "error": f"{type(e).__name__}: {e}",
            "traceback": traceback.format_exc()[-1500:],
        }


@app.post("/api/predict", response_model=Prediction)
def predict(p: Payload):
    try:
        frame = build_feature_matrix([p.model_dump()])
        prob = float(_predict(frame)[0])
    except Exception as e:
        raise _err_response("PREDICT ERROR", e)
    return Prediction(probability=prob, band=_band(prob))


@app.post("/api/predict_batch", response_model=list[Prediction])
def predict_batch(rows: list[Payload]):
    if len(rows) > 200:
        raise HTTPException(status_code=400, detail="Batch limit is 200 rows")
    try:
        frame = build_feature_matrix([r.model_dump() for r in rows])
        probs = _predict(frame)
        return [Prediction(probability=float(p), band=_band(float(p))) for p in probs]
    except Exception as e:
        raise _err_response("BATCH ERROR", e)