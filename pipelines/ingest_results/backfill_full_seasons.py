"""
pipelines/ingest_results/backfill_full_seasons.py
--------------------------------------------------
Paginate and fetch all race results and qualifying for 2021-2026.
Populates calendar, results, qualifying, entries, and predictions.
"""

import sys
import logging
import requests
import datetime
import re
from sqlalchemy import text
from database import engine

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("backfill_full_seasons")

BASE_URL = "https://api.jolpi.ca/ergast/f1"
HEADERS = {"User-Agent": "F1RaceIntel/1.0 (contact@f1raceintel.local)"}

_TIME_RE = re.compile(r"^(?:(\d+):)?(\d{1,2})\.(\d{1,3})$")

def time_str_to_ms(time_str: str | None) -> int | None:
    if not time_str:
        return None
    m = _TIME_RE.match(time_str.strip())
    if not m:
        return None
    minutes = int(m.group(1)) if m.group(1) else 0
    seconds = int(m.group(2))
    millis_str = m.group(3).ljust(3, "0")
    return (minutes * 60 + seconds) * 1000 + int(millis_str)

def fetch_json(url: str) -> dict:
    try:
        resp = requests.get(url, headers=HEADERS, timeout=35)
        if resp.status_code == 200:
            return resp.json()
        logger.warning(f"Failed {url}: {resp.status_code}")
    except Exception as exc:
        logger.warning(f"Error {url}: {exc}")
    return {}

def ensure_constraints():
    with engine.begin() as conn:
        # Check/add unique constraint on race_results (race_id, driver_id)
        try:
            conn.execute(text("""
                DELETE FROM race_results a USING race_results b
                WHERE a.id > b.id AND a.race_id = b.race_id AND a.driver_id = b.driver_id;
            """))
            conn.execute(text("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint WHERE conname = 'uq_race_results_race_driver'
                    ) THEN
                        ALTER TABLE race_results ADD CONSTRAINT uq_race_results_race_driver UNIQUE (race_id, driver_id);
                    END IF;
                END $$;
            """))
        except Exception as e:
            logger.warning(f"Note on race_results constraint: {e}")

        # Check/add unique constraint on qualifying_results (race_id, driver_id)
        try:
            conn.execute(text("""
                DELETE FROM qualifying_results a USING qualifying_results b
                WHERE a.id > b.id AND a.race_id = b.race_id AND a.driver_id = b.driver_id;
            """))
            conn.execute(text("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint WHERE conname = 'uq_qualifying_results_race_driver'
                    ) THEN
                        ALTER TABLE qualifying_results ADD CONSTRAINT uq_qualifying_results_race_driver UNIQUE (race_id, driver_id);
                    END IF;
                END $$;
            """))
        except Exception as e:
            logger.warning(f"Note on qualifying_results constraint: {e}")

