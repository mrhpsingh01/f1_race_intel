"""SQLAlchemy ORM models for the F1 Race Intelligence database."""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class Constructor(Base):
    """F1 constructor (team)."""

    __tablename__ = "constructors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    short_name: Mapped[str | None] = mapped_column(String(50))
    nationality: Mapped[str | None] = mapped_column(String(50))
    wikipedia_url: Mapped[str | None] = mapped_column(Text)

    entries: Mapped[list["Entry"]] = relationship("Entry", back_populates="constructor")


class Driver(Base):
    """F1 driver."""

    __tablename__ = "drivers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str | None] = mapped_column(String(3))
    nationality: Mapped[str | None] = mapped_column(String(50))
    date_of_birth: Mapped[date | None] = mapped_column(Date)
    wikipedia_url: Mapped[str | None] = mapped_column(Text)

    entries: Mapped[list["Entry"]] = relationship("Entry", back_populates="driver")
    qualifying_results: Mapped[list["QualifyingResult"]] = relationship(
        "QualifyingResult", back_populates="driver"
    )
    race_results: Mapped[list["RaceResult"]] = relationship(
        "RaceResult", back_populates="driver"
    )
    laps: Mapped[list["Lap"]] = relationship("Lap", back_populates="driver")
    stints: Mapped[list["Stint"]] = relationship("Stint", back_populates="driver")
    pit_stops: Mapped[list["PitStop"]] = relationship("PitStop", back_populates="driver")
    telemetry_assets: Mapped[list["TelemetryAsset"]] = relationship(
        "TelemetryAsset", back_populates="driver"
    )
    predictions: Mapped[list["Prediction"]] = relationship(
        "Prediction", back_populates="driver"
    )


class Circuit(Base):
    """F1 circuit."""

    __tablename__ = "circuits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    short_name: Mapped[str | None] = mapped_column(String(50))
    country: Mapped[str | None] = mapped_column(String(50))
    city: Mapped[str | None] = mapped_column(String(50))
    length_m: Mapped[int | None] = mapped_column(Integer)
    corners: Mapped[int | None] = mapped_column(Integer)
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)

    races: Mapped[list["Race"]] = relationship("Race", back_populates="circuit")


class Race(Base):
    """F1 race (Grand Prix)."""

    __tablename__ = "races"
    __table_args__ = (UniqueConstraint("season", "round", name="uq_races_season_round"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    season: Mapped[int] = mapped_column(Integer, nullable=False)
    round: Mapped[int] = mapped_column(Integer, nullable=False)
    circuit_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("circuits.id", ondelete="SET NULL")
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), server_default="completed")
    jolpica_round_key: Mapped[str | None] = mapped_column(String(20))

    circuit: Mapped["Circuit | None"] = relationship("Circuit", back_populates="races")
    sessions: Mapped[list["Session"]] = relationship("Session", back_populates="race")
    entries: Mapped[list["Entry"]] = relationship("Entry", back_populates="race")
    qualifying_results: Mapped[list["QualifyingResult"]] = relationship(
        "QualifyingResult", back_populates="race"
    )
    race_results: Mapped[list["RaceResult"]] = relationship(
        "RaceResult", back_populates="race"
    )
    predictions: Mapped[list["Prediction"]] = relationship(
        "Prediction", back_populates="race"
    )


class Session(Base):
    """F1 session (practice, qualifying, race)."""

    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    race_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("races.id", ondelete="CASCADE"), nullable=False
    )
    session_type: Mapped[str] = mapped_column(String(20), nullable=False)
    start_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(20), server_default="completed")
    weather_summary: Mapped[dict | None] = mapped_column(JSONB)

    race: Mapped["Race"] = relationship("Race", back_populates="sessions")
    laps: Mapped[list["Lap"]] = relationship("Lap", back_populates="session")
    stints: Mapped[list["Stint"]] = relationship("Stint", back_populates="session")
    pit_stops: Mapped[list["PitStop"]] = relationship("PitStop", back_populates="session")
    telemetry_assets: Mapped[list["TelemetryAsset"]] = relationship(
        "TelemetryAsset", back_populates="session"
    )


