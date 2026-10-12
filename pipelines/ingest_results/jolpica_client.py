"""
pipelines/ingest_results/jolpica_client.py
------------------------------------------
HTTP client for the Jolpica F1 API (Ergast-compatible).

Features
--------
* Automatic pagination (limit/offset)
* Exponential-backoff retry via Tenacity
* Rate limiting (≤ 1 request per second)
* Raw JSON responses persisted under data/raw/jolpica/
"""

from __future__ import annotations

import json
import logging
import time
from pathlib import Path
from typing import Any, Optional

import requests
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
    before_sleep_log,
)

from pipelines.config import (
    DATA_DIR,
    JOLPICA_BASE_URL,
    JOLPICA_DEFAULT_LIMIT,
    JOLPICA_USER_AGENT,
)

logger = logging.getLogger(__name__)

# Minimum interval between outgoing requests (seconds)
_REQUEST_INTERVAL = 1.0


class JolpicaClient:
    """Client for the Jolpica F1 REST API.

    All public methods fetch the full result (across pages), persist the raw
    JSON to disk, and return the parsed list of records.

    Args:
        base_url: Override the base URL (useful for testing).
        user_agent: ``User-Agent`` header value.
        raw_dir: Root directory for raw JSON dumps.
        limit: Page size for paginated requests.
    """

    def __init__(
        self,
        base_url: str = JOLPICA_BASE_URL,
        user_agent: str = JOLPICA_USER_AGENT,
        raw_dir: Optional[str] = None,
        limit: int = JOLPICA_DEFAULT_LIMIT,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._limit = limit
        self._last_request_time: float = 0.0
        self._raw_root = Path(raw_dir or DATA_DIR) / "raw" / "jolpica"

        self._session = requests.Session()
        self._session.headers.update({"User-Agent": user_agent})

    # ------------------------------------------------------------------
    # Internal HTTP helpers
    # ------------------------------------------------------------------

    def _throttle(self) -> None:
        """Sleep if needed to respect the 1-request-per-second limit."""
        elapsed = time.monotonic() - self._last_request_time
        if elapsed < _REQUEST_INTERVAL:
            time.sleep(_REQUEST_INTERVAL - elapsed)

    @retry(
        retry=retry_if_exception_type((requests.Timeout, requests.ConnectionError)),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        stop=stop_after_attempt(5),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True,
    )
    def _get(self, url: str, params: dict[str, Any] | None = None) -> dict:
        """Perform a GET request with retry on transient errors.

        Args:
            url: Full URL to fetch.
            params: Optional query parameters.

        Returns:
            Parsed JSON response body as a dict.

        Raises:
            requests.HTTPError: For non-2xx responses that are not transient.
        """
        self._throttle()
        logger.debug("GET %s params=%s", url, params)
        resp = self._session.get(url, params=params, timeout=30)
        self._last_request_time = time.monotonic()
        resp.raise_for_status()
        return resp.json()

    def _fetch_paginated(self, path: str) -> list[dict]:
        """Fetch all pages for *path* and return the concatenated MRData body.

        Args:
            path: API path relative to the base URL (no leading slash required).

        Returns:
            Full list of page-level response dicts (``MRData`` objects).
        """
        url = f"{self._base_url}/{path.lstrip('/')}.json"
        offset = 0
        all_pages: list[dict] = []

        while True:
            data = self._get(url, params={"limit": self._limit, "offset": offset})
            all_pages.append(data)

            mrdata = data.get("MRData", {})
            total = int(mrdata.get("total", 0))
            offset += self._limit
            if offset >= total:
                break

        return all_pages

    # ------------------------------------------------------------------
    # Raw JSON persistence
    # ------------------------------------------------------------------

    def _save_raw(
        self,
        season: Optional[int],
        round_num: Optional[int],
        endpoint: str,
        data: Any,
    ) -> None:
        """Persist *data* as JSON under the raw data tree.

        Path pattern: ``data/raw/jolpica/{season}/{round}/{endpoint}.json``

        Args:
            season: Championship year, or ``None`` for global endpoints.
            round_num: Race round number, or ``None``.
            endpoint: Short label (e.g. ``"drivers"``, ``"results"``).
            data: JSON-serialisable object to persist.
        """
        parts = [str(season) if season else "global"]
        if round_num is not None:
            parts.append(str(round_num))
        directory = self._raw_root.joinpath(*parts)
        directory.mkdir(parents=True, exist_ok=True)
        out_path = directory / f"{endpoint}.json"
        with out_path.open("w", encoding="utf-8") as fh:
            json.dump(data, fh, indent=2)
        logger.debug("Saved raw JSON → %s", out_path)

    # ------------------------------------------------------------------
    # Public API methods
    # ------------------------------------------------------------------

    def get_seasons(self) -> list[dict]:
        """Fetch a list of all available F1 seasons.

        Returns:
            List of season dicts from ``SeasonTable.Seasons``.
        """
        pages = self._fetch_paginated("seasons")
        seasons: list[dict] = []
        for page in pages:
            seasons.extend(page.get("MRData", {}).get("SeasonTable", {}).get("Seasons", []))
        self._save_raw(None, None, "seasons", pages)
        return seasons

    def get_races(self, season: int) -> list[dict]:
        """Fetch race schedule with circuit info for *season*.

        Args:
            season: Championship year (e.g. ``2023``).

        Returns:
            List of race dicts from ``RaceTable.Races``.
        """
        pages = self._fetch_paginated(f"{season}")
        races: list[dict] = []
        for page in pages:
            races.extend(page.get("MRData", {}).get("RaceTable", {}).get("Races", []))
        self._save_raw(season, None, "races", pages)
        return races

    def get_drivers(self, season: int) -> list[dict]:
        """Fetch drivers who participated in *season*.

        Args:
            season: Championship year.

        Returns:
            List of driver dicts from ``DriverTable.Drivers``.
        """
        pages = self._fetch_paginated(f"{season}/drivers")
        drivers: list[dict] = []
        for page in pages:
            drivers.extend(page.get("MRData", {}).get("DriverTable", {}).get("Drivers", []))
        self._save_raw(season, None, "drivers", pages)
        return drivers

    def get_constructors(self, season: int) -> list[dict]:
        """Fetch constructors who participated in *season*.

        Args:
            season: Championship year.

        Returns:
            List of constructor dicts from ``ConstructorTable.Constructors``.
        """
        pages = self._fetch_paginated(f"{season}/constructors")
        constructors: list[dict] = []
        for page in pages:
            constructors.extend(
                page.get("MRData", {}).get("ConstructorTable", {}).get("Constructors", [])
            )
        self._save_raw(season, None, "constructors", pages)
        return constructors

    def get_qualifying(self, season: int, round: int) -> list[dict]:
        """Fetch qualifying results for *season* / *round*.

        Args:
            season: Championship year.
            round: Race round number (1-indexed).

        Returns:
            List of qualifying result dicts from ``QualifyingTable.Races[0].QualifyingResults``.
        """
        pages = self._fetch_paginated(f"{season}/{round}/qualifying")
        results: list[dict] = []
        for page in pages:
            races = page.get("MRData", {}).get("QualifyingTable", {}).get("Races", [])
            for race in races:
                results.extend(race.get("QualifyingResults", []))
        self._save_raw(season, round, "qualifying", pages)
        return results

    def get_race_results(self, season: int, round: int) -> list[dict]:
        """Fetch race results for *season* / *round*.

        Args:
            season: Championship year.
            round: Race round number (1-indexed).

        Returns:
            List of result dicts from ``RaceTable.Races[0].Results``.
        """
        pages = self._fetch_paginated(f"{season}/{round}/results")
        results: list[dict] = []
        for page in pages:
            races = page.get("MRData", {}).get("RaceTable", {}).get("Races", [])
            for race in races:
                results.extend(race.get("Results", []))
        self._save_raw(season, round, "results", pages)
        return results
