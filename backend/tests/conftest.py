"""Shared test fixtures for EduGen backend tests.

Uses SQLite in-memory database to isolate tests from PostgreSQL.
Overrides FastAPI dependencies so endpoints use the test DB session
and a fake authenticated user.
"""

from __future__ import annotations

import os

# Set required env vars BEFORE any app module is imported
os.environ.setdefault("DATABASE_URL", "sqlite:///")
os.environ.setdefault("DATA_DIR", "test_data")
os.environ.setdefault("MAX_FILE_SIZE_MB", "10")
os.environ.setdefault("CORS_ORIGINS", '["http://localhost:3000"]')
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-pytest")
os.environ.setdefault("JWT_ALGORITHM", "HS256")
os.environ.setdefault("JWT_EXPIRATION_MINUTES", "30")

from datetime import datetime, timezone
from uuid import uuid4

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.models.user import User
from app.services.auth_service import hash_password

# ── In-memory SQLite engine ─────────────────────────────────────────────────

_TEST_ENGINE = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

# Enable FK enforcement for SQLite
@event.listens_for(_TEST_ENGINE, "connect")
def _enable_fk(dbapi_conn, _rec):
    dbapi_conn.execute("PRAGMA foreign_keys=ON")

TestSession = sessionmaker(autocommit=False, autoflush=False, bind=_TEST_ENGINE)


# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def _setup_tables():
    """Create all tables before each test, drop after."""
    Base.metadata.create_all(bind=_TEST_ENGINE)
    yield
    Base.metadata.drop_all(bind=_TEST_ENGINE)


@pytest.fixture()
def db():
    """Yield a fresh DB session for service-level tests."""
    session = TestSession()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def test_user(db) -> User:
    """Create and return a regular test user."""
    user = User(
        id=str(uuid4()),
        email="test@example.com",
        password_hash=hash_password("TestPass123"),
        first_name="Test",
        last_name="User",
        is_active=True,
        is_superuser=False,
        created_at=datetime.now(timezone.utc).isoformat(),
        updated_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def superuser(db) -> User:
    """Create and return a superuser."""
    user = User(
        id=str(uuid4()),
        email="admin@example.com",
        password_hash=hash_password("AdminPass123"),
        first_name="Admin",
        last_name="Super",
        is_active=True,
        is_superuser=True,
        created_at=datetime.now(timezone.utc).isoformat(),
        updated_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def client(db, test_user):
    """FastAPI TestClient with overridden DB and auth dependencies."""
    from fastapi.testclient import TestClient

    from app.dependencies import get_current_user
    from app.main import app

    def _override_db():
        try:
            yield db
        finally:
            pass

    def _override_user():
        return test_user

    app.dependency_overrides[get_db] = _override_db
    app.dependency_overrides[get_current_user] = _override_user

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


@pytest.fixture()
def admin_client(db, superuser):
    """FastAPI TestClient authenticated as superuser."""
    from fastapi.testclient import TestClient

    from app.dependencies import get_current_user, get_current_superuser
    from app.main import app

    def _override_db():
        try:
            yield db
        finally:
            pass

    def _override_user():
        return superuser

    app.dependency_overrides[get_db] = _override_db
    app.dependency_overrides[get_current_user] = _override_user
    app.dependency_overrides[get_current_superuser] = _override_user

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()
