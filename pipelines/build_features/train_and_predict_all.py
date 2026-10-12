"""
pipelines/build_features/train_and_predict_all.py
-------------------------------------------------
1. Builds real historical features from PostgreSQL database.
2. Trains calibrated XGBoost models (pre-weekend and post-qualifying) on real historical data.
3. Evaluates models and saves artifacts to ml/models/.
4. Generates time-safe predictions for all races across 2021-2026.
5. Persists predictions with driving factors into PostgreSQL predictions table.
"""

import sys
import json
import logging
import time
from pathlib import Path
import numpy as np
import pandas as pd
from sqlalchemy import text
from database import engine

from ml.config import default_config
from ml.train.trainer import train_xgboost, evaluate_model, save_model
from ml.predict.predictor import PodiumPredictor
from pipelines.db import get_connection
from pipelines.build_features.feature_builder import (
    build_pre_weekend_features,
    build_post_qualifying_features,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("train_and_predict")

def extract_features_dataset():
    logger.info("Extracting feature dataset across all races in database...")
    pre_dfs = []
    post_dfs = []

    with engine.connect() as conn:
        races = conn.execute(text("SELECT id, season, round, name, status FROM races ORDER BY season, round")).fetchall()

    with get_connection() as pg_conn:
        for r in races:
            rid, season, rnd, name, status = r[0], r[1], r[2], r[3], r[4]
            pre = build_pre_weekend_features(pg_conn, rid)
            if not pre.empty:
                pre["season"] = season
                pre["round"] = rnd
                pre_dfs.append(pre)

            post = build_post_qualifying_features(pg_conn, rid)
            if not post.empty:
                post["season"] = season
                post["round"] = rnd
                post_dfs.append(post)

    df_pre = pd.concat(pre_dfs, ignore_index=True) if pre_dfs else pd.DataFrame()
    df_post = pd.concat(post_dfs, ignore_index=True) if post_dfs else pd.DataFrame()

    logger.info(f"Extracted {len(df_pre)} pre-weekend rows, {len(df_post)} post-qualifying rows")
    return df_pre, df_post

def train_and_save_models(df_pre: pd.DataFrame, df_post: pd.DataFrame):
    logger.info("Training models on historical data (2021-2024)...")
    config = default_config
    model_dir = "ml/models"
    model_version = "v1.0"
    metrics_summary = {}

    # Train PRE_WEEKEND model
    train_mask_pre = df_pre["season"] <= 2024
    test_mask_pre = df_pre["season"] == 2025

    X_train_pre = df_pre[train_mask_pre][config.pre_weekend_features].fillna(-1)
    y_train_pre = df_pre[train_mask_pre][config.target_col]

    pre_model = train_xgboost(X_train_pre, y_train_pre, config.pre_weekend_features, config)
    save_model(pre_model, f"{model_version}_pre", model_dir)

    if test_mask_pre.sum() > 0:
        X_test_pre = df_pre[test_mask_pre][config.pre_weekend_features].fillna(-1)
        y_test_pre = df_pre[test_mask_pre][config.target_col]
        eval_pre = evaluate_model(pre_model, X_test_pre, y_test_pre, config.pre_weekend_features, "XGBoost_Pre")
        metrics_summary["PRE_WEEKEND"] = eval_pre

    # Train POST_QUALIFYING model
    train_mask_post = df_post["season"] <= 2024
    test_mask_post = df_post["season"] == 2025

    X_train_post = df_post[train_mask_post][config.post_qualifying_features].fillna(-1)
    y_train_post = df_post[train_mask_post][config.target_col]

    post_model = train_xgboost(X_train_post, y_train_post, config.post_qualifying_features, config)
    save_model(post_model, f"{model_version}_post", model_dir)

    if test_mask_post.sum() > 0:
        X_test_post = df_post[test_mask_post][config.post_qualifying_features].fillna(-1)
        y_test_post = df_post[test_mask_post][config.target_col]
        eval_post = evaluate_model(post_model, X_test_post, y_test_post, config.post_qualifying_features, "XGBoost_Post")
        metrics_summary["POST_QUALIFYING"] = eval_post

    # Save metrics JSON
    with open(Path(model_dir) / f"{model_version}_metrics.json", "w") as f:
        json.dump(metrics_summary, f, indent=2)
    logger.info("Saved trained model artifacts and evaluation metrics.")

    return pre_model, post_model

def ensure_predictions_constraint():
    with engine.begin() as conn:
        try:
            conn.execute(text("""
                DELETE FROM predictions a USING predictions b
                WHERE a.id > b.id AND a.race_id = b.race_id AND a.driver_id = b.driver_id AND a.cutoff_type = b.cutoff_type;
            """))
            conn.execute(text("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint WHERE conname = 'uq_predictions_race_driver_cutoff'
                    ) THEN
                        ALTER TABLE predictions ADD CONSTRAINT uq_predictions_race_driver_cutoff UNIQUE (race_id, driver_id, cutoff_type);
                    END IF;
                END $$;
            """))
        except Exception as e:
            logger.warning(f"Note on predictions constraint: {e}")

def run_predictions_all_races(df_pre: pd.DataFrame, df_post: pd.DataFrame):
    ensure_predictions_constraint()
    logger.info("Running predictions with trained models across all races...")
    predictor = PodiumPredictor(model_version="v1.0")

    with engine.begin() as conn:
        # Pre-weekend predictions
        for race_id in df_pre["race_id"].unique():
            race_df = df_pre[df_pre["race_id"] == race_id].copy()
            preds = predictor.predict(race_df, cutoff_type="PRE_WEEKEND")
            for _, row in preds.iterrows():
                conn.execute(
                    text("""
                        INSERT INTO predictions (race_id, driver_id, cutoff_type, cutoff_time, probability, model_version, feature_importance)
                        VALUES (:rid, :did, :ctype, :time, :prob, :ver, :feat)
                        ON CONFLICT (race_id, driver_id, cutoff_type) DO UPDATE
                        SET probability = EXCLUDED.probability,
                            feature_importance = EXCLUDED.feature_importance,
                            cutoff_time = EXCLUDED.cutoff_time
                    """),
                    {
                        "rid": int(race_id),
                        "did": int(row["driver_id"]),
                        "ctype": "PRE_WEEKEND",
                        "time": row["cutoff_time"],
                        "prob": float(row["probability"]),
                        "ver": "v1.0",
                        "feat": json.dumps(row["feature_importance"])
                    }
                )

        # Post-qualifying predictions
        for race_id in df_post["race_id"].unique():
            race_df = df_post[df_post["race_id"] == race_id].copy()
            preds = predictor.predict(race_df, cutoff_type="POST_QUALIFYING")
            for _, row in preds.iterrows():
                conn.execute(
                    text("""
                        INSERT INTO predictions (race_id, driver_id, cutoff_type, cutoff_time, probability, model_version, feature_importance)
                        VALUES (:rid, :did, :ctype, :time, :prob, :ver, :feat)
                        ON CONFLICT (race_id, driver_id, cutoff_type) DO UPDATE
                        SET probability = EXCLUDED.probability,
                            feature_importance = EXCLUDED.feature_importance,
                            cutoff_time = EXCLUDED.cutoff_time
                    """),
                    {
                        "rid": int(race_id),
                        "did": int(row["driver_id"]),
                        "ctype": "POST_QUALIFYING",
                        "time": row["cutoff_time"],
                        "prob": float(row["probability"]),
                        "ver": "v1.0",
                        "feat": json.dumps(row["feature_importance"])
                    }
                )

    logger.info("All race predictions successfully updated in database!")

def main():
    t0 = time.time()
    df_pre, df_post = extract_features_dataset()
    train_and_save_models(df_pre, df_post)
    run_predictions_all_races(df_pre, df_post)
    logger.info(f"Done in {time.time() - t0:.2f}s!")

if __name__ == "__main__":
    main()
