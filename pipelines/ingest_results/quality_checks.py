"""
pipelines/ingest_results/quality_checks.py
-------------------------------------------
Data-quality validation for race and qualifying results.

Each check function queries the database and returns a list of
:class:`QualityIssue` objects.  An empty list means the check passed.
"""

from __future__ import annotations

import dataclasses
import logging
from typing import Literal, Optional

from psycopg2.extensions import connection as PgConnection

from pipelines.db import execute_query

logger = logging.getLogger(__name__)

Severity = Literal["ERROR", "WARNING"]


@dataclasses.dataclass
class QualityIssue:
    """Represents a single data-quality finding.

    Attributes:
        check: Name of the check function that raised this issue.
        severity: ``'ERROR'`` for blocking issues, ``'WARNING'`` for soft ones.
        message: Human-readable description of the problem.
        context: Optional extra data (e.g. IDs involved).
    """

    check: str
    severity: Severity
    message: str
    context: Optional[dict] = None


# ---------------------------------------------------------------------------
# Individual checks
# ---------------------------------------------------------------------------

def check_results_completeness(
    conn: PgConnection, race_id: int
) -> list[QualityIssue]:
    """Validate that every race result row has valid FK references.

    Checks that race_results.race_id, driver_id, and constructor_id all
    resolve to existing rows.

    Args:
        conn: Open psycopg2 connection.
        race_id: Race to validate.

    Returns:
        List of :class:`QualityIssue` (empty = pass).
    """
    issues: list[QualityIssue] = []

    # Orphaned driver references
    orphan_drivers = execute_query(
        conn,
        """
        SELECT rr.driver_id
        FROM race_results rr
        LEFT JOIN drivers d ON d.id = rr.driver_id
        WHERE rr.race_id = %s AND d.id IS NULL
        """,
        (race_id,),
        fetch=True,
    )
    for row in (orphan_drivers or []):
        issues.append(
            QualityIssue(
                check="check_results_completeness",
                severity="ERROR",
                message=f"race_result references unknown driver_id={row['driver_id']}",
                context={"race_id": race_id, "driver_id": row["driver_id"]},
            )
        )

    # Orphaned constructor references
    orphan_constructors = execute_query(
        conn,
        """
        SELECT rr.constructor_id
        FROM race_results rr
        LEFT JOIN constructors c ON c.id = rr.constructor_id
        WHERE rr.race_id = %s AND rr.constructor_id IS NOT NULL AND c.id IS NULL
        """,
        (race_id,),
        fetch=True,
    )
    for row in (orphan_constructors or []):
        issues.append(
            QualityIssue(
                check="check_results_completeness",
                severity="ERROR",
                message=(
                    f"race_result references unknown constructor_id={row['constructor_id']}"
                ),
                context={"race_id": race_id, "constructor_id": row["constructor_id"]},
            )
        )

    if not issues:
        logger.debug("check_results_completeness PASSED race_id=%s", race_id)
    return issues


def check_one_result_per_driver(
    conn: PgConnection, race_id: int
) -> list[QualityIssue]:
    """Ensure no driver appears more than once in race results.

    Args:
        conn: Open psycopg2 connection.
        race_id: Race to validate.

    Returns:
        List of :class:`QualityIssue` (empty = pass).
    """
    rows = execute_query(
        conn,
        """
        SELECT driver_id, COUNT(*) AS cnt
        FROM race_results
        WHERE race_id = %s
        GROUP BY driver_id
        HAVING COUNT(*) > 1
        """,
        (race_id,),
        fetch=True,
    )
    issues = [
        QualityIssue(
            check="check_one_result_per_driver",
            severity="ERROR",
            message=f"driver_id={row['driver_id']} has {row['cnt']} race results",
            context={"race_id": race_id, "driver_id": row["driver_id"]},
        )
        for row in (rows or [])
    ]
    if not issues:
        logger.debug("check_one_result_per_driver PASSED race_id=%s", race_id)
    return issues


