"""Pydantic response schemas for the F1 Race Intelligence API."""

from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------


class SessionTypeEnum(str, Enum):
    PRACTICE_1 = "PRACTICE_1"
    PRACTICE_2 = "PRACTICE_2"
    PRACTICE_3 = "PRACTICE_3"
    QUALIFYING = "QUALIFYING"
    RACE = "RACE"
    SPRINT = "SPRINT"


class CompoundEnum(str, Enum):
    SOFT = "SOFT"
    MEDIUM = "MEDIUM"
    HARD = "HARD"
    INTERMEDIATE = "INTERMEDIATE"
    WET = "WET"
    UNKNOWN = "UNKNOWN"


# ---------------------------------------------------------------------------
# Core entity schemas
# ---------------------------------------------------------------------------


class CircuitSchema(BaseModel):
    id: int
    name: str
    short_name: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    length_m: Optional[int] = None
    corners: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    model_config = {"from_attributes": True}


class DriverSchema(BaseModel):
    id: int
    full_name: str
    code: Optional[str] = None
    nationality: Optional[str] = None

    model_config = {"from_attributes": True}


class RaceSchema(BaseModel):
    id: int
    season: int
    round: int
    name: str
    date: Optional[date] = None
    circuit: Optional[CircuitSchema] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Race overview / results
# ---------------------------------------------------------------------------


class DriverResultSchema(BaseModel):
    driver_id: int
    driver_name: str
    driver_code: Optional[str] = None
    team_name: str
    final_position: Optional[int] = None
    points: float
    status: Optional[str] = None
    qualifying_position: Optional[int] = None
    gap_to_pole_ms: Optional[int] = None


class RaceOverviewSchema(BaseModel):
    race: RaceSchema
    results: List[DriverResultSchema]
    sessions: List[dict]
    has_telemetry: bool


# ---------------------------------------------------------------------------
# Lap / stint data
# ---------------------------------------------------------------------------


class LapSchema(BaseModel):
    driver_code: str
    lap_number: int
    lap_time_ms: Optional[int] = None
    compound: Optional[str] = None
    tyre_age: Optional[int] = None
    position: Optional[int] = None
    is_pit_lap: bool


class LapsResponseSchema(BaseModel):
    session_id: int
    laps: List[LapSchema]


# ---------------------------------------------------------------------------
# Telemetry comparison
# ---------------------------------------------------------------------------


class TelemetryCompareResponseSchema(BaseModel):
    session_id: str
    laps: List[dict]
    distance_m: List[float]
    speed_kph: Dict[str, List[float]]
    throttle: Dict[str, List[float]]
    brake: Dict[str, List[float]]
    gear: Dict[str, List[float]]
    drs: Dict[str, List[float]]
    delta_ms: List[float]
    quality_flags: List[str]


# ---------------------------------------------------------------------------
# Predictions
# ---------------------------------------------------------------------------


class KeyFactorSchema(BaseModel):
    name: str
    value: Any
    direction: str  # 'positive', 'negative', 'neutral'


class DriverPredictionSchema(BaseModel):
    driver_id: int
    driver_name: str
    driver_code: Optional[str] = None
    team_name: str
    probability: float
    qualifying_position: Optional[int] = None
    key_factors: List[KeyFactorSchema]
    model_version: str
    cutoff_time: Optional[datetime] = None


class ModelMetricsSchema(BaseModel):
    brier_score: Optional[float] = None
    log_loss: Optional[float] = None
    calibration_note: str


class PredictionsResponseSchema(BaseModel):
    race: RaceSchema
    cutoff_type: str
    predictions: List[DriverPredictionSchema]
    model_metrics: ModelMetricsSchema


# ---------------------------------------------------------------------------
# Chat / AI assistant
# ---------------------------------------------------------------------------


class ChatMessageSchema(BaseModel):
    message: str
    context: Optional[dict] = None


class ChatSourceSchema(BaseModel):
    type: str
    id: Any
    label: str
    url: Optional[str] = None


class ChatResponseSchema(BaseModel):
    answer: str
    sources: List[ChatSourceSchema]
    functions_called: List[str]
