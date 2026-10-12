"""Tests for telemetry processing, interpolation, and delta computation."""

import numpy as np
import pandas as pd
import pytest
from pipelines.ingest_sessions.telemetry_processor import (
    assess_lap_quality,
    compute_time_delta,
    convert_to_distance_axis,
    interpolate_to_grid,
    load_from_parquet,
    save_to_parquet,
)


def test_convert_to_distance_axis():
    raw_data = pd.DataFrame({
        "Speed": [100.0, 200.0, 300.0],
        "Distance": [0.0, 50.0, 100.0],
        "Time": [pd.Timedelta(seconds=0), pd.Timedelta(seconds=1), pd.Timedelta(seconds=2)],
    })
    converted = convert_to_distance_axis(raw_data)
    assert "Distance" in converted.columns
    assert converted["Distance"].is_monotonic_increasing


def test_interpolate_to_grid():
    data = pd.DataFrame({
        "Distance": [0.0, 100.0, 200.0],
        "Speed": [100.0, 200.0, 300.0],
        "Throttle": [50.0, 100.0, 100.0],
    })
    grid = np.array([0.0, 50.0, 100.0, 150.0, 200.0])
    interpolated = interpolate_to_grid(data, grid)
    assert len(interpolated) == 5
    assert np.isclose(interpolated["Speed"].iloc[1], 150.0)
    assert np.isclose(interpolated["Throttle"].iloc[1], 75.0)


def test_compute_time_delta():
    # Car A travels faster than Car B
    dist = np.array([0.0, 100.0, 200.0])
    df_a = pd.DataFrame({"Distance": dist, "Speed": [200.0, 200.0, 200.0]})  # faster
    df_b = pd.DataFrame({"Distance": dist, "Speed": [100.0, 100.0, 100.0]})  # slower

    delta = compute_time_delta(df_a, df_b)
    assert len(delta) == len(dist)
    # Time delta over distance should accumulate monotonically
    assert delta[-1] < 0  # Car A took less time


def test_assess_lap_quality():
    good_data = pd.DataFrame({
        "Distance": np.linspace(0, 5000, 300),
        "Speed": np.linspace(100, 300, 300),
    })
    quality = assess_lap_quality(good_data)
    assert quality["sample_count"] == 300
    assert not quality["missing_samples"]
    assert not quality["has_gaps"]
