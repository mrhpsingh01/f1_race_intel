"""
pipelines/ingest_results/ingest_race.py
-----------------------------------------
CLI entry point: ingest all data for a single F1 race round.

Usage::

    python ingest_race.py --season 2023 --round 1

The script is fully idempotent: running it twice produces the same database
state.  Progress is tracked in the ``ingestion_jobs`` table.
"""

from __future__ import annotations

import argparse
import logging
import sys
from datetime import datetime, timezone

from pipelines.config import DATABASE_URL
from pipelines.db import execute_query, fetch_one, get_connection, upsert
from pipelines.ingest_results.jolpica_client import JolpicaClient
from pipelines.ingest_results.loader import (
    run_post_load_checks,
    upsert_circuit,
    upsert_constructor,
    upsert_driver,
    upsert_qualifying_result,
    upsert_race,
    upsert_race_result,
)
from pipelines.ingest_results.normalizer import (
    normalize_circuit,
    normalize_constructor,
    normalize_driver,
    normalize_qualifying_result,
    normalize_race,
    normalize_race_result,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("ingest_race")


# ---------------------------------------------------------------------------
# Job tracking helpers
# ---------------------------------------------------------------------------

def _start_job(conn, season: int, round_num: int) -> int:
    """Insert or reuse an ingestion_jobs row. Returns the job id."""
    existing = fetch_one(
        conn,
        "SELECT id FROM ingestion_jobs WHERE job_key = %s",
        (f"race:{season}:{round_num}",),
    )
    if existing:
        execute_query(
            conn,
            "UPDATE ingestion_jobs SET status='running', started_at=%s WHERE id=%s",
            (datetime.now(timezone.utc), existing["id"]),
        )
        return existing["id"]

    execute_query(
        conn,
        """
        INSERT INTO ingestion_jobs (job_key, season, round, status, started_at)
        VALUES (%s, %s, %s, 'running', %s)
        """,
        (f"race:{season}:{round_num}", season, round_num, datetime.now(timezone.utc)),
    )
    row = fetch_one(
        conn,
        "SELECT id FROM ingestion_jobs WHERE job_key = %s",
        (f"race:{season}:{round_num}",),
    )
    return row["id"]  # type: ignore[index]


def _finish_job(conn, job_id: int, status: str, message: str | None = None) -> None:
    execute_query(
        conn,
        "UPDATE ingestion_jobs SET status=%s, finished_at=%s, message=%s WHERE id=%s",
        (status, datetime.now(timezone.utc), message, job_id),
    )


def _log_quality_issues(conn, job_id: int, issues: list[str]) -> None:
    for issue in issues:
        execute_query(
            conn,
            "INSERT INTO ingestion_job_issues (job_id, message) VALUES (%s, %s)",
            (job_id, issue),
        )


# ---------------------------------------------------------------------------
# Main ingestion workflow
# ---------------------------------------------------------------------------

def ingest_race(season: int, round_num: int) -> None:
    """Ingest all data for a single race round.

    Workflow
    --------
    1. Log job start to ``ingestion_jobs``.
    2. Fetch season drivers, constructors, circuits, and schedule.
    3. Upsert all reference data.
    4. Fetch qualifying and race results.
    5. Upsert results.
    6. Run quality checks.
    7. Log job completion.

    Args:
        season: Championship year (e.g. ``2023``).
        round_num: Race round number (1-indexed).
    """
    client = JolpicaClient()

    with get_connection(DATABASE_URL) as conn:
        job_id = _start_job(conn, season, round_num)
        logger.info("Started ingestion job id=%s season=%s round=%s", job_id, season, round_num)

        try:
            # ------------------------------------------------------------------
            # Step 1 – Reference data
            # ------------------------------------------------------------------
            logger.info("Fetching drivers for season %s…", season)
            drivers_raw = client.get_drivers(season)
            driver_ref_to_id: dict[str, int] = {}
            for d in drivers_raw:
                norm = normalize_driver(d)
                driver_ref_to_id[norm["driver_ref"]] = upsert_driver(conn, norm)
            logger.info("Upserted %d drivers", len(driver_ref_to_id))

            logger.info("Fetching constructors for season %s…", season)
            constructors_raw = client.get_constructors(season)
            constructor_ref_to_id: dict[str, int] = {}
            for c in constructors_raw:
                norm = normalize_constructor(c)
                constructor_ref_to_id[norm["constructor_ref"]] = upsert_constructor(conn, norm)
            logger.info("Upserted %d constructors", len(constructor_ref_to_id))

            logger.info("Fetching race schedule for season %s…", season)
            races_raw = client.get_races(season)

            # Build circuit lookup from race schedule data
            circuit_ref_to_id: dict[str, int] = {}
            for race_raw in races_raw:
                circuit_raw = race_raw.get("Circuit", {})
                if circuit_raw and circuit_raw.get("circuitId") not in circuit_ref_to_id:
                    norm = normalize_circuit(circuit_raw)
                    circuit_ref_to_id[norm["circuit_ref"]] = upsert_circuit(conn, norm)
            logger.info("Upserted %d circuits", len(circuit_ref_to_id))

            # Find the specific race in the schedule
            target_race_raw = next(
                (r for r in races_raw if int(r.get("round", 0)) == round_num),
                None,
            )
            if target_race_raw is None:
                raise ValueError(
                    f"Round {round_num} not found in season {season} schedule "
                    f"(API returned {len(races_raw)} rounds)"
                )

            circuit_ref = target_race_raw.get("Circuit", {}).get("circuitId")
            circuit_id = circuit_ref_to_id.get(circuit_ref)
            race_norm = normalize_race(target_race_raw, circuit_id=circuit_id)
            race_id = upsert_race(conn, race_norm)
            logger.info("Upserted race id=%s (season=%s round=%s)", race_id, season, round_num)

            # ------------------------------------------------------------------
            # Step 2 – Qualifying results
            # ------------------------------------------------------------------
            logger.info("Fetching qualifying for season=%s round=%s…", season, round_num)
            quali_raw = client.get_qualifying(season, round_num)
            for qr in quali_raw:
                driver_ref = qr.get("Driver", {}).get("driverId")
                constructor_ref = qr.get("Constructor", {}).get("constructorId")
                driver_id = driver_ref_to_id.get(driver_ref)  # type: ignore[arg-type]
                constructor_id = constructor_ref_to_id.get(constructor_ref)  # type: ignore[arg-type]
                if driver_id is None:
                    logger.warning("Unknown driver ref '%s' in qualifying, skipping", driver_ref)
                    continue
                norm = normalize_qualifying_result(qr, race_id, driver_id, constructor_id)
                upsert_qualifying_result(conn, norm)
            logger.info("Upserted %d qualifying results", len(quali_raw))

            # ------------------------------------------------------------------
            # Step 3 – Race results
            # ------------------------------------------------------------------
            logger.info("Fetching race results for season=%s round=%s…", season, round_num)
            results_raw = client.get_race_results(season, round_num)
            for rr in results_raw:
                driver_ref = rr.get("Driver", {}).get("driverId")
                constructor_ref = rr.get("Constructor", {}).get("constructorId")
                driver_id = driver_ref_to_id.get(driver_ref)  # type: ignore[arg-type]
                constructor_id = constructor_ref_to_id.get(constructor_ref)  # type: ignore[arg-type]
                if driver_id is None:
                    logger.warning("Unknown driver ref '%s' in results, skipping", driver_ref)
                    continue
                norm = normalize_race_result(rr, race_id, driver_id, constructor_id)
                upsert_race_result(conn, norm)
            logger.info("Upserted %d race results", len(results_raw))

            # ------------------------------------------------------------------
            # Step 4 – Quality checks
            # ------------------------------------------------------------------
            logger.info("Running quality checks for race_id=%s…", race_id)
            quality_issues = run_post_load_checks(conn, race_id)
            if quality_issues:
                _log_quality_issues(conn, job_id, quality_issues)
                logger.warning("%d quality issue(s) logged", len(quality_issues))
            else:
                logger.info("All quality checks passed")

            _finish_job(conn, job_id, "success")
            logger.info("Ingestion job id=%s completed successfully", job_id)

        except Exception as exc:
            _finish_job(conn, job_id, "failed", str(exc))
            logger.exception("Ingestion job id=%s FAILED: %s", job_id, exc)
            raise


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Ingest F1 race results from Jolpica API into PostgreSQL."
    )
    parser.add_argument(
        "--season",
        type=int,
        required=True,
        help="Championship year, e.g. 2023",
    )
    parser.add_argument(
        "--round",
        dest="round_num",
        type=int,
        required=True,
        help="Race round number (1-indexed), e.g. 1",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = _parse_args()
    ingest_race(season=args.season, round_num=args.round_num)
