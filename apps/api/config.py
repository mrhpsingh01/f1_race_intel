"""Application settings loaded from environment / .env file."""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration via pydantic-settings.

    Values are read from environment variables and, if present, from a
    ``.env`` file in the project root.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ------------------------------------------------------------------ #
    # Database
    # ------------------------------------------------------------------ #
    database_url: str = Field(
        default="postgresql://f1user:f1pass@localhost:5432/f1_race_intel",
        description="SQLAlchemy-compatible PostgreSQL connection string.",
    )

    # ------------------------------------------------------------------ #
    # External APIs
    # ------------------------------------------------------------------ #
    gemini_api_key: str = Field(
        default="",
        description="Google Gemini API key.",
    )
    jolpica_user_agent: str = Field(
        default="F1RaceIntel/1.0 (user@example.com)",
        description="User-Agent header sent to Jolpica/Ergast API.",
    )

    # ------------------------------------------------------------------ #
    # FastF1 cache
    # ------------------------------------------------------------------ #
    fastf1_cache_dir: str = Field(
        default="./data/fastf1_cache",
        description="Local directory used by FastF1 for caching session data.",
    )

    # ------------------------------------------------------------------ #
    # App metadata
    # ------------------------------------------------------------------ #
    app_name: str = "F1 Race Intelligence API"
    app_version: str = "0.1.0"
    debug: bool = False


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached singleton Settings instance."""
    return Settings()
