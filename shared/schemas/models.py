"""Pydantic v2 models for the F1 Race Intelligence shared schemas."""

from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------


class SessionType(str, Enum):
    """F1 session types."""

    PRACTICE_1 = "PRACTICE_1"
    PRACTICE_2 = "PRACTICE_2"
    PRACTICE_3 = "PRACTICE_3"
    QUALIFYING = "QUALIFYING"
    RACE = "RACE"
    SPRINT = "SPRINT"


class CutoffType(str, Enum):
    """Prediction cutoff types."""

    PRE_WEEKEND = "PRE_WEEKEND"
    POST_QUALIFYING = "POST_QUALIFYING"


class Compound(str, Enum):
    """Tyre compound types."""

    SOFT = "SOFT"
    MEDIUM = "MEDIUM"
    HARD = "HARD"
    INTERMEDIATE = "INTERMEDIATE"
    WET = "WET"
    UNKNOWN = "UNKNOWN"


# ---------------------------------------------------------------------------
# Core domain models
# ---------------------------------------------------------------------------


class Constructor(BaseModel):
    """F1 constructor (team) schema."""

    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    name: str
    short_name: Optional[str] = None
    nationality: Optional[str] = None
    wikipedia_url: Optional[str] = None


class Driver(BaseModel):
    """F1 driver schema."""

    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    full_name: str
    code: Optional[str] = Field(None, max_length=3)
    nationality: Optional[str] = None
    date_of_birth: Optional[date] = None
    wikipedia_url: Optional[str] = None


class Race(BaseModel):
    """F1 race (Grand Prix) schema."""

    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    season: int
    round: int
    circuit_id: Optional[int] = None
    name: str
    date: Optional[date] = None
    status: str = "completed"
    jolpica_round_key: Optional[str] = None


class Session(BaseModel):
    """F1 session (practice, qualifying, race) schema."""

    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    race_id: int
    session_type: SessionType
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: str = "completed"
    weather_summary: Optional[dict[str, Any]] = None


class Entry(BaseModel):
    """Driver-race entry mapping schema."""

    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    race_id: int
    driver_id: int
    constructor_id: int
    car_number: Optional[int] = None


# ---------------------------------------------------------------------------
# Results models
# ---------------------------------------------------------------------------


class QualifyingResult(BaseModel):
    """Qualifying session result schema."""

    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    race_id: int
    driver_id: int
    qualifying_position: Optional[int] = None
    grid_position: Optional[int] = None
    q1_time_ms: Optional[int] = None
    q2_time_ms: Optional[int] = None
    q3_time_ms: Optional[int] = None
    gap_to_pole_ms: Optional[int] = None


class RaceResult(BaseModel):
    """Race result schema."""

    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    race_id: int
    driver_id: int
    final_position: Optional[int] = None
    points: Optional[float] = None
    status: Optional[str] = None
    stops: Optional[int] = None
    fastest_lap_rank: Optional[int] = None
    source: Optional[str] = None
    ingested_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Lap / stint / pit stop models
# ---------------------------------------------------------------------------


class Lap(BaseModel):
    """Individual lap telemetry/timing schema."""

    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    session_id: int
    driver_id: int
    lap_number: int
    lap_time_ms: Optional[int] = None
    sector1_ms: Optional[int] = None
    sector2_ms: Optional[int] = None
    sector3_ms: Optional[int] = None
    compound: Optional[Compound] = None
    tyre_age: Optional[int] = None
    position: Optional[int] = None
    pit_in_time_ms: Optional[int] = None
    pit_out_time_ms: Optional[int] = None
    is_pit_lap: bool = False
    is_in_lap: bool = False
    is_out_lap: bool = False
    track_status: Optional[str] = None
    source: Optional[str] = None


class Stint(BaseModel):
    """Tyre stint schema."""

    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    session_id: int
    driver_id: int
    compound: Optional[Compound] = None
    start_lap: Optional[int] = None
    end_lap: Optional[int] = None
    tyre_age_at_start: Optional[int] = None


class PitStop(BaseModel):
    """Pit stop event schema."""

    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    session_id: int
    driver_id: int
    lap: Optional[int] = None
    duration_ms: Optional[int] = None
    stop_number: Optional[int] = None


# ---------------------------------------------------------------------------
# Telemetry asset model
# ---------------------------------------------------------------------------


class TelemetryAsset(BaseModel):
    """Reference to a stored telemetry parquet file."""

    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    session_id: int
    driver_id: int
    lap_number: Optional[int] = None
    file_path: str
    source: Optional[str] = None
    processing_version: Optional[str] = None
    created_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# ML prediction models
# ---------------------------------------------------------------------------


class Prediction(BaseModel):
    """Win-probability prediction schema."""

    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    race_id: int
    driver_id: int
    cutoff_type: Optional[CutoffType] = None
    cutoff_time: Optional[datetime] = None
    probability: Optional[float] = Field(None, ge=0.0, le=1.0)
    model_version: Optional[str] = None
    feature_values: Optional[dict[str, Any]] = None
    feature_importance: Optional[dict[str, Any]] = None
    created_at: Optional[datetime] = None


class ModelRun(BaseModel):
    """ML model training run metadata schema."""

    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    model_version: str
    training_period_start: Optional[int] = None  # season year
    training_period_end: Optional[int] = None
    feature_names: Optional[list[str]] = None
    metrics: Optional[dict[str, Any]] = None
    created_at: Optional[datetime] = None