class Entry(Base):
    """Driver-race entry (driver + constructor pairing per race)."""

    __tablename__ = "entries"
    __table_args__ = (
        UniqueConstraint("race_id", "driver_id", name="uq_entries_race_driver"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    race_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("races.id", ondelete="CASCADE"), nullable=False
    )
    driver_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("drivers.id", ondelete="CASCADE"), nullable=False
    )
    constructor_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("constructors.id", ondelete="CASCADE"), nullable=False
    )
    car_number: Mapped[int | None] = mapped_column(Integer)

    race: Mapped["Race"] = relationship("Race", back_populates="entries")
    driver: Mapped["Driver"] = relationship("Driver", back_populates="entries")
    constructor: Mapped["Constructor"] = relationship(
        "Constructor", back_populates="entries"
    )


class QualifyingResult(Base):
    """Qualifying session result."""

    __tablename__ = "qualifying_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    race_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("races.id", ondelete="CASCADE"), nullable=False
    )
    driver_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("drivers.id", ondelete="CASCADE"), nullable=False
    )
    qualifying_position: Mapped[int | None] = mapped_column(Integer)
    grid_position: Mapped[int | None] = mapped_column(Integer)
    q1_time_ms: Mapped[int | None] = mapped_column(Integer)
    q2_time_ms: Mapped[int | None] = mapped_column(Integer)
    q3_time_ms: Mapped[int | None] = mapped_column(Integer)
    gap_to_pole_ms: Mapped[int | None] = mapped_column(Integer)

    race: Mapped["Race"] = relationship("Race", back_populates="qualifying_results")
    driver: Mapped["Driver"] = relationship("Driver", back_populates="qualifying_results")


class RaceResult(Base):
    """Race result."""

    __tablename__ = "race_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    race_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("races.id", ondelete="CASCADE"), nullable=False
    )
    driver_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("drivers.id", ondelete="CASCADE"), nullable=False
    )
    final_position: Mapped[int | None] = mapped_column(Integer)
    points: Mapped[float | None] = mapped_column(Float)
    status: Mapped[str | None] = mapped_column(String(50))
    stops: Mapped[int | None] = mapped_column(Integer)
    fastest_lap_rank: Mapped[int | None] = mapped_column(Integer)
    source: Mapped[str | None] = mapped_column(String(50))
    ingested_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    race: Mapped["Race"] = relationship("Race", back_populates="race_results")
    driver: Mapped["Driver"] = relationship("Driver", back_populates="race_results")


class Lap(Base):
    """Individual lap record."""

    __tablename__ = "laps"
    __table_args__ = (
        UniqueConstraint(
            "session_id", "driver_id", "lap_number", name="uq_laps_session_driver_lap"
        ),
        Index("ix_laps_session_driver", "session_id", "driver_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False
    )
    driver_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("drivers.id", ondelete="CASCADE"), nullable=False
    )
    lap_number: Mapped[int] = mapped_column(Integer, nullable=False)
    lap_time_ms: Mapped[int | None] = mapped_column(Integer)
    sector1_ms: Mapped[int | None] = mapped_column(Integer)
    sector2_ms: Mapped[int | None] = mapped_column(Integer)
    sector3_ms: Mapped[int | None] = mapped_column(Integer)
    compound: Mapped[str | None] = mapped_column(String(20))
    tyre_age: Mapped[int | None] = mapped_column(Integer)
    position: Mapped[int | None] = mapped_column(Integer)
    pit_in_time_ms: Mapped[int | None] = mapped_column(Integer)
    pit_out_time_ms: Mapped[int | None] = mapped_column(Integer)
    is_pit_lap: Mapped[bool] = mapped_column(Boolean, server_default="false")
    is_in_lap: Mapped[bool] = mapped_column(Boolean, server_default="false")
    is_out_lap: Mapped[bool] = mapped_column(Boolean, server_default="false")
    track_status: Mapped[str | None] = mapped_column(String(10))
    source: Mapped[str | None] = mapped_column(String(50))

    session: Mapped["Session"] = relationship("Session", back_populates="laps")
    driver: Mapped["Driver"] = relationship("Driver", back_populates="laps")


