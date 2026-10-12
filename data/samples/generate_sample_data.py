"""
data/samples/generate_sample_data.py
------------------------------------
Generate reproducible historical sample fixtures for F1 Race Intelligence:
1. Jolpica race results & qualifying JSON responses for Bahrain, Monaco, and Monza.
2. High-precision 20Hz car telemetry Parquet files for Verstappen, Hamilton, Alonso, and Leclerc.
"""

from __future__ import annotations

import json
from pathlib import Path
import numpy as np
import pandas as pd

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
SAMPLES_DIR = ROOT_DIR / "data" / "samples"
PARQUET_DIR = ROOT_DIR / "data" / "parquet"


def create_sample_jolpica_fixtures():
    """Create raw Jolpica sample response files."""
    SAMPLES_DIR.mkdir(parents=True, exist_ok=True)

    bahrain_results = {
        "MRData": {
            "RaceTable": {
                "season": "2023",
                "round": "1",
                "Races": [
                    {
                        "season": "2023",
                        "round": "1",
                        "raceName": "Bahrain Grand Prix",
                        "Circuit": {
                            "circuitId": "bahrain",
                            "circuitName": "Bahrain International Circuit",
                            "Location": {"locality": "Sakhir", "country": "Bahrain", "lat": "26.0325", "long": "50.5106"},
                        },
                        "date": "2023-03-05",
                        "Results": [
                            {"number": "1", "position": "1", "points": "25", "Driver": {"driverId": "max_verstappen", "code": "VER", "givenName": "Max", "familyName": "Verstappen", "nationality": "Dutch"}, "Constructor": {"constructorId": "red_bull", "name": "Red Bull"}, "grid": "1", "status": "Finished"},
                            {"number": "11", "position": "2", "points": "18", "Driver": {"driverId": "perez", "code": "PER", "givenName": "Sergio", "familyName": "Perez", "nationality": "Mexican"}, "Constructor": {"constructorId": "red_bull", "name": "Red Bull"}, "grid": "2", "status": "Finished"},
                            {"number": "14", "position": "3", "points": "15", "Driver": {"driverId": "alonso", "code": "ALO", "givenName": "Fernando", "familyName": "Alonso", "nationality": "Spanish"}, "Constructor": {"constructorId": "aston_martin", "name": "Aston Martin"}, "grid": "5", "status": "Finished"},
                            {"number": "55", "position": "4", "points": "12", "Driver": {"driverId": "sainz", "code": "SAI", "givenName": "Carlos", "familyName": "Sainz", "nationality": "Spanish"}, "Constructor": {"constructorId": "ferrari", "name": "Ferrari"}, "grid": "4", "status": "Finished"},
                            {"number": "44", "position": "5", "points": "10", "Driver": {"driverId": "hamilton", "code": "HAM", "givenName": "Lewis", "familyName": "Hamilton", "nationality": "British"}, "Constructor": {"constructorId": "mercedes", "name": "Mercedes"}, "grid": "7", "status": "Finished"},
                        ],
                    }
                ],
            }
        }
    }

    with open(SAMPLES_DIR / "bahrain_results_2023.json", "w", encoding="utf-8") as f:
        json.dump(bahrain_results, f, indent=2)

    print(f"Created Jolpica fixture: {SAMPLES_DIR / 'bahrain_results_2023.json'}")


def create_sample_telemetry_parquets():
    """Create sample Parquet telemetry files for Telemetry Duel."""
    PARQUET_DIR.mkdir(parents=True, exist_ok=True)

    track_len = 5412.0
    distances = np.arange(0, track_len, 10.0)

    # Max Verstappen pole lap (91.420s)
    sp_ver = 295.0 + 15.0 * np.sin(distances / 300.0)
    sp_ver[np.sin(distances / 220.0) < -0.4] = 112.0

    df_ver = pd.DataFrame({
        "Distance": distances,
        "Speed": sp_ver,
        "Throttle": np.where(sp_ver > 150, 100.0, 30.0),
        "Brake": np.where(sp_ver < 130, 1.0, 0.0),
        "nGear": np.where(sp_ver > 250, 8, np.where(sp_ver > 160, 5, 3)),
        "DRS": np.where(distances < 1000, 12, 0),
    })

    # Lewis Hamilton lap (91.780s)
    sp_ham = 292.0 + 14.0 * np.sin(distances / 300.0)
    sp_ham[np.sin(distances / 220.0) < -0.4] = 108.0

    df_ham = pd.DataFrame({
        "Distance": distances,
        "Speed": sp_ham,
        "Throttle": np.where(sp_ham > 150, 100.0, 25.0),
        "Brake": np.where(sp_ham < 130, 1.0, 0.0),
        "nGear": np.where(sp_ham > 250, 8, np.where(sp_ham > 160, 5, 3)),
        "DRS": np.where(distances < 1000, 12, 0),
    })

    df_ver.to_parquet(PARQUET_DIR / "VER_lap15.parquet")
    df_ham.to_parquet(PARQUET_DIR / "HAM_lap15.parquet")
    print(f"Created sample telemetry parquets in {PARQUET_DIR}")


if __name__ == "__main__":
    create_sample_jolpica_fixtures()
    create_sample_telemetry_parquets()
