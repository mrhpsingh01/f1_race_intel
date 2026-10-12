"""
pipelines/ingest_sessions/fastf1_client.py
-------------------------------------------
Thin wrapper around the FastF1 library for loading session data.

FastF1's cache is enabled once at module import time.  All public
functions return ``None`` gracefully if data is unavailable.
"""

from __future__ import annotations

import logging
from typing import Optional

import fastf1
import pandas as pd

from pipelines.config import FASTF1_CACHE_DIR

logger = logging.getLogger(__name__)

# Enable the FastF1 disk cache once at import time.
try:
    fastf1.Cache.enable_cache(FASTF1_CACHE_DIR)
    logger.debug("FastF1 cache enabled at %s", FASTF1_CACHE_DIR)
except Exception as exc:  # pragma: no cover
    logger.warning("Could not enable FastF1 cache: %s", exc)


# ---------------------------------------------------------------------------
# Session loading
# ---------------------------------------------------------------------------

def get_session(
    season: int,
    round_num: int,
    session_type: str,
) -> Optional[fastf1.core.Session]:
    """Load a FastF1 session object (without telemetry data yet).

    Args:
        season: Championship year (e.g. ``2023``).
        round_num: Race round number (1-indexed).
        session_type: Session identifier – ``'Q'``, ``'R'``,
            ``'FP1'``, ``'FP2'``, or ``'FP3'``.

    Returns:
        A loaded :class:`fastf1.core.Session`, or ``None`` on error.
    """
    try:
        session = fastf1.get_session(season, round_num, session_type)
        session.load(telemetry=False, weather=False, messages=False)
        logger.info(
            "Loaded session: %s round=%s %s", season, round_num, session_type
        )
        return session
    except Exception as exc:
        logger.error(
            "Failed to load session season=%s round=%s type=%s: %s",
            season, round_num, session_type, exc,
        )
        return None


# ---------------------------------------------------------------------------
# Lap data
# ---------------------------------------------------------------------------

_LAP_COLUMNS = [
    "LapTime",
    "Sector1Time",
    "Sector2Time",
    "Sector3Time",
    "Compound",
    "TyreLife",
    "LapNumber",
    "Position",
    "PitInTime",
    "PitOutTime",
    "TrackStatus",
    "Driver",
]


def load_laps(session: fastf1.core.Session) -> Optional[pd.DataFrame]:
    """Return the laps DataFrame for *session* with standard columns.

    Reloads session data with lap telemetry enabled if laps are not yet
    available.

    Args:
        session: A loaded FastF1 session.

    Returns:
        :class:`pandas.DataFrame` of laps, or ``None`` on error.
    """
    try:
        if session.laps is None or session.laps.empty:
            session.load(telemetry=False, weather=False, messages=False)
        laps: pd.DataFrame = session.laps.copy()
        # Keep only columns that exist in this session
        available = [c for c in _LAP_COLUMNS if c in laps.columns]
        laps = laps[available]
        # Convert timedelta columns to float seconds for easier serialisation
        for col in ["LapTime", "Sector1Time", "Sector2Time", "Sector3Time",
                    "PitInTime", "PitOutTime"]:
            if col in laps.columns:
                laps[col] = laps[col].dt.total_seconds()
        return laps
    except Exception as exc:
        logger.error("load_laps failed: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Stint data
# ---------------------------------------------------------------------------

def load_stints(session: fastf1.core.Session) -> Optional[pd.DataFrame]:
    """Return stint summary data for *session*.

    Args:
        session: A loaded FastF1 session.

    Returns:
        :class:`pandas.DataFrame` of stints, or ``None`` on error.
    """
    try:
        laps = session.laps
        if laps is None or laps.empty:
            return None
        # FastF1 does not expose a dedicated stints accessor; derive from laps.
        stint_cols = [c for c in ["Driver", "Stint", "Compound", "TyreLife", "LapNumber"]
                      if c in laps.columns]
        stints = (
            laps[stint_cols]
            .groupby(["Driver", "Stint", "Compound"])
            .agg(first_lap=("LapNumber", "min"), last_lap=("LapNumber", "max"),
                 tyre_life_start=("TyreLife", "min"), tyre_life_end=("TyreLife", "max"))
            .reset_index()
        )
        return stints
    except Exception as exc:
        logger.error("load_stints failed: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Weather data
# ---------------------------------------------------------------------------

def load_weather(session: fastf1.core.Session) -> Optional[pd.DataFrame]:
    """Return the weather DataFrame for *session*.

    Loads weather data from FastF1 if it has not been loaded yet.

    Args:
        session: A loaded FastF1 session.

    Returns:
        :class:`pandas.DataFrame` of weather samples, or ``None`` on error.
    """
    try:
        if not hasattr(session, "weather_data") or session.weather_data is None:
            session.load(weather=True)
        weather = session.weather_data
        return weather.copy() if weather is not None else None
    except Exception as exc:
        logger.error("load_weather failed: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Telemetry data
# ---------------------------------------------------------------------------

def load_car_data(
    session: fastf1.core.Session,
    driver_code: str,
    lap_number: int,
) -> Optional[pd.DataFrame]:
    """Return raw car-telemetry data for a specific driver lap.

    Columns returned include: ``Speed``, ``Throttle``, ``Brake``,
    ``nGear``, ``DRS``, ``Distance``, ``Time``.

    Args:
        session: A loaded FastF1 session.
        driver_code: Three-letter driver abbreviation (e.g. ``'HAM'``).
        lap_number: Lap number to retrieve (1-indexed).

    Returns:
        :class:`pandas.DataFrame` of telemetry samples, or ``None`` on error.
    """
    try:
        driver_laps = session.laps.pick_driver(driver_code)
        if driver_laps is None or driver_laps.empty:
            logger.warning("No laps found for driver %s", driver_code)
            return None

        target_laps = driver_laps[driver_laps["LapNumber"] == lap_number]
        if target_laps.empty:
            logger.warning("Lap %d not found for driver %s", lap_number, driver_code)
            return None

        lap = target_laps.iloc[0]
        # Load telemetry for this specific session
        session.load(telemetry=True)
        car_data: pd.DataFrame = lap.get_car_data().add_distance()
        return car_data
    except Exception as exc:
        logger.error(
            "load_car_data failed driver=%s lap=%d: %s", driver_code, lap_number, exc
        )
        return None
