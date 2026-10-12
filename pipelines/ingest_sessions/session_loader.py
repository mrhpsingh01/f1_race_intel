"""
pipelines/ingest_sessions/session_loader.py
--------------------------------------------
Orchestrate FastF1 session ingestion: laps, stints, telemetry assets.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from psycopg2.extensions import connection as PgConnection

from pipelines.config import PARQUET_DIR
from pipelines.db import execute_query, fetch_one, upsert
from pipelines.ingest_sessions.fastf1_client import (
    get_session,
    load_car_data,
    load_laps,
    load_stints,
    load_weather,
)
from pipelines.ingest_sessions.telemetry_processor import (
    assess_lap_quality,
    convert_to_distance_axis,
    interpolate_to_grid,
    save_to_parquet,
)

logger = logging.getLogger(__name__)

# Uniform distance grid spacing (metres)
_GRID_STEP_M = 10.0
# Top-N drivers for qualifying telemetry
_QUALI_TOP_N = 10


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

def _get_or_create_session(
    conn: PgConnection,
    race_id: int,
    session_type: str,
) -> int:
    """Return the DB id for a session, creating it if necessary.

    Args:
        conn: Open psycopg2 connection.
        race_id: FK to the races table.
        session_type: E.g. ``'Q'``, ``'R'``, ``'FP1'``.

    Returns:
        Surrogate PK of the sessions row.
    """
    row = fetch_one(
        conn,
        'SELECT id FROM "sessions" WHERE race_id = %s AND session_type = %s',
        (race_id, session_type),
    )
    if row:
        return row["id"]

    execute_query(
        conn,
        'INSERT INTO "sessions" (race_id, session_type) VALUES (%s, %s)',
        (race_id, session_type),
    )
    row = fetch_one(
        conn,
        'SELECT id FROM "sessions" WHERE race_id = %s AND session_type = %s',
        (race_id, session_type),
    )
    return row["id"]  # type: ignore[index]


def _get_driver_id(conn: PgConnection, driver_code: str) -> Optional[int]:
    row = fetch_one(conn, 'SELECT id FROM "drivers" WHERE code = %s', (driver_code,))
    return row["id"] if row else None


def _upsert_lap(conn: PgConnection, session_id: int, driver_id: int, lap: pd.Series) -> None:
    """Upsert a single lap row."""
    lap_dict: dict = {
        "session_id": session_id,
        "driver_id": driver_id,
        "lap_number": int(lap.get("LapNumber", 0)),
        "lap_time_ms": (
            int(round(lap["LapTime"] * 1000)) if pd.notna(lap.get("LapTime")) else None
        ),
        "sector1_ms": (
            int(round(lap["Sector1Time"] * 1000)) if pd.notna(lap.get("Sector1Time")) else None
        ),
        "sector2_ms": (
            int(round(lap["Sector2Time"] * 1000)) if pd.notna(lap.get("Sector2Time")) else None
        ),
        "sector3_ms": (
            int(round(lap["Sector3Time"] * 1000)) if pd.notna(lap.get("Sector3Time")) else None
        ),
        "compound": str(lap.get("Compound")) if pd.notna(lap.get("Compound")) else None,
        "tyre_age": int(lap["TyreLife"]) if pd.notna(lap.get("TyreLife")) else None,
        "position": int(lap["Position"]) if pd.notna(lap.get("Position")) else None,
        "track_status": str(lap.get("TrackStatus", "")) or None,
    }
    upsert(
        conn,
        table="laps",
        row=lap_dict,
        conflict_columns=["session_id", "driver_id", "lap_number"],
        update_columns=[k for k in lap_dict if k not in ("session_id", "driver_id", "lap_number")],
    )


def _upsert_stint(conn: PgConnection, session_id: int, driver_id: int, stint: pd.Series) -> None:
    """Upsert a single stint row."""
    stint_dict: dict = {
        "session_id": session_id,
        "driver_id": driver_id,
        "compound": str(stint.get("Compound")) if pd.notna(stint.get("Compound")) else None,
        "start_lap": int(stint.get("first_lap", 0)),
        "end_lap": int(stint.get("last_lap", 0)),
        "tyre_age_at_start": int(stint.get("tyre_life_start", 0)),
    }
    execute_query(
        conn,
        """
        INSERT INTO stints (session_id, driver_id, compound, start_lap, end_lap, tyre_age_at_start)
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        (session_id, driver_id, stint_dict["compound"], stint_dict["start_lap"], stint_dict["end_lap"], stint_dict["tyre_age_at_start"]),
    )


def _save_telemetry_asset(
    conn: PgConnection,
    session_id: int,
    driver_id: int,
    lap_number: int,
    parquet_path: str,
    quality_flags: dict,
) -> None:
    """Record a telemetry parquet asset in the DB."""
    asset_dict: dict = {
        "session_id": session_id,
        "driver_id": driver_id,
        "lap_number": lap_number,
        "file_path": parquet_path,
        "source": "fastf1",
        "processing_version": "v1.0",
    }
    upsert(
        conn,
        table="telemetry_assets",
        row=asset_dict,
        conflict_columns=["session_id", "driver_id", "lap_number"],
        update_columns=["file_path", "source", "processing_version"],
    )


# ---------------------------------------------------------------------------
# Telemetry ingestion helpers
# ---------------------------------------------------------------------------

