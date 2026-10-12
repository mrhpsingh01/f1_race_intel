"""
pipelines/ingest_results/normalizer.py
---------------------------------------
Transform raw Jolpica API dicts into flat dicts that map 1-to-1
to database table columns.
"""

from __future__ import annotations

import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Time conversion utilities
# ---------------------------------------------------------------------------

_TIME_RE = re.compile(r"^(?:(\d+):)?(\d{1,2})\.(\d{1,3})$")

# Jolpica status IDs that indicate a non-classified finish
_DNF_STATUS_PREFIXES = (
    "Accident", "Collision", "Engine", "Gearbox", "Transmission",
    "Clutch", "Hydraulics", "Electrical", "Spun off", "Radiator",
    "Suspension", "Brakes", "Differential", "Overheating",
    "Mechanical", "Tyre", "Driver Seat", "Puncture", "Power Unit",
    "ERS", "Did not qualify", "Did not prequalify", "Disqualified",
    "Not classified", "Withdrew", "Excluded", "Retired",
)

_DSQ_STATUS_PREFIXES = ("Disqualified", "Excluded")


def time_str_to_ms(time_str: Optional[str]) -> Optional[int]:
    """Convert a lap/sector time string to milliseconds.

    Accepts formats: ``'1:23.456'``, ``'83.456'``, ``'1:23'``.

    Args:
        time_str: Time string, or ``None`` / empty string.

    Returns:
        Integer milliseconds, or ``None`` if the input is absent or
        cannot be parsed.
    """
    if not time_str:
        return None
    m = _TIME_RE.match(time_str.strip())
    if not m:
        logger.debug("Cannot parse time string: %r", time_str)
        return None
    minutes = int(m.group(1)) if m.group(1) else 0
    seconds = int(m.group(2))
    millis_str = m.group(3).ljust(3, "0")  # pad to 3 digits
    millis = int(millis_str)
    return (minutes * 60 + seconds) * 1000 + millis


def is_dnf(status: Optional[str]) -> bool:
    """Return *True* if *status* indicates a DNF/non-finish."""
    if not status:
        return False
    for prefix in _DNF_STATUS_PREFIXES:
        if status.startswith(prefix):
            return True
    return False


def is_dsq(status: Optional[str]) -> bool:
    """Return *True* if *status* indicates disqualification."""
    if not status:
        return False
    for prefix in _DSQ_STATUS_PREFIXES:
        if status.startswith(prefix):
            return True
    return False


# ---------------------------------------------------------------------------
# Normalizers
# ---------------------------------------------------------------------------

def normalize_circuit(circuit_data: dict) -> dict:
    """Normalise a Jolpica circuit object.

    Args:
        circuit_data: Raw ``Circuit`` dict from the API.

    Returns:
        Dict matching the ``circuits`` table schema.
    """
    loc = circuit_data.get("Location", {})
    return {
        "circuit_ref": circuit_data.get("circuitId", ""),
        "name": circuit_data.get("circuitName", ""),
        "location": loc.get("locality"),
        "country": loc.get("country"),
        "lat": float(loc["lat"]) if loc.get("lat") else None,
        "lng": float(loc["long"]) if loc.get("long") else None,
        "url": circuit_data.get("url"),
    }


def normalize_driver(driver_data: dict) -> dict:
    """Normalise a Jolpica driver object.

    Args:
        driver_data: Raw ``Driver`` dict from the API.

    Returns:
        Dict matching the ``drivers`` table schema.
    """
    return {
        "driver_ref": driver_data.get("driverId", ""),
        "code": driver_data.get("code"),
        "forename": driver_data.get("givenName", ""),
        "surname": driver_data.get("familyName", ""),
        "dob": driver_data.get("dateOfBirth"),
        "nationality": driver_data.get("nationality"),
        "permanent_number": (
            int(driver_data["permanentNumber"])
            if driver_data.get("permanentNumber")
            else None
        ),
        "url": driver_data.get("url"),
    }


def normalize_constructor(constructor_data: dict) -> dict:
    """Normalise a Jolpica constructor object.

    Args:
        constructor_data: Raw ``Constructor`` dict from the API.

    Returns:
        Dict matching the ``constructors`` table schema.
    """
    return {
        "constructor_ref": constructor_data.get("constructorId", ""),
        "name": constructor_data.get("name", ""),
        "nationality": constructor_data.get("nationality"),
        "url": constructor_data.get("url"),
    }


def normalize_race(race_data: dict, circuit_id: Optional[int] = None) -> dict:
    """Normalise a Jolpica race/round object.

    Args:
        race_data: Raw ``Race`` dict from the API.
        circuit_id: FK to the ``circuits`` table (resolved externally).

    Returns:
        Dict matching the ``races`` table schema.
    """
    return {
        "season": int(race_data.get("season", 0)),
        "round": int(race_data.get("round", 0)),
        "circuit_ref": race_data.get("Circuit", {}).get("circuitId"),
        "circuit_id": circuit_id,
        "name": race_data.get("raceName", ""),
        "date": race_data.get("date"),
        "time": race_data.get("time"),
        "url": race_data.get("url"),
    }


def normalize_qualifying_result(
    quali_data: dict,
    race_id: int,
    driver_id: int,
    constructor_id: Optional[int] = None,
) -> dict:
    """Normalise one qualifying result row.

    Args:
        quali_data: Raw qualifying result dict for a single driver.
        race_id: FK to the ``races`` table.
        driver_id: FK to the ``drivers`` table.
        constructor_id: FK to the ``constructors`` table.

    Returns:
        Dict matching the ``qualifying_results`` table schema.
    """
    return {
        "race_id": race_id,
        "driver_id": driver_id,
        "constructor_id": constructor_id,
        "position": int(quali_data["position"]) if quali_data.get("position") else None,
        "q1_time_ms": time_str_to_ms(quali_data.get("Q1")),
        "q2_time_ms": time_str_to_ms(quali_data.get("Q2")),
        "q3_time_ms": time_str_to_ms(quali_data.get("Q3")),
    }


def normalize_race_result(
    result_data: dict,
    race_id: int,
    driver_id: int,
    constructor_id: Optional[int] = None,
) -> dict:
    """Normalise one race result row.

    Args:
        result_data: Raw result dict for a single driver.
        race_id: FK to the ``races`` table.
        driver_id: FK to the ``drivers`` table.
        constructor_id: FK to the ``constructors`` table.

    Returns:
        Dict matching the ``race_results`` table schema.
    """
    status = result_data.get("status", "")
    fastest_lap = result_data.get("FastestLap", {})
    fastest_lap_time = fastest_lap.get("Time", {}).get("time") if fastest_lap else None

    # grid / position handling
    grid = result_data.get("grid")
    position = result_data.get("position")
    position_text = result_data.get("positionText", "")

    return {
        "race_id": race_id,
        "driver_id": driver_id,
        "constructor_id": constructor_id,
        "grid": int(grid) if grid else None,
        "position": int(position) if position else None,
        "position_text": position_text,
        "points": float(result_data.get("points", 0)),
        "laps": int(result_data.get("laps", 0)),
        "status": status,
        "is_dnf": is_dnf(status),
        "is_dsq": is_dsq(status),
        "time_ms": time_str_to_ms(result_data.get("Time", {}).get("time")),
        "fastest_lap_rank": (
            int(fastest_lap.get("rank")) if fastest_lap and fastest_lap.get("rank") else None
        ),
        "fastest_lap_ms": time_str_to_ms(fastest_lap_time),
    }
