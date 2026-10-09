"""Feature engineering at inference time. Mirrors the training notebook exactly."""
import numpy as np
import pandas as pd
from pathlib import Path

IPC_ORDER = {"Minimal": 1, "Stressed": 2, "Crisis": 3,
             "Emergency": 4, "Catastrophe": 5}

ART = Path(__file__).resolve().parent / "artifacts"

# The nine raw columns we work with. Defined once so both history and
# incoming payloads get the exact same column order before concat.
RAW_COLS = [
    "state", "county", "population", "start_year", "start_month",
    "prior_period_ipc_phase", "prior_period_phase3plus_pct",
    "prior_year_cereal_production_tonnes", "prior_year_cereal_gap_tonnes",
]

_NUMERIC_COLS = [
    "population", "start_year", "start_month",
    "prior_period_phase3plus_pct",
    "prior_year_cereal_production_tonnes", "prior_year_cereal_gap_tonnes",
]

_LAG_COLS = [
    "prior_period_phase3plus_pct",
    "prior_year_cereal_production_tonnes",
    "prior_year_cereal_gap_tonnes",
    "population",
]

_HISTORY_CACHE = None


def load_history() -> pd.DataFrame:
    """Load and cache history.csv. Raise a clear error if it's not bundled."""
    global _HISTORY_CACHE
    if _HISTORY_CACHE is not None:
        return _HISTORY_CACHE

    path = ART / "history.csv"
    if not path.exists():
        # Diagnostic: list what IS in the artifacts directory
        try:
            present = sorted(p.name for p in ART.iterdir())
        except FileNotFoundError:
            present = f"directory {ART} does not exist"
        raise RuntimeError(
            f"history.csv not found at {path}. "
            f"Contents of {ART}: {present}"
        )

    hist = pd.read_csv(path)
    hist["_is_new"] = False
    _HISTORY_CACHE = hist
    return hist


def _coerce_dtypes(df: pd.DataFrame) -> pd.DataFrame:
    """Force known columns to their expected dtype before concat."""
    df = df.copy()
    for col in _NUMERIC_COLS:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    for col in ["state", "county", "prior_period_ipc_phase"]:
        if col in df.columns:
            df[col] = df[col].astype(str)
    return df


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["prior_ipc_num"] = df["prior_period_ipc_phase"].map(IPC_ORDER)
    df["pop_at_risk"] = df["population"] * df["prior_period_phase3plus_pct"] / 100.0

    safe_pop = df["population"].replace(0, np.nan)
    df["production_per_person"] = df["prior_year_cereal_production_tonnes"] / safe_pop
    df["gap_per_person"] = df["prior_year_cereal_gap_tonnes"] / safe_pop

    safe_prod = df["prior_year_cereal_production_tonnes"].replace(0, np.nan)
    df["production_gap_ratio"] = (
        df["prior_year_cereal_gap_tonnes"] / safe_prod
    ).clip(-10, 10)

    df["persistence_score"] = df["prior_ipc_num"] * df["prior_period_phase3plus_pct"]
    df["month_sin"] = np.sin(2 * np.pi * df["start_month"] / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["start_month"] / 12)
    df["is_lean_season"] = df["start_month"].isin([5, 6, 7, 8]).astype(int)

    df.replace([np.inf, -np.inf], np.nan, inplace=True)
    return df


def _add_county_history(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["_t"] = df["start_year"] * 12 + df["start_month"]
    df = df.sort_values(["state", "county", "_t"]).reset_index(drop=True)

    g = df.groupby(["state", "county"], sort=False)
    for col in _LAG_COLS:
        for lag in (1, 2, 3):
            df[f"{col}_lag{lag}"] = g[col].shift(lag)
        df[f"{col}_roll3"] = g[col].transform(
            lambda s: s.shift(1).rolling(3, min_periods=1).mean())
        df[f"{col}_county_mean"] = g[col].transform("mean")
        df[f"{col}_county_std"] = g[col].transform("std")

    df["phase3plus_vs_county"] = (
        df["prior_period_phase3plus_pct"]
        - df["prior_period_phase3plus_pct_county_mean"])
    df["prod_vs_county"] = (
        df["prior_year_cereal_production_tonnes"]
        - df["prior_year_cereal_production_tonnes_county_mean"])

    return df.drop(columns=["_t"])


def build_feature_matrix(payloads: list[dict]) -> pd.DataFrame:
    """Concatenate training history + new rows, then compute features.

    Uses an explicit column list for both sides so pandas can't misalign on
    concat (which happens when the payload dict order differs from CSV order).
    """
    # Build new rows with the exact same columns/order as history
    new_rows = pd.DataFrame(payloads).copy()
    missing = [c for c in RAW_COLS if c not in new_rows.columns]
    if missing:
        raise ValueError(f"Payload missing required columns: {missing}")
    new_rows = new_rows[RAW_COLS]
    new_rows = _coerce_dtypes(new_rows)
    new_rows["_is_new"] = True

    history = load_history().copy()
    # Same treatment for history
    if "state" in history.columns:  # sanity — column should always exist
        history = history[RAW_COLS + ["_is_new"]].copy()
    history = _coerce_dtypes(history)

    combined = pd.concat([history, new_rows], ignore_index=True, sort=False)
    combined = engineer_features(combined)
    combined = _add_county_history(combined)

    out = combined[combined["_is_new"]].drop(columns=["_is_new"]).reset_index(drop=True)
    return out