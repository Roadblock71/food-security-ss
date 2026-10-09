"""Feature engineering at inference time. Mirrors the training notebook exactly."""
import json
import numpy as np
import pandas as pd
from pathlib import Path

IPC_ORDER = {"Minimal": 1, "Stressed": 2, "Crisis": 3,
             "Emergency": 4, "Catastrophe": 5}

ART = Path(__file__).resolve().parent / "artifacts"

_LAG_COLS = [
    "prior_period_phase3plus_pct",
    "prior_year_cereal_production_tonnes",
    "prior_year_cereal_gap_tonnes",
    "population",
]

_HISTORY_CACHE = None


def load_history() -> pd.DataFrame:
    global _HISTORY_CACHE
    if _HISTORY_CACHE is None:
        _HISTORY_CACHE = pd.read_csv(ART / "history.csv")
    return _HISTORY_CACHE


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
    """Concatenate training history so lag features are computed correctly."""
    new_rows = pd.DataFrame(payloads)
    new_rows["_is_new"] = True

    history = load_history().copy()
    history["_is_new"] = False

    combined = pd.concat([history, new_rows], ignore_index=True, sort=False)
    combined = engineer_features(combined)
    combined = _add_county_history(combined)

    return combined[combined["_is_new"]].drop(columns=["_is_new"]).reset_index(drop=True)