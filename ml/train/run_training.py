"""
ml/train/run_training.py
------------------------
CLI script to train baseline, logistic regression, and XGBoost models.

Usage:
    python ml/train/run_training.py --train-seasons 2021 2022 --val-seasons 2023 --test-seasons 2024 --use-sample-data
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from datetime import datetime
from pathlib import Path
import numpy as np
import pandas as pd

# Add repo root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from ml.config import MLConfig, default_config
from ml.evaluate.backtest import chronological_split, compute_backtest_metrics, rolling_backtest
from ml.train.trainer import (
    BaselineQualifyingModel,
    BaselineRecentFormModel,
    evaluate_model,
    save_model,
    train_logistic_regression,
    train_xgboost,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("run_training")


def generate_synthetic_training_data(n_seasons: int = 4) -> pd.DataFrame:
    """Generate realistic synthetic feature set for benchmarking and testing."""
    np.random.seed(42)
    rows = []
    base_year = 2021

    for s_idx in range(n_seasons):
        season = base_year + s_idx
        for rnd in range(1, 23):
            race_id = s_idx * 100 + rnd
            for driver_id in range(1, 21):
                # Realistic driver form & team performance
                team_tier = 1 if driver_id <= 4 else (2 if driver_id <= 10 else 3)
                driver_avg = np.random.normal(team_tier * 4.5, 2.0)
                driver_avg = float(np.clip(driver_avg, 1.0, 20.0))
                team_points = float(np.clip(np.random.normal((4 - team_tier) * 40, 15), 0, 150))
                quali_pos = int(np.clip(np.random.normal(team_tier * 4.5, 2.5), 1, 20))
                podium_rate = float(np.clip(0.6 - (team_tier - 1) * 0.25 + np.random.normal(0, 0.1), 0.0, 0.9))

                rows.append({
                    "race_id": race_id,
                    "season": season,
                    "round": rnd,
                    "circuit_id": (rnd % 12) + 1,
                    "driver_id": driver_id,
                    "driver_avg_finish_last5": driver_avg,
                    "driver_podium_rate_last10": podium_rate,
                    "team_avg_finish_last5": driver_avg * 0.95,
                    "team_points_last5": team_points,
                    "circuit_best_result": int(np.clip(driver_avg * 0.8, 1, 20)),
                    "circuit_avg_result": driver_avg,
                    "driver_experience": np.random.randint(5, 250),
                    "is_home_race": 1 if np.random.rand() < 0.05 else 0,
                    "qualifying_position": quali_pos,
                    "grid_position": quali_pos,
                    "gap_to_pole_ms": int((quali_pos - 1) * 120 + max(0, np.random.normal(0, 50))),
                    "q3_entry": 1 if quali_pos <= 10 else 0,
                })

    df = pd.DataFrame(rows)

    # Label top 3 finishers per race
    df["target"] = 0
    for race_id in df["race_id"].unique():
        idx = df[df["race_id"] == race_id].index
        # Score combines quali and driver avg finish
        scores = (
            df.loc[idx, "qualifying_position"] * 0.5
            + df.loc[idx, "driver_avg_finish_last5"] * 0.5
            + np.random.normal(0, 1.0, size=len(idx))
        )
        podium_indices = scores.nsmallest(3).index
        df.loc[podium_indices, "target"] = 1

    return df


def main() -> None:
    parser = argparse.ArgumentParser(description="Train F1 podium prediction models")
    parser.add_argument("--train-seasons", nargs="+", type=int, default=[2021, 2022])
    parser.add_argument("--val-seasons", nargs="+", type=int, default=[2023])
    parser.add_argument("--test-seasons", nargs="+", type=int, default=[2024])
    parser.add_argument("--model-version", type=str, default="v1.0")
    parser.add_argument("--model-dir", type=str, default="ml/models")
    parser.add_argument("--use-sample-data", action="store_true", default=True)
    args = parser.parse_args()

    config = default_config
    logger.info("Generating dataset for model training (sample data: %s)...", args.use_sample_data)
    df = generate_synthetic_training_data(n_seasons=4)

    results: dict = {}
    train, val, test = chronological_split(
        df,
        args.train_seasons,
        args.val_seasons,
        args.test_seasons,
    )

    for cutoff, feat_cols, suffix in [
        ("PRE_WEEKEND", config.pre_weekend_features, "pre"),
        ("POST_QUALIFYING", config.post_qualifying_features, "post"),
    ]:
        logger.info("--- Training %s Model ---", cutoff)
        X_train, y_train = train[feat_cols].fillna(-1), train["target"]
        X_test, y_test = test[feat_cols].fillna(-1), test["target"]

        # 1. Baseline
        if cutoff == "POST_QUALIFYING":
            base_q = BaselineQualifyingModel()
            metrics_q = evaluate_model(base_q, X_test, y_test, feat_cols, "QualifyingBaseline")
            results[f"{cutoff}_qualifying_baseline"] = metrics_q

        base_form = BaselineRecentFormModel().fit(X_train, y_train)
        metrics_form = evaluate_model(base_form, X_test, y_test, feat_cols, "RecentFormBaseline")
        results[f"{cutoff}_form_baseline"] = metrics_form

        # 2. Logistic Regression
        lr_model = train_logistic_regression(train, y_train, feat_cols)
        metrics_lr = evaluate_model(lr_model, X_test, y_test, feat_cols, "LogisticRegression")
        results[f"{cutoff}_logistic"] = metrics_lr

        # 3. XGBoost
        xgb_model = train_xgboost(train, y_train, feat_cols, config)
        metrics_xgb = evaluate_model(xgb_model, X_test, y_test, feat_cols, "XGBoost")
        results[f"{cutoff}_xgboost"] = metrics_xgb

        # Save artifacts
        save_model(xgb_model, f"{args.model_version}_{suffix}", args.model_dir)

    # Write metrics report
    metrics_path = Path(args.model_dir) / f"{args.model_version}_metrics.json"
    metrics_path.parent.mkdir(parents=True, exist_ok=True)
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    logger.info("Saved model evaluation metrics to %s", metrics_path)
    logger.info("Training pipeline completed successfully.")


if __name__ == "__main__":
    main()
