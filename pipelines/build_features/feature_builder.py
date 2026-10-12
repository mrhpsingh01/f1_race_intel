"""
pipelines/build_features/feature_builder.py
-------------------------------------------
Time-safe feature engineering for podium predictions.

Strict rule: All features must use ONLY information available prior to the specified cutoff:
- PRE_WEEKEND: Information available before first session of the target race weekend.
- POST_QUALIFYING: Incorporates qualifying results, grid positions, and lap metrics up to quali end.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd
from psycopg2.extensions import connection as PgConnection

from pipelines.db import fetch_all, fetch_one

logger = logging.getLogger(__name__)


def get_race_metadata(conn: PgConnection, race_id: int) -> Optional[Dict[str, Any]]:
    """Retrieve target race information: season, round, date, circuit_id."""
    return fetch_one(
        conn,
        """
        SELECT r.id, r.season, r.round, r.name, r.date, r.circuit_id, c.country as circuit_country
        FROM races r
        LEFT JOIN circuits c ON c.id = r.circuit_id
        WHERE r.id = %s
        """,
        (race_id,),
    )


def get_driver_form(
    conn: PgConnection,
    driver_id: int,
    target_race_id: int,
    n_races: int = 5,
) -> Dict[str, Any]:
    """
    Compute rolling form for a driver using strictly races strictly before target_race_id.
    """
    target = get_race_metadata(conn, target_race_id)
    if not target:
        return {
            "driver_avg_finish": None,
            "driver_podium_rate": 0.0,
            "races_count": 0,
        }

    # Query earlier races in chronological order
    query = """
        SELECT rr.final_position, rr.points, rr.status
        FROM race_results rr
        JOIN races r ON r.id = rr.race_id
        WHERE rr.driver_id = %s
          AND (r.season < %s OR (r.season = %s AND r.round < %s))
        ORDER BY r.season DESC, r.round DESC
        LIMIT %s
    """
    rows = fetch_all(
        conn,
        query,
        (driver_id, target["season"], target["season"], target["round"], max(n_races, 10)),
    )

    if not rows:
        return {
            "driver_avg_finish": None,
            "driver_podium_rate": 0.0,
            "races_count": 0,
        }

    finishes = [
        r["final_position"]
        for r in rows[:n_races]
        if r["final_position"] is not None and r["final_position"] > 0
    ]
    all_10 = rows[:10]
    podiums_10 = sum(
        1
        for r in all_10
        if r["final_position"] is not None and 1 <= r["final_position"] <= 3
    )

    avg_finish = float(np.mean(finishes)) if finishes else None
    podium_rate = float(podiums_10 / len(all_10)) if all_10 else 0.0

    return {
        "driver_avg_finish": avg_finish,
        "driver_podium_rate": podium_rate,
        "races_count": len(rows),
    }


def get_team_form(
    conn: PgConnection,
    constructor_id: int,
    target_race_id: int,
    n_races: int = 5,
) -> Dict[str, Any]:
    """Compute rolling form for a constructor prior to target race."""
    target = get_race_metadata(conn, target_race_id)
    if not target:
        return {"team_avg_finish": None, "team_points_sum": 0.0}

    query = """
        SELECT rr.final_position, rr.points
        FROM race_results rr
        JOIN entries e ON e.race_id = rr.race_id AND e.driver_id = rr.driver_id
        JOIN races r ON r.id = rr.race_id
        WHERE e.constructor_id = %s
          AND (r.season < %s OR (r.season = %s AND r.round < %s))
        ORDER BY r.season DESC, r.round DESC
        LIMIT %s
    """
    rows = fetch_all(
        conn,
        query,
        (constructor_id, target["season"], target["season"], target["round"], n_races * 2),
    )

    if not rows:
        return {"team_avg_finish": None, "team_points_sum": 0.0}

    positions = [
        r["final_position"]
        for r in rows
        if r["final_position"] is not None and r["final_position"] > 0
    ]
    points = [float(r["points"] or 0) for r in rows]

    return {
        "team_avg_finish": float(np.mean(positions)) if positions else None,
        "team_points_sum": float(np.sum(points)),
    }


def get_circuit_history(
    conn: PgConnection,
    driver_id: int,
    circuit_id: int,
    target_race_id: int,
) -> Dict[str, Any]:
    """Retrieve driver's past performance at this specific circuit, excluding the target race."""
    target = get_race_metadata(conn, target_race_id)
    if not target or not circuit_id:
        return {"circuit_best_result": None, "circuit_avg_result": None}

    query = """
        SELECT rr.final_position
        FROM race_results rr
        JOIN races r ON r.id = rr.race_id
        WHERE rr.driver_id = %s
          AND r.circuit_id = %s
          AND (r.season < %s OR (r.season = %s AND r.round < %s))
        ORDER BY r.season DESC, r.round DESC
    """
    rows = fetch_all(
        conn,
        query,
        (driver_id, circuit_id, target["season"], target["season"], target["round"]),
    )

    positions = [
        r["final_position"]
        for r in rows
        if r["final_position"] is not None and r["final_position"] > 0
    ]

    if not positions:
        return {"circuit_best_result": None, "circuit_avg_result": None}

    return {
        "circuit_best_result": int(min(positions)),
        "circuit_avg_result": float(np.mean(positions)),
    }


