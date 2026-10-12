"""
pipelines/ingest_sessions/ingest_session.py
-------------------------------------------
CLI entry point to ingest session laps, stints, weather, and telemetry via FastF1.

Usage:
    python ingest_session.py --season 2023 --round 1 --session Q
    python ingest_session.py --season 2023 --round 1 --session R
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from pipelines.db import get_connection
from pipelines.ingest_sessions.session_loader import ingest_session

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("ingest_session")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Ingest session laps, stints, and telemetry from FastF1"
    )
    parser.add_argument("--season", type=int, required=True, help="Season year (e.g. 2023)")
    parser.add_argument("--round", type=int, required=True, help="Round number (e.g. 1)")
    parser.add_argument(
        "--session",
        type=str,
        default="R",
        choices=["FP1", "FP2", "FP3", "Q", "S", "SQ", "R"],
        help="Session identifier (FP1, FP2, FP3, Q, R, S, SQ)",
    )
    args = parser.parse_args()

    logger.info(
        "Starting session ingestion: Season %d, Round %d, Session %s",
        args.season,
        args.round,
        args.session,
    )

    with get_connection() as conn:
        try:
            stats = ingest_session(
                season=args.season,
                round_num=args.round,
                session_type=args.session,
                conn=conn,
            )
            logger.info("Session ingestion completed successfully: %s", stats)
        except Exception as exc:
            logger.error("Session ingestion failed: %s", exc, exc_info=True)
            sys.exit(1)


if __name__ == "__main__":
    main()