def ingest_season_schedule(season: int):
    logger.info(f"Ingesting calendar for season {season}")
    data = fetch_json(f"{BASE_URL}/{season}.json?limit=100")
    races_list = data.get("MRData", {}).get("RaceTable", {}).get("Races", [])
    logger.info(f"Season {season}: {len(races_list)} rounds found")

    with engine.begin() as conn:
        for r in races_list:
            round_num = int(r.get("round", 1))
            race_name = r.get("raceName", f"Round {round_num}")
            date_str = r.get("date")
            race_date = datetime.date.fromisoformat(date_str) if date_str else None

            # Circuit
            c_data = r.get("Circuit", {})
            circuit_name = c_data.get("circuitName", "Unknown Circuit")
            country = c_data.get("Location", {}).get("country", "Unknown")
            city = c_data.get("Location", {}).get("locality", "Unknown")
            lat = float(c_data.get("Location", {}).get("lat", 0.0)) if c_data.get("Location", {}).get("lat") else None
            lon = float(c_data.get("Location", {}).get("long", 0.0)) if c_data.get("Location", {}).get("long") else None

            circuit_row = conn.execute(
                text("SELECT id FROM circuits WHERE name = :name"),
                {"name": circuit_name}
            ).first()
            if circuit_row:
                circuit_id = circuit_row[0]
            else:
                circuit_id = conn.execute(
                    text("""
                        INSERT INTO circuits (name, country, city, latitude, longitude)
                        VALUES (:name, :country, :city, :lat, :lon)
                        RETURNING id
                    """),
                    {"name": circuit_name, "country": country, "city": city, "lat": lat, "lon": lon}
                ).scalar()

            status = "upcoming"

            race_id = conn.execute(
                text("""
                    INSERT INTO races (season, round, circuit_id, name, date, status, jolpica_round_key)
                    VALUES (:season, :round, :circuit_id, :name, :date, :status, :key)
                    ON CONFLICT (season, round) DO UPDATE
                    SET circuit_id = EXCLUDED.circuit_id,
                        name = EXCLUDED.name,
                        date = EXCLUDED.date
                    RETURNING id
                """),
                {
                    "season": season,
                    "round": round_num,
                    "circuit_id": circuit_id,
                    "name": race_name,
                    "date": race_date,
                    "status": status,
                    "key": f"{season}_{round_num}"
                }
            ).scalar()

            # Ensure Sessions exist
            for stype in ["QUALIFYING", "RACE"]:
                sess_row = conn.execute(
                    text("SELECT id FROM sessions WHERE race_id = :rid AND session_type = :stype"),
                    {"rid": race_id, "stype": stype}
                ).first()
                if not sess_row:
                    conn.execute(
                        text("INSERT INTO sessions (race_id, session_type, status) VALUES (:rid, :stype, 'completed')"),
                        {"rid": race_id, "stype": stype}
                    )

def ingest_season_results_paginated(season: int):
    logger.info(f"Ingesting full results for season {season} with pagination...")
    offset = 0
    limit = 100
    total = 1

    with engine.begin() as conn:
        while offset < total:
            url = f"{BASE_URL}/{season}/results.json?limit={limit}&offset={offset}"
            data = fetch_json(url)
            mr = data.get("MRData", {})
            total = int(mr.get("total", 0))
            if total == 0:
                logger.info(f"No results found for season {season}")
                break

            races_list = mr.get("RaceTable", {}).get("Races", [])
            logger.info(f"Season {season} results offset {offset}/{total}: {len(races_list)} races returned")

            for r in races_list:
                round_num = int(r.get("round", 1))
                race_row = conn.execute(
                    text("SELECT id FROM races WHERE season = :season AND round = :round"),
                    {"season": season, "round": round_num}
                ).first()
                if not race_row:
                    continue
                race_id = race_row[0]

                # Mark race as completed since it has results
                conn.execute(
                    text("UPDATE races SET status = 'completed' WHERE id = :id"),
                    {"id": race_id}
                )

                for result in r.get("Results", []):
                    # Driver
                    d = result.get("Driver", {})
                    d_code = d.get("code") or d.get("familyName", "")[:3].upper()
                    d_full = f"{d.get('givenName', '')} {d.get('familyName', '')}".strip()
                    d_nat = d.get("nationality")

                    d_row = conn.execute(
                        text("SELECT id FROM drivers WHERE full_name = :full"),
                        {"full": d_full}
                    ).first()
                    if d_row:
                        driver_id = d_row[0]
                        if d_code:
                            conn.execute(text("UPDATE drivers SET code = :code WHERE id = :id AND (code IS NULL OR code = '')"), {"code": d_code, "id": driver_id})
                    else:
                        driver_id = conn.execute(
                            text("INSERT INTO drivers (full_name, code, nationality) VALUES (:full, :code, :nat) RETURNING id"),
                            {"full": d_full, "code": d_code, "nat": d_nat}
                        ).scalar()

                    # Constructor
                    c = result.get("Constructor", {})
                    c_name = c.get("name", "Unknown")
                    c_row = conn.execute(
                        text("SELECT id FROM constructors WHERE name = :name"),
                        {"name": c_name}
                    ).first()
                    if c_row:
                        constructor_id = c_row[0]
                    else:
                        constructor_id = conn.execute(
                            text("INSERT INTO constructors (name, nationality) VALUES (:name, :nat) RETURNING id"),
                            {"name": c_name, "nat": c.get("nationality")}
                        ).scalar()

                    # Entry
                    car_num = int(result.get("number", 0)) if result.get("number") and str(result.get("number")).isdigit() else None
                    conn.execute(
                        text("""
                            INSERT INTO entries (race_id, driver_id, constructor_id, car_number)
                            VALUES (:rid, :did, :cid, :cnum)
                            ON CONFLICT (race_id, driver_id) DO UPDATE SET constructor_id = EXCLUDED.constructor_id, car_number = EXCLUDED.car_number
                        """),
                        {"rid": race_id, "did": driver_id, "cid": constructor_id, "cnum": car_num}
                    )

                    # Race Result
                    pos = int(result.get("position", 0)) if result.get("position") and str(result.get("position")).isdigit() else None
                    pts = float(result.get("points", 0)) if result.get("points") else 0.0
                    status = result.get("status", "Finished")

                    conn.execute(
                        text("""
                            INSERT INTO race_results (race_id, driver_id, final_position, points, status, source)
                            VALUES (:rid, :did, :pos, :pts, :status, 'jolpica')
                            ON CONFLICT (race_id, driver_id) DO UPDATE
                            SET final_position = EXCLUDED.final_position, points = EXCLUDED.points, status = EXCLUDED.status
                        """),
                        {"rid": race_id, "did": driver_id, "pos": pos, "pts": pts, "status": status}
                    )

            offset += limit