def build_pre_weekend_features(conn: PgConnection, race_id: int) -> pd.DataFrame:
    """
    Build features known prior to the race weekend.
    """
    target_race = get_race_metadata(conn, race_id)
    if not target_race:
        logger.error("Race %d not found for pre-weekend features", race_id)
        return pd.DataFrame()

    entries_query = """
        SELECT e.driver_id, e.constructor_id, d.code as driver_code, d.full_name,
               d.nationality as driver_nationality, c.name as team_name,
               rr.final_position
        FROM entries e
        JOIN drivers d ON d.id = e.driver_id
        JOIN constructors c ON c.id = e.constructor_id
        LEFT JOIN race_results rr ON rr.race_id = e.race_id AND rr.driver_id = e.driver_id
        WHERE e.race_id = %s
    """
    entries = fetch_all(conn, entries_query, (race_id,))
    if not entries:
        logger.warning("No entries found for race %d", race_id)
        return pd.DataFrame()

    feature_rows = []
    for entry in entries:
        d_id = entry["driver_id"]
        c_id = entry["constructor_id"]

        driver_form = get_driver_form(conn, d_id, race_id, n_races=5)
        team_form = get_team_form(conn, c_id, race_id, n_races=5)
        circuit_hist = get_circuit_history(conn, d_id, target_race["circuit_id"], race_id)

        # Is home race?
        is_home = (
            entry["driver_nationality"] is not None
            and target_race["circuit_country"] is not None
            and entry["driver_nationality"].lower() in target_race["circuit_country"].lower()
        )

        final_pos = entry["final_position"]
        target_val = 1 if (final_pos is not None and 1 <= final_pos <= 3) else 0

        feature_rows.append({
            "race_id": race_id,
            "driver_id": d_id,
            "driver_code": entry["driver_code"],
            "driver_name": entry["full_name"],
            "team_name": entry["team_name"],
            "cutoff_type": "PRE_WEEKEND",
            "driver_avg_finish_last5": driver_form["driver_avg_finish"],
            "driver_podium_rate_last10": driver_form["driver_podium_rate"],
            "team_avg_finish_last5": team_form["team_avg_finish"],
            "team_points_last5": team_form["team_points_sum"],
            "circuit_best_result": circuit_hist["circuit_best_result"],
            "circuit_avg_result": circuit_hist["circuit_avg_result"],
            "driver_experience": driver_form["races_count"],
            "is_home_race": 1 if is_home else 0,
            "target": target_val,
        })

    return pd.DataFrame(feature_rows)


def build_post_qualifying_features(conn: PgConnection, race_id: int) -> pd.DataFrame:
    """
    Build features known after qualifying session ends.
    Includes pre-weekend features plus qualifying metrics.
    """
    df_pre = build_pre_weekend_features(conn, race_id)
    if df_pre.empty:
        return pd.DataFrame()

    df_pre["cutoff_type"] = "POST_QUALIFYING"

    # Query qualifying results
    q_query = """
        SELECT driver_id, qualifying_position, grid_position,
               q1_time_ms, q2_time_ms, q3_time_ms, gap_to_pole_ms
        FROM qualifying_results
        WHERE race_id = %s
    """
    q_rows = fetch_all(conn, q_query, (race_id,))
    q_df = pd.DataFrame(q_rows)

    if q_df.empty:
        df_pre["qualifying_position"] = np.nan
        df_pre["grid_position"] = np.nan
        df_pre["gap_to_pole_ms"] = np.nan
        df_pre["q3_entry"] = 0
        return df_pre

    merged = pd.merge(df_pre, q_df, on="driver_id", how="left")
    merged["q3_entry"] = merged["q3_time_ms"].apply(lambda v: 1 if pd.notna(v) and v > 0 else 0)

    # Fallback grid_position to qualifying_position if null
    merged["grid_position"] = merged["grid_position"].fillna(merged["qualifying_position"])

    return merged