def _ingest_driver_telemetry(
    ff1_session,
    conn: PgConnection,
    session_id: int,
    driver_code: str,
    lap_number: int,
    season: int,
    round_num: int,
    session_type: str,
) -> None:
    """Load, process, and persist telemetry for one driver lap."""
    driver_id = _get_driver_id(conn, driver_code)
    if driver_id is None:
        logger.warning("Driver code '%s' not found in DB, skipping telemetry", driver_code)
        return

    car_data = load_car_data(ff1_session, driver_code, lap_number)
    if car_data is None or car_data.empty:
        logger.warning("No telemetry for %s lap %d", driver_code, lap_number)
        return

    quality = assess_lap_quality(car_data)

    try:
        car_data = convert_to_distance_axis(car_data)
        if car_data.empty:
            return
        dist_max = car_data["Distance"].max()
        grid = np.arange(0, dist_max + _GRID_STEP_M, _GRID_STEP_M)
        processed = interpolate_to_grid(car_data, grid)
    except Exception as exc:
        logger.error("Telemetry processing failed for %s lap %d: %s", driver_code, lap_number, exc)
        return

    # Build parquet path
    rel_path = Path(PARQUET_DIR) / str(season) / str(round_num) / session_type / f"{driver_code}_lap{lap_number}.parquet"
    save_to_parquet(processed, str(rel_path))

    _save_telemetry_asset(conn, session_id, driver_id, lap_number, str(rel_path), quality)
    logger.info("Saved telemetry: %s", rel_path)


# ---------------------------------------------------------------------------
# Main ingest function
# ---------------------------------------------------------------------------

def ingest_session(
    season: int,
    round_num: int,
    session_type: str,
    db_conn: PgConnection,
    race_id: Optional[int] = None,
) -> None:
    """Ingest one F1 session: laps, stints, and telemetry.

    Args:
        season: Championship year.
        round_num: Race round number (1-indexed).
        session_type: Session code (``'Q'``, ``'R'``, ``'FP1'``, etc.).
        db_conn: Open psycopg2 connection.
        race_id: Surrogate PK of the race. If ``None``, looked up from DB.
    """
    # Resolve race_id if not provided
    if race_id is None:
        row = fetch_one(
            db_conn,
            'SELECT id FROM "races" WHERE season = %s AND "round" = %s',
            (season, round_num),
        )
        if row is None:
            raise ValueError(
                f"Race not found in DB for season={season} round={round_num}. "
                "Run ingest_race first."
            )
        race_id = row["id"]

    session_id = _get_or_create_session(db_conn, race_id, session_type)
    logger.info(
        "Ingesting session: season=%s round=%s type=%s (session_id=%s)",
        season, round_num, session_type, session_id,
    )

    # ------------------------------------------------------------------
    # Load session data via FastF1
    # ------------------------------------------------------------------
    ff1_session = get_session(season, round_num, session_type)
    if ff1_session is None:
        logger.error("Could not load FastF1 session – aborting")
        return

    # ------------------------------------------------------------------
    # Laps
    # ------------------------------------------------------------------
    laps_df = load_laps(ff1_session)
    if laps_df is not None and not laps_df.empty:
        lap_count = 0
        for _, lap in laps_df.iterrows():
            driver_code = lap.get("Driver")
            if not driver_code:
                continue
            driver_id = _get_driver_id(db_conn, driver_code)
            if driver_id is None:
                continue
            _upsert_lap(db_conn, session_id, driver_id, lap)
            lap_count += 1
        logger.info("Upserted %d laps", lap_count)
    else:
        logger.warning("No lap data available for this session")

    # ------------------------------------------------------------------
    # Stints
    # ------------------------------------------------------------------
    stints_df = load_stints(ff1_session)
    if stints_df is not None and not stints_df.empty:
        stint_count = 0
        for _, stint in stints_df.iterrows():
            driver_code = stint.get("Driver")
            if not driver_code:
                continue
            driver_id = _get_driver_id(db_conn, driver_code)
            if driver_id is None:
                continue
            _upsert_stint(db_conn, session_id, driver_id, stint)
            stint_count += 1
        logger.info("Upserted %d stints", stint_count)

    # ------------------------------------------------------------------
    # Telemetry – session-type-specific strategy
    # ------------------------------------------------------------------
    if laps_df is None or laps_df.empty:
        logger.warning("Skipping telemetry (no laps loaded)")
        return

    # ------------------------------------------------------------------
    # Telemetry ingestion: Load telemetry once
    # ------------------------------------------------------------------
    try:
        ff1_session.load(telemetry=True)
    except Exception as exc:
        logger.warning("Could not pre-load telemetry for session: %s", exc)

    drivers_in_session = laps_df["Driver"].dropna().unique()

    if session_type == "Q":
        # Qualifying: top-10 drivers by qualifying time
        sorted_drivers = []
        for d_code in drivers_in_session:
            d_laps = laps_df[laps_df["Driver"] == d_code]
            best_lap = d_laps["LapTime"].min()
            if pd.notna(best_lap):
                sorted_drivers.append((d_code, best_lap))
        sorted_drivers.sort(key=lambda x: x[1])
        target_drivers = [d[0] for d in sorted_drivers[:_QUALI_TOP_N]]
    else:
        # Race & Practice: all drivers with valid lap
        target_drivers = list(drivers_in_session)

    for driver_code in target_drivers:
        driver_laps = laps_df[laps_df["Driver"] == driver_code]
        valid_laps = driver_laps[driver_laps["LapTime"].notna() & (driver_laps["LapTime"] > 0)]
        if valid_laps.empty:
            continue
        fastest_idx = valid_laps["LapTime"].idxmin()
        fastest_row = valid_laps.loc[fastest_idx]
        lap_num = int(fastest_row["LapNumber"])
        try:
            _ingest_driver_telemetry(
                ff1_session, db_conn, session_id,
                driver_code, lap_num,
                season, round_num, session_type,
            )
        except Exception as telem_err:
            logger.warning("Error ingesting telemetry for %s lap %d: %s", driver_code, lap_num, telem_err)

    logger.info("Session ingestion complete: season=%s round=%s type=%s", season, round_num, session_type)