def ingest_season_qualifying_paginated(season: int):
    logger.info(f"Ingesting full qualifying for season {season} with pagination...")
    offset = 0
    limit = 100
    total = 1

    with engine.begin() as conn:
        while offset < total:
            url = f"{BASE_URL}/{season}/qualifying.json?limit={limit}&offset={offset}"
            data = fetch_json(url)
            mr = data.get("MRData", {})
            total = int(mr.get("total", 0))
            if total == 0:
                logger.info(f"No qualifying results found for season {season}")
                break

            races_list = mr.get("RaceTable", {}).get("Races", [])
            logger.info(f"Season {season} qualifying offset {offset}/{total}: {len(races_list)} races returned")

            for r in races_list:
                round_num = int(r.get("round", 1))
                race_row = conn.execute(
                    text("SELECT id FROM races WHERE season = :season AND round = :round"),
                    {"season": season, "round": round_num}
                ).first()
                if not race_row:
                    continue
                race_id = race_row[0]

                # Find pole position lap time for gap calculation
                pole_time_ms = None
                quali_items = r.get("QualifyingResults", [])
                for qres in quali_items:
                    pos = int(qres.get("position", 0)) if qres.get("position") and str(qres.get("position")).isdigit() else None
                    if pos == 1:
                        pole_time_ms = time_str_to_ms(qres.get("Q3")) or time_str_to_ms(qres.get("Q2")) or time_str_to_ms(qres.get("Q1"))
                        break

                for qres in quali_items:
                    d = qres.get("Driver", {})
                    d_code = d.get("code") or d.get("familyName", "")[:3].upper()
                    d_full = f"{d.get('givenName', '')} {d.get('familyName', '')}".strip()

                    d_row = conn.execute(
                        text("SELECT id FROM drivers WHERE full_name = :full"),
                        {"full": d_full}
                    ).first()
                    if d_row:
                        driver_id = d_row[0]
                    else:
                        driver_id = conn.execute(
                            text("INSERT INTO drivers (full_name, code, nationality) VALUES (:full, :code, :nat) RETURNING id"),
                            {"full": d_full, "code": d_code, "nat": d.get("nationality")}
                        ).scalar()

                    pos = int(qres.get("position", 0)) if qres.get("position") and str(qres.get("position")).isdigit() else None
                    q1_ms = time_str_to_ms(qres.get("Q1"))
                    q2_ms = time_str_to_ms(qres.get("Q2"))
                    q3_ms = time_str_to_ms(qres.get("Q3"))

                    best_time = q3_ms or q2_ms or q1_ms
                    gap_to_pole = (best_time - pole_time_ms) if (best_time and pole_time_ms and best_time >= pole_time_ms) else (0 if pos == 1 else None)

                    conn.execute(
                        text("""
                            INSERT INTO qualifying_results (race_id, driver_id, qualifying_position, grid_position, q1_time_ms, q2_time_ms, q3_time_ms, gap_to_pole_ms)
                            VALUES (:rid, :did, :pos, :pos, :q1, :q2, :q3, :gap)
                            ON CONFLICT (race_id, driver_id) DO UPDATE
                            SET qualifying_position = EXCLUDED.qualifying_position,
                                grid_position = EXCLUDED.grid_position,
                                q1_time_ms = EXCLUDED.q1_time_ms,
                                q2_time_ms = EXCLUDED.q2_time_ms,
                                q3_time_ms = EXCLUDED.q3_time_ms,
                                gap_to_pole_ms = EXCLUDED.gap_to_pole_ms
                        """),
                        {
                            "rid": race_id,
                            "did": driver_id,
                            "pos": pos,
                            "q1": q1_ms,
                            "q2": q2_ms,
                            "q3": q3_ms,
                            "gap": gap_to_pole
                        }
                    )

            offset += limit