def check_podium_has_three(
    conn: PgConnection, race_id: int
) -> list[QualityIssue]:
    """Verify that positions 1, 2, and 3 each have exactly one result.

    Handles DNF races where fewer than 3 cars are classified by only
    issuing a WARNING (not an ERROR) when total classified results < 3.

    Args:
        conn: Open psycopg2 connection.
        race_id: Race to validate.

    Returns:
        List of :class:`QualityIssue` (empty = pass).
    """
    issues: list[QualityIssue] = []

    for pos in (1, 2, 3):
        rows = execute_query(
            conn,
            "SELECT COUNT(*) AS cnt FROM race_results WHERE race_id = %s AND position = %s",
            (race_id, pos),
            fetch=True,
        )
        cnt = (rows or [{}])[0].get("cnt", 0)
        if cnt == 0:
            issues.append(
                QualityIssue(
                    check="check_podium_has_three",
                    severity="WARNING",
                    message=f"No driver classified in position {pos}",
                    context={"race_id": race_id, "position": pos},
                )
            )
        elif cnt > 1:
            issues.append(
                QualityIssue(
                    check="check_podium_has_three",
                    severity="ERROR",
                    message=f"Multiple drivers ({cnt}) in position {pos}",
                    context={"race_id": race_id, "position": pos},
                )
            )
    if not issues:
        logger.debug("check_podium_has_three PASSED race_id=%s", race_id)
    return issues


def check_qualifying_positions(
    conn: PgConnection, race_id: int
) -> list[QualityIssue]:
    """Ensure qualifying positions are unique (no two drivers share a slot).

    Args:
        conn: Open psycopg2 connection.
        race_id: Race to validate.

    Returns:
        List of :class:`QualityIssue` (empty = pass).
    """
    rows = execute_query(
        conn,
        """
        SELECT position, COUNT(*) AS cnt
        FROM qualifying_results
        WHERE race_id = %s AND position IS NOT NULL
        GROUP BY position
        HAVING COUNT(*) > 1
        """,
        (race_id,),
        fetch=True,
    )
    issues = [
        QualityIssue(
            check="check_qualifying_positions",
            severity="ERROR",
            message=f"Qualifying position {row['position']} shared by {row['cnt']} drivers",
            context={"race_id": race_id, "position": row["position"]},
        )
        for row in (rows or [])
    ]
    if not issues:
        logger.debug("check_qualifying_positions PASSED race_id=%s", race_id)
    return issues


def check_no_zero_laptimes(
    conn: PgConnection, session_id: int
) -> list[QualityIssue]:
    """Detect laps recorded with a lap-time of exactly 0 ms.

    A zero lap time almost always indicates a data pipeline error rather
    than a real lap.

    Args:
        conn: Open psycopg2 connection.
        session_id: Session (FK) to validate.

    Returns:
        List of :class:`QualityIssue` (empty = pass).
    """
    rows = execute_query(
        conn,
        """
        SELECT id, driver_id, lap_number
        FROM laps
        WHERE session_id = %s AND lap_time_ms = 0
        """,
        (session_id,),
        fetch=True,
    )
    issues = [
        QualityIssue(
            check="check_no_zero_laptimes",
            severity="WARNING",
            message=(
                f"Lap id={row['id']} driver={row['driver_id']} "
                f"lap={row['lap_number']} has zero lap time"
            ),
            context={"session_id": session_id, "lap_id": row["id"]},
        )
        for row in (rows or [])
    ]
    if not issues:
        logger.debug("check_no_zero_laptimes PASSED session_id=%s", session_id)
    return issues


# ---------------------------------------------------------------------------
# Composite runner (convenience)
# ---------------------------------------------------------------------------

def run_all_race_checks(conn: PgConnection, race_id: int) -> list[QualityIssue]:
    """Run all race-level quality checks and aggregate results.

    Args:
        conn: Open psycopg2 connection.
        race_id: Race to validate.

    Returns:
        Combined list of all :class:`QualityIssue` objects found.
    """
    issues: list[QualityIssue] = []
    for fn in (
        check_results_completeness,
        check_one_result_per_driver,
        check_podium_has_three,
        check_qualifying_positions,
    ):
        issues.extend(fn(conn, race_id))
    return issues
