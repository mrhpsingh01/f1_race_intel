"""
ml/evaluate/backtest.py
-----------------------
Chronological backtesting and evaluation utilities for F1 podium predictions.

Critical methodology rules:
1. Split by entire race sessions/seasons, never by random driver rows.
2. Evaluate probability calibration (Brier score, Log Loss) in addition to ranking.
"""

from __future__ import annotations

import logging
from typing import Callable, Dict, List, Tuple
import numpy as np
import pandas as pd
from sklearn.metrics import brier_score_loss, log_loss

logger = logging.getLogger(__name__)


def chronological_split(
    df: pd.DataFrame,
    train_seasons: List[int],
    val_seasons: List[int],
    test_seasons: List[int],
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Split feature dataframe by season to prevent lookahead leakage.
    """
    train = df[df["season"].isin(train_seasons)].copy()
    val = df[df["season"].isin(val_seasons)].copy()
    test = df[df["season"].isin(test_seasons)].copy()

    logger.info(
        "Chronological split - Train: %d rows (%d podiums), Val: %d rows (%d podiums), Test: %d rows (%d podiums)",
        len(train),
        train["target"].sum() if "target" in train else 0,
        len(val),
        val["target"].sum() if "target" in val else 0,
        len(test),
        test["target"].sum() if "target" in test else 0,
    )
    return train, val, test


def rolling_backtest(
    df: pd.DataFrame,
    feature_cols: List[str],
    target_col: str,
    train_model_fn: Callable[[pd.DataFrame, pd.Series], Any],
    min_train_seasons: int = 1,
) -> pd.DataFrame:
    """
    Simulate rolling deployment season-by-season:
    Train on seasons up to N, predict on season N+1.
    """
    seasons = sorted(df["season"].unique())
    all_results: List[pd.DataFrame] = []

    for idx in range(min_train_seasons, len(seasons)):
        train_seasons = seasons[:idx]
        test_season = seasons[idx]

        train_df = df[df["season"].isin(train_seasons)]
        test_df = df[df["season"] == test_season]

        if len(train_df) < 20 or len(test_df) < 10:
            continue

        X_train = train_df[feature_cols].fillna(-1)
        y_train = train_df[target_col]
        X_test = test_df[feature_cols].fillna(-1)
        y_test = test_df[target_col]

        try:
            model = train_model_fn(X_train, y_train)
            probas = model.predict_proba(X_test)[:, 1]

            res = test_df[["race_id", "driver_id", target_col]].copy()
            res["predicted_prob"] = probas
            res["test_season"] = test_season
            all_results.append(res)
        except Exception as exc:
            logger.warning("Backtest iteration failed for season %d: %s", test_season, exc)

    if not all_results:
        return pd.DataFrame()
    return pd.concat(all_results, ignore_index=True)


def compute_backtest_metrics(backtest_df: pd.DataFrame) -> Dict[str, Any]:
    """Calculate aggregate calibration and error metrics on backtest predictions."""
    if backtest_df.empty:
        return {"error": "No backtest data available"}

    y_true = backtest_df["target"].values
    y_pred = np.clip(backtest_df["predicted_prob"].values, 1e-6, 1 - 1e-6)

    bs = float(brier_score_loss(y_true, y_pred))
    ll = float(log_loss(y_true, y_pred, labels=[0, 1]))

    return {
        "overall_brier_score": round(bs, 4),
        "overall_log_loss": round(ll, 4),
        "total_evaluated_samples": len(backtest_df),
        "calibration_note": (
            f"Brier score: {bs:.4f} (closer to 0 is better). "
            f"Evaluated across {len(backtest_df)} driver starts."
        ),
    }
