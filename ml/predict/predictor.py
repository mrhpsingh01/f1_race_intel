"""
ml/predict/predictor.py
-----------------------
Podium prediction execution and database persistence.
Supports both PRE_WEEKEND and POST_QUALIFYING inference modes.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd
from psycopg2.extensions import connection as PgConnection

from ml.config import MLConfig, default_config
from ml.train.trainer import get_feature_importance, load_model
from pipelines.build_features.feature_builder import (
    build_post_qualifying_features,
    build_pre_weekend_features,
)

logger = logging.getLogger(__name__)


class PodiumPredictor:
    """Predicts probability of a podium finish for each driver."""

    def __init__(
        self,
        model_version: str,
        config: MLConfig = default_config,
        model_dir: str = "ml/models",
    ) -> None:
        self.model_version = model_version
        self.config = config
        self.model_dir = model_dir
        self._pre_model = None
        self._post_model = None

    def _ensure_models_loaded(self) -> None:
        if self._pre_model is None:
            try:
                self._pre_model = load_model(f"{self.model_version}_pre", self.model_dir)
            except Exception as e:
                logger.warning("Could not load pre-weekend model %s_pre: %s", self.model_version, e)

        if self._post_model is None:
            try:
                self._post_model = load_model(f"{self.model_version}_post", self.model_dir)
            except Exception as e:
                logger.warning("Could not load post-qualifying model %s_post: %s", self.model_version, e)

    def predict(
        self,
        features_df: pd.DataFrame,
        cutoff_type: str = "PRE_WEEKEND",
    ) -> pd.DataFrame:
        """
        Generate predictions and key driving factors.
        """
        if features_df.empty:
            return pd.DataFrame()

        self._ensure_models_loaded()

        if cutoff_type == "PRE_WEEKEND":
            model = self._pre_model
            feature_cols = self.config.pre_weekend_features
        else:
            model = self._post_model or self._pre_model
            feature_cols = (
                self.config.post_qualifying_features
                if self._post_model is not None
                else self.config.pre_weekend_features
            )

        df = features_df.copy()
        for col in feature_cols:
            if col not in df.columns:
                df[col] = np.nan

        X = df[feature_cols].fillna(-1)

        if model is not None:
            raw_probs = model.predict_proba(X)[:, 1]
            importances = get_feature_importance(model, feature_cols)
        else:
            # Fallback heuristic baseline if model pickle not present on disk
            logger.info("Using baseline heuristic for prediction")
            if "qualifying_position" in df.columns and cutoff_type == "POST_QUALIFYING":
                raw_probs = np.clip(1.0 / (df["qualifying_position"].fillna(15) * 1.5 + 0.5), 0.02, 0.75)
            else:
                raw_probs = np.clip(1.0 / (df["driver_avg_finish_last5"].fillna(12) * 1.8 + 1.0), 0.02, 0.65)
            importances = [
                {"feature": "driver_avg_finish_last5", "importance": 0.45},
                {"feature": "team_avg_finish_last5", "importance": 0.35},
                {"feature": "circuit_best_result", "importance": 0.20},
            ]

        # Normalization / shaping: probability bounds
        probs = np.clip(raw_probs, 0.01, 0.95)

        out = pd.DataFrame({
            "driver_id": df["driver_id"].values,
            "probability": probs,
            "cutoff_type": cutoff_type,
            "model_version": self.model_version,
            "cutoff_time": datetime.now(timezone.utc),
        })

        # Key factors per driver
        factor_list = []
        for _, row in df.iterrows():
            driver_factors = []
            for imp in importances[:4]:
                f_name = imp["feature"]
                val = row.get(f_name)
                val_repr = round(val, 2) if isinstance(val, (int, float)) and pd.notna(val) else "N/A"
                direction = "positive" if f_name in ["driver_podium_rate_last10", "team_points_last5"] or (val and val <= 4) else "neutral"
                driver_factors.append({
                    "name": f_name.replace("_", " ").title(),
                    "value": val_repr,
                    "direction": direction,
                })
            factor_list.append(driver_factors)

        out["feature_importance"] = factor_list
        return out.sort_values("probability", ascending=False)


def run_and_save_predictions(
    conn: PgConnection,
    race_id: int,
    cutoff_type: str = "PRE_WEEKEND",
    model_version: str = "v1.0",
) -> List[Dict[str, Any]]:
    """
    End-to-end: build features, run inference, write to predictions table.
    """
    if cutoff_type == "PRE_WEEKEND":
        feat_df = build_pre_weekend_features(conn, race_id)
    else:
        feat_df = build_post_qualifying_features(conn, race_id)

    if feat_df.empty:
        logger.warning("No features could be generated for race %d (%s)", race_id, cutoff_type)
        return []

    predictor = PodiumPredictor(model_version=model_version)
    preds = predictor.predict(feat_df, cutoff_type=cutoff_type)

    # Save to database
    with conn.cursor() as cur:
        for _, row in preds.iterrows():
            cur.execute(
                """
                INSERT INTO predictions (race_id, driver_id, cutoff_type, cutoff_time, probability, model_version, feature_importance)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (race_id, driver_id, cutoff_type) DO UPDATE
                SET probability = EXCLUDED.probability,
                    model_version = EXCLUDED.model_version,
                    feature_importance = EXCLUDED.feature_importance,
                    cutoff_time = EXCLUDED.cutoff_time
                """,
                (
                    race_id,
                    int(row["driver_id"]),
                    cutoff_type,
                    row["cutoff_time"],
                    float(row["probability"]),
                    row["model_version"],
                    json.dumps(row["feature_importance"]),
                ),
            )
        conn.commit()

    logger.info("Saved %d predictions for race %d [%s]", len(preds), race_id, cutoff_type)
    return preds.to_dict("records")
