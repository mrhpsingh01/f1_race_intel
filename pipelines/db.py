"""
pipelines/db.py
---------------
Low-level database helpers for pipeline scripts using psycopg2 directly
(no SQLAlchemy overhead).
"""

from __future__ import annotations

import logging
from contextlib import contextmanager
from typing import Any, Generator, Iterable, Optional

import psycopg2
import psycopg2.extras
from psycopg2.extensions import connection as PgConnection, cursor as PgCursor

from pipelines.config import DATABASE_URL

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Connection management
# ---------------------------------------------------------------------------

@contextmanager
def get_connection(
    dsn: Optional[str] = None,
    autocommit: bool = False,
) -> Generator[PgConnection, None, None]:
    """Context manager that yields a psycopg2 connection.

    Commits on clean exit, rolls back on exception, then closes the connection.

    Args:
        dsn: PostgreSQL DSN string. Defaults to ``DATABASE_URL`` from config.
        autocommit: If *True* the connection is opened in autocommit mode.

    Yields:
        An open :class:`psycopg2.extensions.connection`.

    Example::

        with get_connection() as conn:
            execute_query(conn, "SELECT 1")
    """
    dsn = dsn or DATABASE_URL
    conn: PgConnection = psycopg2.connect(dsn)
    conn.autocommit = autocommit
    try:
        yield conn
        if not autocommit:
            conn.commit()
    except Exception:
        if not autocommit:
            conn.rollback()
        raise
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Query helpers
# ---------------------------------------------------------------------------

def execute_query(
    conn: PgConnection,
    sql: str,
    params: Optional[Iterable[Any]] = None,
    fetch: bool = False,
) -> Optional[list[dict]]:
    """Execute *sql* against *conn* and optionally return rows as dicts.

    Args:
        conn: An open psycopg2 connection.
        sql: The SQL statement to execute.
        params: Optional sequence of query parameters (safely escaped).
        fetch: If *True*, fetch all rows and return them as dicts.

    Returns:
        A list of dicts when *fetch* is ``True``, otherwise ``None``.
    """
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(sql, params)
        if fetch:
            return [dict(row) for row in cur.fetchall()]
    return None


def execute_many(
    conn: PgConnection,
    sql: str,
    params_seq: Iterable[Iterable[Any]],
) -> None:
    """Batch-execute *sql* for each parameter tuple in *params_seq*.

    Uses ``psycopg2.extras.execute_batch`` for better performance.

    Args:
        conn: An open psycopg2 connection.
        sql: Parameterised SQL statement.
        params_seq: Iterable of parameter sequences.
    """
    with conn.cursor() as cur:
        psycopg2.extras.execute_batch(cur, sql, list(params_seq))


# ---------------------------------------------------------------------------
# Upsert helper
# ---------------------------------------------------------------------------

def upsert(
    conn: PgConnection,
    table: str,
    row: dict[str, Any],
    conflict_columns: list[str],
    update_columns: Optional[list[str]] = None,
) -> None:
    """Generic INSERT … ON CONFLICT DO UPDATE upsert.

    Args:
        conn: An open psycopg2 connection.
        table: Target table name (unquoted).
        row: Mapping of column name → value.
        conflict_columns: Columns that form the unique constraint.
        update_columns: Columns to update on conflict. If *None*, all
            non-conflict columns are updated.

    Example::

        upsert(conn, "drivers", {"driver_id": "HAM", "name": "Lewis Hamilton"},
               conflict_columns=["driver_id"])
    """
    if not row:
        raise ValueError("row must not be empty")

    cols = list(row.keys())
    values = [row[c] for c in cols]

    if update_columns is None:
        update_columns = [c for c in cols if c not in conflict_columns]

    col_list = ", ".join(f'"{c}"' for c in cols)
    placeholder_list = ", ".join(["%s"] * len(cols))
    conflict_target = ", ".join(f'"{c}"' for c in conflict_columns)

    if update_columns:
        update_set = ", ".join(f'"{c}" = EXCLUDED."{c}"' for c in update_columns)
        do_clause = f"DO UPDATE SET {update_set}"
    else:
        do_clause = "DO NOTHING"

    sql = (
        f'INSERT INTO "{table}" ({col_list}) '
        f"VALUES ({placeholder_list}) "
        f"ON CONFLICT ({conflict_target}) {do_clause}"
    )

    logger.debug("upsert %s conflict=%s", table, conflict_columns)
    with conn.cursor() as cur:
        cur.execute(sql, values)


def fetch_one(
    conn: PgConnection,
    sql: str,
    params: Optional[Iterable[Any]] = None,
) -> Optional[dict]:
    """Execute *sql* and return the first row as a dict, or ``None``."""
    rows = execute_query(conn, sql, params, fetch=True)
    return rows[0] if rows else None


def fetch_all(
    conn: PgConnection,
    sql: str,
    params: Optional[Iterable[Any]] = None,
) -> list[dict]:
    """Execute *sql* and return all rows as dicts."""
    return execute_query(conn, sql, params, fetch=True) or []
