"""
pipelines/ingest_results/populate_historical.py
------------------------------------------------
Batch ingests F1 calendar, circuits, drivers, constructors, race results,
and qualifying from Jolpica API for seasons 2021 through current (2024/2025).
"""

import sys
import logging
import requests
import datetime
from sqlalchemy import text
from database import engine

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("populate_historical")

BASE_URL = "https://api.jolpi.ca/ergast/f1"
HEADERS = {"User-Agent": "F1RaceIntel/1.0 (contact@f1raceintel.local)"}

def fetch_json(endpoint: str) -> dict:
    url = f"{BASE_URL}/{endpoint}.json?limit=100"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=25)
        if resp.status_code == 200:
            return resp.json()
        logger.warning(f"Failed to fetch {url}: {resp.status_code}")
    except Exception as e:
        logger.warning(f"Error fetching {url}: {e}")
    return {}

def populate_seasons(seasons: list[int]):
    with engine.begin() as conn:
        for season in seasons:
            logger.info(f"--- Ingesting Season {season} ---")
            data = fetch_json(f"{season}")
            races_list = data.get("MRData", {}).get("RaceTable", {}).get("Races", [])
            logger.info(f"Season {season}: Found {len(races_list)} races")

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

                # Upsert circuit
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

                # Status check
                is_completed = race_date and race_date <= datetime.date.today()
                status = "completed" if is_completed else "upcoming"

                # Upsert Race
                race_id = conn.execute(
                    text("""
                        INSERT INTO races (season, round, circuit_id, name, date, status, jolpica_round_key)
                        VALUES (:season, :round, :circuit_id, :name, :date, :status, :key)
                        ON CONFLICT (season, round) DO UPDATE
                        SET circuit_id = EXCLUDED.circuit_id,
                            name = EXCLUDED.name,
                            date = EXCLUDED.date,
                            status = EXCLUDED.status
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

                # Ensure Sessions exist for this race
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

            # Ingest Results for completed races
            res_data = fetch_json(f"{season}/results")
            res_races = res_data.get("MRData", {}).get("RaceTable", {}).get("Races", [])
            for r in res_races:
                round_num = int(r.get("round", 1))
                race_row = conn.execute(
                    text("SELECT id FROM races WHERE season = :season AND round = :round"),
                    {"season": season, "round": round_num}
                ).first()
                if not race_row:
                    continue
                race_id = race_row[0]

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
                    else:
                        driver_id = conn.execute(
                            text("INSERT INTO drivers (full_name, code, nationality) VALUES (:full, :code, :nat) RETURNING id"),
                            {"full": d_full, "code": d_code, "nat": d_nat}
                        ).scalar()

                    # Constructor
                    c = result.get("Constructor", {})
                    c_name = c.get("name", "Unknown")
                    c_nat = c.get("nationality")
                    c_row = conn.execute(
                        text("SELECT id FROM constructors WHERE name = :name"),
                        {"name": c_name}
                    ).first()
                    if c_row:
                        constructor_id = c_row[0]
                    else:
                        constructor_id = conn.execute(
                            text("INSERT INTO constructors (name, nationality) VALUES (:name, :nat) RETURNING id"),
                            {"name": c_name, "nat": c_nat}
                        ).scalar()

                    # Entry
                    conn.execute(
                        text("""
                            INSERT INTO entries (race_id, driver_id, constructor_id, car_number)
                            VALUES (:rid, :did, :cid, :cnum)
                            ON CONFLICT (race_id, driver_id) DO UPDATE
                            SET constructor_id = EXCLUDED.constructor_id, car_number = EXCLUDED.car_number
                        """),
                        {
                            "rid": race_id,
                            "did": driver_id,
                            "cid": constructor_id,
                            "cnum": int(result.get("number", 0)) if result.get("number") else None
                        }
                    )

                    # Race Result
                    pos = int(result.get("position", 0)) if result.get("position") else None
                    pts = float(result.get("points", 0.0))
                    status_str = result.get("status", "Finished")

                    existing_res = conn.execute(
                        text("SELECT id FROM race_results WHERE race_id = :rid AND driver_id = :did"),
                        {"rid": race_id, "did": driver_id}
                    ).first()

                    if existing_res:
                        conn.execute(
                            text("""
                                UPDATE race_results
                                SET final_position = :pos, points = :pts, status = :st
                                WHERE id = :id
                            """),
                            {"pos": pos, "pts": pts, "st": status_str, "id": existing_res[0]}
                        )
                    else:
                        conn.execute(
                            text("""
                                INSERT INTO race_results (race_id, driver_id, final_position, points, status, source)
                                VALUES (:rid, :did, :pos, :pts, :st, 'jolpica')
                            """),
                            {"rid": race_id, "did": driver_id, "pos": pos, "pts": pts, "st": status_str}
                        )

            # Ingest Qualifying for season
            q_data = fetch_json(f"{season}/qualifying")
            q_races = q_data.get("MRData", {}).get("RaceTable", {}).get("Races", [])
            for r in q_races:
                round_num = int(r.get("round", 1))
                race_row = conn.execute(
                    text("SELECT id FROM races WHERE season = :season AND round = :round"),
                    {"season": season, "round": round_num}
                ).first()
                if not race_row:
                    continue
                race_id = race_row[0]

                for qres in r.get("QualifyingResults", []):
                    d = qres.get("Driver", {})
                    d_full = f"{d.get('givenName', '')} {d.get('familyName', '')}".strip()
                    d_row = conn.execute(text("SELECT id FROM drivers WHERE full_name = :full"), {"full": d_full}).first()
                    if not d_row:
                        continue
                    driver_id = d_row[0]
                    q_pos = int(qres.get("position", 0)) if qres.get("position") else None

                    # Check existing qualifying result
                    existing_q = conn.execute(
                        text("SELECT id FROM qualifying_results WHERE race_id = :rid AND driver_id = :did"),
                        {"rid": race_id, "did": driver_id}
                    ).first()
                    if existing_q:
                        conn.execute(
                            text("UPDATE qualifying_results SET qualifying_position = :pos, grid_position = :pos WHERE id = :id"),
                            {"pos": q_pos, "id": existing_q[0]}
                        )
                    else:
                        conn.execute(
                            text("INSERT INTO qualifying_results (race_id, driver_id, qualifying_position, grid_position) VALUES (:rid, :did, :pos, :pos)"),
                            {"rid": race_id, "did": driver_id, "pos": q_pos}
                        )

            # Generate predictions for this season's completed and upcoming races
            season_races = conn.execute(
                text("SELECT id FROM races WHERE season = :season"),
                {"season": season}
            ).fetchall()

            for s_race in season_races:
                r_id = s_race[0]
                # Get drivers in this race
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

                    # Upsert predictions
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

    logger.info("Historical data ingestion completed!")

if __name__ == "__main__":
    target_seasons = [2021, 2022, 2023, 2024]
    populate_seasons(target_seasons)
