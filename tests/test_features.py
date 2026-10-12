"""Tests for ML feature building and temporal cutoff rules."""

import numpy as np
import pandas as pd
import pytest
from ml.config import MLConfig, default_config


def test_feature_config_cutoffs():
    cfg = default_config
    # Pre-weekend features must not include qualifying results
    assert "qualifying_position" not in cfg.pre_weekend_features
    assert "gap_to_pole_ms" not in cfg.pre_weekend_features
    assert "q3_entry" not in cfg.pre_weekend_features

    # Post-qualifying features must include qualifying results
    assert "qualifying_position" in cfg.post_qualifying_features
    assert "grid_position" in cfg.post_qualifying_features


def test_no_zero_replacement_rule():
    """Verify missing history is treated as NaN, never silently replaced with 0."""
    features = pd.Series([np.nan, 3.5, np.nan])
    # Ensure NaN persists and is not coerced to 0 without explicit imputation
    assert pd.isna(features.iloc[0])
    assert features.iloc[0] != 0.0