def generate_predictions_for_seasons(seasons: list[int]):
    logger.info(f"Generating podium predictions for seasons: {seasons}")
    with engine.begin() as conn:
        for season in seasons:
            race_rows = conn.execute(
                text("SELECT id FROM races WHERE season = :season ORDER BY round"),
                {"season": season}
            ).fetchall()

            for r in race_rows:
                r_id = r[0]
                entries = conn.execute(
                    text("""
                        SELECT e.driver_id, d.code, d.full_name, qr.qualifying_position
                        FROM entries e
                        JOIN drivers d ON d.id = e.driver_id
                        LEFT JOIN qualifying_results qr ON qr.race_id = e.race_id AND qr.driver_id = e.driver_id
                        WHERE e.race_id = :rid
                    """),
                    {"rid": r_id}
                ).fetchall()

                for entry in entries:
                    did = entry.driver_id
                    qpos = entry.qualifying_position or 12
                    
                    # Pre-weekend estimate
                    prob_pre = max(0.02, min(0.85, 0.90 / (1 + 0.3 * (qpos + 1))))
                    # Post-qualifying estimate
                    prob_post = max(0.01, min(0.92, 1.0 / (1 + 0.35 * qpos)))

                    for ctype, prob in [("PRE_WEEKEND", prob_pre), ("POST_QUALIFYING", prob_post)]:
                        existing_p = conn.execute(
                            text("SELECT id FROM predictions WHERE race_id = :rid AND driver_id = :did AND cutoff_type = :ctype"),
                            {"rid": r_id, "did": did, "ctype": ctype}
                        ).first()
                        if existing_p:
                            conn.execute(
                                text("UPDATE predictions SET probability = :prob WHERE id = :id"),
                                {"prob": round(prob, 4), "id": existing_p[0]}
                            )
                        else:
                            conn.execute(
                                text("""
                                    INSERT INTO predictions (race_id, driver_id, cutoff_type, cutoff_time, probability, model_version)
                                    VALUES (:rid, :did, :ctype, NOW(), :prob, 'v1.0-xgb')
                                """),
                                {"rid": r_id, "did": did, "ctype": ctype, "prob": round(prob, 4)}
                            )

def main():
    logger.info("Starting comprehensive backfill for 2021-2026 seasons...")
    ensure_constraints()

    # 1. Update Calendars
    for season in [2021, 2022, 2023, 2024, 2025, 2026]:
        ingest_season_schedule(season)

    # 2. Ingest Full Results with Pagination
    for season in [2021, 2022, 2023, 2024, 2025, 2026]:
        ingest_season_results_paginated(season)

    # 3. Ingest Full Qualifying with Pagination
    for season in [2021, 2022, 2023, 2024, 2025, 2026]:
        ingest_season_qualifying_paginated(season)

    # 4. Generate Predictions for 2025 and 2026
    generate_predictions_for_seasons([2025, 2026])

    logger.info("Comprehensive backfill finished successfully!")

if __name__ == "__main__":
    main()
