"""
pipelines/ingest_results/loader.py
------------------------------------
Upsert normalised F1 result data into PostgreSQL.

Each function accepts an open psycopg2 connection and a dict returned by
the normalizer module.  All operations are idempotent (INSERT … ON CONFLICT
DO UPDATE).
"""

from __future__ import annotations

import logging
from typing import Optional

from psycopg2.extensions import connection as PgConnection

from pipelines.db import fetch_one, upsert

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Reference data loaders
# ---------------------------------------------------------------------------

def upsert_circuit(conn: PgConnection, circuit_dict: dict) -> int:
    """Upsert a circuit row and return its surrogate PK.

    Args:
        conn: Open psycopg2 connection.
        circuit_dict: Normalised circuit dict.

    Returns:
        The ``id`` of the upserted circuit row.
    """
    upsert(
        conn,
        table="circuits",
        row=circuit_dict,
        conflict_columns=["circuit_ref"],
        update_columns=["name", "location", "country", "lat", "lng", "url"],
    )
    row = fetch_one(
        conn,
        'SELECT id FROM "circuits" WHERE circuit_ref = %s',
        (circuit_dict["circuit_ref"],),
    )
    if row is None:
        raise RuntimeError(f"Circuit not found after upsert: {circuit_dict['circuit_ref']}")
    return row["id"]


def upsert_driver(conn: PgConnection, driver_dict: dict) -> int:
    """Upsert a driver row and return its surrogate PK.

    Args:
        conn: Open psycopg2 connection.
        driver_dict: Normalised driver dict.

    Returns:
        The ``id`` of the upserted driver row.
    """
    upsert(
        conn,
        table="drivers",
        row=driver_dict,
        conflict_columns=["driver_ref"],
        update_columns=[
            "code", "forename", "surname", "dob",
            "nationality", "permanent_number", "url",
        ],
    )
    row = fetch_one(
        conn,
        'SELECT id FROM "drivers" WHERE driver_ref = %s',
        (driver_dict["driver_ref"],),
    )
    if row is None:
        raise RuntimeError(f"Driver not found after upsert: {driver_dict['driver_ref']}")
    return row["id"]


def upsert_constructor(conn: PgConnection, constructor_dict: dict) -> int:
    """Upsert a constructor row and return its surrogate PK.

    Args:
        conn: Open psycopg2 connection.
        constructor_dict: Normalised constructor dict.

    Returns:
        The ``id`` of the upserted constructor row.
    """
    upsert(
        conn,
        table="constructors",
        row=constructor_dict,
        conflict_columns=["constructor_ref"],
        update_columns=["name", "nationality", "url"],
    )
    row = fetch_one(
        conn,
        'SELECT id FROM "constructors" WHERE constructor_ref = %s',
        (constructor_dict["constructor_ref"],),
    )
    if row is None:
        raise RuntimeError(
            f"Constructor not found after upsert: {constructor_dict['constructor_ref']}"
        )
    return row["id"]


def upsert_race(conn: PgConnection, race_dict: dict) -> int:
    """Upsert a race row and return its surrogate PK.

    Args:
        conn: Open psycopg2 connection.
        race_dict: Normalised race dict.

    Returns:
        The ``id`` of the upserted race row.
    """
    upsert(
        conn,
        table="races",
        row=race_dict,
        conflict_columns=["season", "round"],
        update_columns=["circuit_id", "name", "date", "time", "url"],
    )
    row = fetch_one(
        conn,
        'SELECT id FROM "races" WHERE season = %s AND "round" = %s',
        (race_dict["season"], race_dict["round"]),
    )
    if row is None:
        raise RuntimeError(
            f"Race not found after upsert: season={race_dict['season']} round={race_dict['round']}"
        )
    return row["id"]


# ---------------------------------------------------------------------------
# Result loaders
# ---------------------------------------------------------------------------

def upsert_qualifying_result(conn: PgConnection, qr_dict: dict) -> None:
    """Upsert a qualifying result row.

    Args:
        conn: Open psycopg2 connection.
        qr_dict: Normalised qualifying result dict.
    """
    upsert(
        conn,
        table="qualifying_results",
        row=qr_dict,
        conflict_columns=["race_id", "driver_id"],
        update_columns=[
            "constructor_id", "position",
            "q1_time_ms", "q2_time_ms", "q3_time_ms",
        ],
    )
    logger.debug(
        "Upserted qualifying result: race_id=%s driver_id=%s",
        qr_dict["race_id"],
        qr_dict["driver_id"],
    )


def upsert_race_result(conn: PgConnection, rr_dict: dict) -> None:
    """Upsert a race result row.

    Args:
        conn: Open psycopg2 connection.
        rr_dict: Normalised race result dict.
    """
    upsert(
        conn,
        table="race_results",
        row=rr_dict,
        conflict_columns=["race_id", "driver_id"],
        update_columns=[
            "constructor_id", "grid", "position", "position_text",
            "points", "laps", "status", "is_dnf", "is_dsq",
            "time_ms", "fastest_lap_rank", "fastest_lap_ms",
        ],
    )
    logger.debug(
        "Upserted race result: race_id=%s driver_id=%s",
        rr_dict["race_id"],
        rr_dict["driver_id"],
    )


# ---------------------------------------------------------------------------
# Post-load quality gate
# ---------------------------------------------------------------------------

def run_post_load_checks(conn: PgConnection, race_id: int) -> list[str]:
    """Run lightweight sanity checks after loading results for *race_id*.

    Returns a list of warning strings (empty means all good).

    Args:
        conn: Open psycopg2 connection.
        race_id: Surrogate PK of the race just loaded.

    Returns:
        List of human-readable warning messages.
    """
    from pipelines.ingest_results.quality_checks import (  # local import to avoid cycles
        check_results_completeness,
        check_one_result_per_driver,
        check_podium_has_three,
        check_qualifying_positions,
    )

    warnings: list[str] = []
    for check_fn in (
        check_results_completeness,
        check_one_result_per_driver,
        check_podium_has_three,
        check_qualifying_positions,
    ):
        issues = check_fn(conn, race_id)
        for issue in issues:
            msg = f"[{issue.severity}] {issue.message}"
            if issue.severity == "ERROR":
                logger.error(msg)
            else:
                logger.warning(msg)
            warnings.append(msg)
    return warnings
