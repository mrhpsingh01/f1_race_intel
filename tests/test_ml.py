"""Tests for ML baseline and calibrated classifier models."""

import numpy as np
import pandas as pd
import pytest
from ml.config import default_config
from ml.train.trainer import (
    BaselineQualifyingModel,
    BaselineRecentFormModel,
    train_logistic_regression,
)


def test_baseline_qualifying_model():
    model = BaselineQualifyingModel()
    X = pd.DataFrame({"qualifying_position": [1, 2, 3, 10, 20]})
    probas = model.predict_proba(X)
    assert probas.shape == (5, 2)
    # Pole position (P1) must have higher probability than P10
    assert probas[0, 1] > probas[3, 1]
    # Probabilities sum to 1 per row
    assert np.allclose(probas.sum(axis=1), 1.0)


def test_baseline_recent_form_model():
    model = BaselineRecentFormModel()
    X = pd.DataFrame({"driver_avg_finish_last5": [1.2, 5.0, 15.0]})
    y = pd.Series([1, 1, 0])
    model.fit(X, y)
    probas = model.predict_proba(X)
    assert probas.shape == (3, 2)
    # Lower average finish (better performance) gets higher podium probability
    assert probas[0, 1] > probas[2, 1]


def test_logistic_regression_calibration():
    X_train = pd.DataFrame({
        "driver_avg_finish_last5": [1.0, 2.0, 3.0, 10.0, 12.0, 15.0, 2.0, 4.0, 14.0],
        "driver_podium_rate_last10": [0.8, 0.7, 0.6, 0.1, 0.0, 0.0, 0.5, 0.4, 0.0],
        "team_avg_finish_last5": [2.0, 2.0, 3.0, 9.0, 10.0, 14.0, 3.0, 4.0, 13.0],
        "team_points_last5": [150, 140, 120, 20, 15, 0, 100, 80, 5],
        "circuit_best_result": [1, 1, 2, 8, 10, 12, 2, 3, 11],
        "circuit_avg_result": [1.5, 2.2, 3.1, 9.5, 11.2, 13.5, 2.8, 4.0, 12.1],
        "driver_experience": [100, 80, 50, 40, 30, 20, 60, 45, 25],
        "is_home_race": [0, 0, 0, 1, 0, 0, 0, 0, 0],
    })
    y_train = pd.Series([1, 1, 1, 0, 0, 0, 1, 0, 0])
    pipe = train_logistic_regression(X_train, y_train, default_config.pre_weekend_features)
    probas = pipe.predict_proba(X_train)[:, 1]
    assert len(probas) == len(X_train)
    assert np.all((probas >= 0.0) & (probas <= 1.0))
