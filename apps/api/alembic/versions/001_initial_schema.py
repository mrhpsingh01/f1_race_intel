"""Initial database schema for F1 Race Intelligence.

Revision ID: 001
Revises: (none)
Create Date: 2024-01-01 00:00:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# ---------------------------------------------------------------------------
# Revision identifiers
# ---------------------------------------------------------------------------
revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create the full initial database schema."""

    # ------------------------------------------------------------------ #
    # constructors
    # ------------------------------------------------------------------ #
    op.create_table(
        "constructors",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("short_name", sa.String(50), nullable=True),
        sa.Column("nationality", sa.String(50), nullable=True),
        sa.Column("wikipedia_url", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # ------------------------------------------------------------------ #
    # drivers
    # ------------------------------------------------------------------ #
    op.create_table(
        "drivers",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("full_name", sa.String(100), nullable=False),
        sa.Column("code", sa.String(3), nullable=True),
        sa.Column("nationality", sa.String(50), nullable=True),
        sa.Column("date_of_birth", sa.Date(), nullable=True),
        sa.Column("wikipedia_url", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # ------------------------------------------------------------------ #
    # circuits
    # ------------------------------------------------------------------ #
    op.create_table(
        "circuits",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("short_name", sa.String(50), nullable=True),
        sa.Column("country", sa.String(50), nullable=True),
        sa.Column("city", sa.String(50), nullable=True),
        sa.Column("length_m", sa.Integer(), nullable=True),
        sa.Column("corners", sa.Integer(), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # ------------------------------------------------------------------ #
    # races
    # ------------------------------------------------------------------ #
    op.create_table(
        "races",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("season", sa.Integer(), nullable=False),
        sa.Column("round", sa.Integer(), nullable=False),
        sa.Column("circuit_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("date", sa.Date(), nullable=True),
        sa.Column("status", sa.String(20), server_default="completed", nullable=False),
        sa.Column("jolpica_round_key", sa.String(20), nullable=True),
        sa.ForeignKeyConstraint(["circuit_id"], ["circuits.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("season", "round", name="uq_races_season_round"),
    )

    # ------------------------------------------------------------------ #
    # sessions
    # ------------------------------------------------------------------ #
    op.create_table(
        "sessions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("race_id", sa.Integer(), nullable=False),
        sa.Column("session_type", sa.String(20), nullable=False),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(20), server_default="completed", nullable=False),
        sa.Column("weather_summary", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(["race_id"], ["races.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # ------------------------------------------------------------------ #
    # entries
    # ------------------------------------------------------------------ #
    op.create_table(
        "entries",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("race_id", sa.Integer(), nullable=False),
        sa.Column("driver_id", sa.Integer(), nullable=False),
        sa.Column("constructor_id", sa.Integer(), nullable=False),
        sa.Column("car_number", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["race_id"], ["races.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["driver_id"], ["drivers.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["constructor_id"], ["constructors.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("race_id", "driver_id", name="uq_entries_race_driver"),
    )

    # ------------------------------------------------------------------ #
    # qualifying_results
    # ------------------------------------------------------------------ #
    op.create_table(
        "qualifying_results",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("race_id", sa.Integer(), nullable=False),
        sa.Column("driver_id", sa.Integer(), nullable=False),
        sa.Column("qualifying_position", sa.Integer(), nullable=True),
        sa.Column("grid_position", sa.Integer(), nullable=True),
        sa.Column("q1_time_ms", sa.Integer(), nullable=True),
        sa.Column("q2_time_ms", sa.Integer(), nullable=True),
        sa.Column("q3_time_ms", sa.Integer(), nullable=True),
        sa.Column("gap_to_pole_ms", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["race_id"], ["races.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["driver_id"], ["drivers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # ------------------------------------------------------------------ #
    # race_results
    # ------------------------------------------------------------------ #
    op.create_table(
        "race_results",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("race_id", sa.Integer(), nullable=False),
        sa.Column("driver_id", sa.Integer(), nullable=False),
        sa.Column("final_position", sa.Integer(), nullable=True),
        sa.Column("points", sa.Float(), nullable=True),
        sa.Column("status", sa.String(50), nullable=True),
        sa.Column("stops", sa.Integer(), nullable=True),
        sa.Column("fastest_lap_rank", sa.Integer(), nullable=True),
        sa.Column("source", sa.String(50), nullable=True),
        sa.Column(
            "ingested_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["race_id"], ["races.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["driver_id"], ["drivers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # ------------------------------------------------------------------ #
    # laps
    # ------------------------------------------------------------------ #
    op.create_table(
        "laps",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("driver_id", sa.Integer(), nullable=False),
        sa.Column("lap_number", sa.Integer(), nullable=False),
        sa.Column("lap_time_ms", sa.Integer(), nullable=True),
        sa.Column("sector1_ms", sa.Integer(), nullable=True),
        sa.Column("sector2_ms", sa.Integer(), nullable=True),
        sa.Column("sector3_ms", sa.Integer(), nullable=True),
        sa.Column("compound", sa.String(20), nullable=True),
        sa.Column("tyre_age", sa.Integer(), nullable=True),
        sa.Column("position", sa.Integer(), nullable=True),
        sa.Column("pit_in_time_ms", sa.Integer(), nullable=True),
        sa.Column("pit_out_time_ms", sa.Integer(), nullable=True),
        sa.Column("is_pit_lap", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("is_in_lap", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("is_out_lap", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("track_status", sa.String(10), nullable=True),
        sa.Column("source", sa.String(50), nullable=True),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["driver_id"], ["drivers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "session_id", "driver_id", "lap_number", name="uq_laps_session_driver_lap"
        ),
    )
    op.create_index("ix_laps_session_driver", "laps", ["session_id", "driver_id"])

    # ------------------------------------------------------------------ #
    # stints
    # ------------------------------------------------------------------ #
    op.create_table(
        "stints",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("driver_id", sa.Integer(), nullable=False),
        sa.Column("compound", sa.String(20), nullable=True),
        sa.Column("start_lap", sa.Integer(), nullable=True),
        sa.Column("end_lap", sa.Integer(), nullable=True),
        sa.Column("tyre_age_at_start", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["driver_id"], ["drivers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # ------------------------------------------------------------------ #
    # pit_stops
    # ------------------------------------------------------------------ #
    op.create_table(
        "pit_stops",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("driver_id", sa.Integer(), nullable=False),
        sa.Column("lap", sa.Integer(), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("stop_number", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["driver_id"], ["drivers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # ------------------------------------------------------------------ #
    # telemetry_assets
    # ------------------------------------------------------------------ #
    op.create_table(
        "telemetry_assets",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("driver_id", sa.Integer(), nullable=False),
        sa.Column("lap_number", sa.Integer(), nullable=True),
        sa.Column("file_path", sa.Text(), nullable=False),
        sa.Column("source", sa.String(50), nullable=True),
        sa.Column("processing_version", sa.String(20), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["driver_id"], ["drivers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "session_id",
            "driver_id",
            "lap_number",
            name="uq_telemetry_session_driver_lap",
        ),
    )

    # ------------------------------------------------------------------ #
    # predictions
    # ------------------------------------------------------------------ #
    op.create_table(
        "predictions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("race_id", sa.Integer(), nullable=False),
        sa.Column("driver_id", sa.Integer(), nullable=False),
        sa.Column("cutoff_type", sa.String(20), nullable=True),
        sa.Column("cutoff_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("probability", sa.Float(), nullable=True),
        sa.Column("model_version", sa.String(50), nullable=True),
        sa.Column("feature_values", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("feature_importance", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["race_id"], ["races.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["driver_id"], ["drivers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # ------------------------------------------------------------------ #
    # model_runs
    # ------------------------------------------------------------------ #
    op.create_table(
        "model_runs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("model_version", sa.String(50), nullable=False),
        sa.Column("training_period_start", sa.Integer(), nullable=True),
        sa.Column("training_period_end", sa.Integer(), nullable=True),
        sa.Column("feature_names", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("metrics", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=True,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("model_version", name="uq_model_runs_version"),
    )

    # ------------------------------------------------------------------ #
    # ingestion_jobs
    # ------------------------------------------------------------------ #
    op.create_table(
        "ingestion_jobs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("job_type", sa.String(50), nullable=True),
        sa.Column("target_id", sa.String(100), nullable=True),
        sa.Column("status", sa.String(20), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("records_processed", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    """Drop all tables in reverse dependency order."""
    op.drop_table("ingestion_jobs")
    op.drop_table("model_runs")
    op.drop_table("predictions")
    op.drop_table("telemetry_assets")
    op.drop_table("pit_stops")
    op.drop_table("stints")
    op.drop_index("ix_laps_session_driver", table_name="laps")
    op.drop_table("laps")
    op.drop_table("race_results")
    op.drop_table("qualifying_results")
    op.drop_table("entries")
    op.drop_table("sessions")
    op.drop_table("races")
    op.drop_table("circuits")
    op.drop_table("drivers")
    op.drop_table("constructors")
