"""
pipelines/ingest_sessions/telemetry_processor.py
--------------------------------------------------
Process raw FastF1 car telemetry data for storage and analysis.

All functions operate on :class:`pandas.DataFrame` objects and are
designed to be composable (each function does one thing).
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Distance-axis helpers
# ---------------------------------------------------------------------------

def convert_to_distance_axis(car_data: pd.DataFrame) -> pd.DataFrame:
    """Ensure telemetry is indexed by the ``Distance`` column.

    FastF1's ``get_car_data().add_distance()`` already provides a
    ``Distance`` column in metres.  This function validates that column's
    presence, removes duplicate distance values (keeping the last sample),
    and sorts by distance.

    Args:
        car_data: Raw telemetry DataFrame from FastF1.

    Returns:
        A copy sorted and de-duplicated on ``Distance``.

    Raises:
        ValueError: If the ``Distance`` column is missing.
    """
    if "Distance" not in car_data.columns:
        raise ValueError(
            "car_data must contain a 'Distance' column. "
            "Call .add_distance() on the FastF1 car data first."
        )
    df = car_data.copy()
    df = df.sort_values("Distance")
    df = df.drop_duplicates(subset=["Distance"], keep="last")
    df = df.reset_index(drop=True)
    return df


def interpolate_to_grid(
    data: pd.DataFrame,
    distance_points: np.ndarray,
    columns: Optional[list[str]] = None,
) -> pd.DataFrame:
    """Interpolate telemetry channels to a uniform distance grid.

    Args:
        data: DataFrame with a ``Distance`` column (output of
            :func:`convert_to_distance_axis`).
        distance_points: 1-D array of target distance values in metres.
        columns: Columns to interpolate. Defaults to
            ``['Speed', 'Throttle', 'Brake', 'nGear', 'DRS']``.

    Returns:
        DataFrame indexed by *distance_points* with the interpolated columns.
    """
    if columns is None:
        columns = ["Speed", "Throttle", "Brake", "nGear", "DRS"]

    src_distance = data["Distance"].to_numpy(dtype=float)
    result = {"Distance": distance_points}

    for col in columns:
        if col not in data.columns:
            logger.warning("Column '%s' not found in telemetry data – filling NaN", col)
            result[col] = np.full_like(distance_points, np.nan, dtype=float)
            continue
        src_values = data[col].to_numpy(dtype=float)
        result[col] = np.interp(distance_points, src_distance, src_values)

    return pd.DataFrame(result)


# ---------------------------------------------------------------------------
# Time delta
# ---------------------------------------------------------------------------

def compute_time_delta(
    data_a: pd.DataFrame,
    data_b: pd.DataFrame,
) -> np.ndarray:
    """Compute the cumulative time gap between two laps on the same distance grid.

    Both DataFrames must share an identical ``Distance`` column (i.e. both
    have been through :func:`interpolate_to_grid` with the same grid).

    Formula::

        delta[i] = cumsum( dist_step[i] / speed_a[i]
                         - dist_step[i] / speed_b[i] ) * 1000   [ms]

    Positive delta means *a* is *ahead* (faster) at that point on track.

    Args:
        data_a: Interpolated telemetry for the reference lap.
        data_b: Interpolated telemetry for the comparison lap.

    Returns:
        1-D ``np.ndarray`` of cumulative time delta in milliseconds,
        same length as the grid.

    Raises:
        ValueError: If the two DataFrames do not share the same distance grid.
    """
    dist_a = data_a["Distance"].to_numpy(dtype=float)
    dist_b = data_b["Distance"].to_numpy(dtype=float)

    if not np.allclose(dist_a, dist_b, atol=1e-3):
        raise ValueError(
            "data_a and data_b must share the same distance grid. "
            "Run both through interpolate_to_grid() with the same distance_points."
        )

    speed_a = data_a["Speed"].to_numpy(dtype=float)
    speed_b = data_b["Speed"].to_numpy(dtype=float)

    # Distance step between consecutive grid points
    dist_steps = np.diff(dist_a, prepend=dist_a[0])

    # Avoid division by zero (stopped car / missing data)
    with np.errstate(divide="ignore", invalid="ignore"):
        dt_a = np.where(speed_a > 0, dist_steps / speed_a, 0.0)
        dt_b = np.where(speed_b > 0, dist_steps / speed_b, 0.0)

    delta_ms: np.ndarray = np.cumsum(dt_a - dt_b) * 1000.0
    return delta_ms


# ---------------------------------------------------------------------------
# Parquet I/O
# ---------------------------------------------------------------------------

def save_to_parquet(data: pd.DataFrame, file_path: str) -> None:
    """Persist *data* to a Parquet file, creating parent dirs as needed.

    Args:
        data: DataFrame to serialise.
        file_path: Absolute or relative output path (``*.parquet``).
    """
    path = Path(file_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    data.to_parquet(path, index=False, engine="pyarrow", compression="snappy")
    logger.debug("Saved telemetry Parquet → %s (%d rows)", path, len(data))


def load_from_parquet(file_path: str) -> pd.DataFrame:
    """Load a Parquet file and return a DataFrame.

    Args:
        file_path: Path to the Parquet file.

    Returns:
        Loaded :class:`pandas.DataFrame`.

    Raises:
        FileNotFoundError: If the file does not exist.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Parquet file not found: {path}")
    df = pd.read_parquet(path, engine="pyarrow")
    logger.debug("Loaded Parquet ← %s (%d rows)", path, len(df))
    return df


# ---------------------------------------------------------------------------
# Lap quality assessment
# ---------------------------------------------------------------------------

# Minimum expected samples per km of lap distance
_MIN_SAMPLES_PER_KM = 10
# Maximum allowed gap between consecutive samples (metres)
_MAX_GAP_METRES = 500.0


def assess_lap_quality(car_data: pd.DataFrame) -> dict:
    """Assess the quality of a raw telemetry lap.

    Args:
        car_data: Raw telemetry DataFrame (from FastF1, with ``Distance``).

    Returns:
        Dict with the following boolean flags and counts:

        * ``sample_count`` – number of telemetry samples.
        * ``missing_samples`` – ``True`` if sample density is below
          :data:`_MIN_SAMPLES_PER_KM`.
        * ``has_gaps`` – ``True`` if any consecutive sample gap exceeds
          :data:`_MAX_GAP_METRES` metres.
        * ``max_gap_metres`` – largest observed inter-sample gap in metres.
    """
    result: dict = {
        "sample_count": len(car_data),
        "missing_samples": False,
        "has_gaps": False,
        "max_gap_metres": 0.0,
    }

    if car_data.empty or "Distance" not in car_data.columns:
        result["missing_samples"] = True
        return result

    distance = car_data["Distance"].to_numpy(dtype=float)
    total_distance_km = (distance[-1] - distance[0]) / 1000.0

    if total_distance_km > 0:
        density = len(car_data) / total_distance_km
        result["missing_samples"] = density < _MIN_SAMPLES_PER_KM

    gaps = np.diff(distance)
    max_gap = float(gaps.max()) if len(gaps) > 0 else 0.0
    result["max_gap_metres"] = max_gap
    result["has_gaps"] = max_gap > _MAX_GAP_METRES

    return result
