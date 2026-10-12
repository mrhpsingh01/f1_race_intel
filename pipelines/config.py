"""
pipelines/config.py
-------------------
Centralised settings for all ingestion pipelines.
Values are read from environment variables (with .env file support via python-dotenv).
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from the project root (two levels up from this file)
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_PROJECT_ROOT / ".env")


# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
DATABASE_URL: str = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/f1_race_intel",
)

# ---------------------------------------------------------------------------
# Jolpica (Ergast-compatible) API
# ---------------------------------------------------------------------------
JOLPICA_BASE_URL: str = os.environ.get(
    "JOLPICA_BASE_URL",
    "https://api.jolpi.ca/ergast/f1",
)

JOLPICA_USER_AGENT: str = os.environ.get(
    "JOLPICA_USER_AGENT",
    "F1RaceIntelBot/1.0 (contact@example.com)",
)

# Default page size used by Jolpica; we never exceed the documented maximum.
JOLPICA_DEFAULT_LIMIT: int = int(os.environ.get("JOLPICA_DEFAULT_LIMIT", "100"))

# ---------------------------------------------------------------------------
# FastF1
# ---------------------------------------------------------------------------
FASTF1_CACHE_DIR: str = os.environ.get(
    "FASTF1_CACHE_DIR",
    str(_PROJECT_ROOT / "data" / "cache" / "fastf1"),
)

# ---------------------------------------------------------------------------
# General data directories
# ---------------------------------------------------------------------------
DATA_DIR: str = os.environ.get(
    "DATA_DIR",
    str(_PROJECT_ROOT / "data"),
)

RAW_DIR: str = str(Path(DATA_DIR) / "raw")
PARQUET_DIR: str = str(Path(DATA_DIR) / "parquet")
