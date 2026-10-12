"""SQLAlchemy engine, session factory, and dependency injection helper."""

from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from config import get_settings


class Base(DeclarativeBase):
    """Base class for all ORM models."""


def _build_engine():
    settings = get_settings()
    engine = create_engine(
        settings.database_url,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        echo=settings.debug,
    )
    return engine


engine = _build_engine()

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    class_=Session,
)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a database session and closes it afterward."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