class Stint(Base):
    """Tyre stint within a session."""

    __tablename__ = "stints"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False
    )
    driver_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("drivers.id", ondelete="CASCADE"), nullable=False
    )
    compound: Mapped[str | None] = mapped_column(String(20))
    start_lap: Mapped[int | None] = mapped_column(Integer)
    end_lap: Mapped[int | None] = mapped_column(Integer)
    tyre_age_at_start: Mapped[int | None] = mapped_column(Integer)

    session: Mapped["Session"] = relationship("Session", back_populates="stints")
    driver: Mapped["Driver"] = relationship("Driver", back_populates="stints")


class PitStop(Base):
    """Pit stop event."""

    __tablename__ = "pit_stops"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False
    )
    driver_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("drivers.id", ondelete="CASCADE"), nullable=False
    )
    lap: Mapped[int | None] = mapped_column(Integer)
    duration_ms: Mapped[int | None] = mapped_column(Integer)
    stop_number: Mapped[int | None] = mapped_column(Integer)

    session: Mapped["Session"] = relationship("Session", back_populates="pit_stops")
    driver: Mapped["Driver"] = relationship("Driver", back_populates="pit_stops")


class TelemetryAsset(Base):
    """Reference to a stored telemetry parquet file."""

    __tablename__ = "telemetry_assets"
    __table_args__ = (
        UniqueConstraint(
            "session_id",
            "driver_id",
            "lap_number",
            name="uq_telemetry_session_driver_lap",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False
    )
    driver_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("drivers.id", ondelete="CASCADE"), nullable=False
    )
    lap_number: Mapped[int | None] = mapped_column(Integer)
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str | None] = mapped_column(String(50))
    processing_version: Mapped[str | None] = mapped_column(String(20))
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    session: Mapped["Session"] = relationship("Session", back_populates="telemetry_assets")
    driver: Mapped["Driver"] = relationship("Driver", back_populates="telemetry_assets")


class Prediction(Base):
    """Win-probability prediction."""

    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    race_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("races.id", ondelete="CASCADE"), nullable=False
    )
    driver_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("drivers.id", ondelete="CASCADE"), nullable=False
    )
    cutoff_type: Mapped[str | None] = mapped_column(String(20))
    cutoff_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    probability: Mapped[float | None] = mapped_column(Float)
    model_version: Mapped[str | None] = mapped_column(String(50))
    feature_values: Mapped[dict | None] = mapped_column(JSONB)
    feature_importance: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    race: Mapped["Race"] = relationship("Race", back_populates="predictions")
    driver: Mapped["Driver"] = relationship("Driver", back_populates="predictions")


class ModelRun(Base):
    """ML model training run metadata."""

    __tablename__ = "model_runs"
    __table_args__ = (
        UniqueConstraint("model_version", name="uq_model_runs_version"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    model_version: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    training_period_start: Mapped[int | None] = mapped_column(Integer)
    training_period_end: Mapped[int | None] = mapped_column(Integer)
    feature_names: Mapped[list | None] = mapped_column(JSONB)
    metrics: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class IngestionJob(Base):
    """Audit record for data ingestion jobs."""

    __tablename__ = "ingestion_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_type: Mapped[str | None] = mapped_column(String(50))
    target_id: Mapped[str | None] = mapped_column(String(100))
    status: Mapped[str | None] = mapped_column(String(20))
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_message: Mapped[str | None] = mapped_column(Text)
    records_processed: Mapped[int | None] = mapped_column(Integer)
