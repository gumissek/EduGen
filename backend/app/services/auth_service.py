"""Authentication service."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

import bcrypt
from sqlalchemy.orm import Session as DBSession

from app.config import settings
from app.models.user import User
from app.models.session import Session


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against a bcrypt hash."""
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())


def hash_password(plain_password: str) -> str:
    """Hash a plain-text password with bcrypt."""
    return bcrypt.hashpw(plain_password.encode(), bcrypt.gensalt()).decode()


def authenticate_user(db: DBSession, password: str) -> User | None:
    """Authenticate user by password. Returns the user or None."""
    user = db.query(User).first()
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def create_session(db: DBSession, user: User) -> Session:
    """Create a new session for the authenticated user."""
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=settings.SESSION_TIMEOUT_MINUTES)

    session = Session(
        user_id=user.id,
        token=str(uuid4()),
        expires_at=expires_at.isoformat(),
        last_activity_at=now.isoformat(),
    )
    db.add(session)

    # Update last_login_at
    user.last_login_at = now.isoformat()
    db.commit()
    db.refresh(session)
    return session


def invalidate_session(db: DBSession, token: str) -> bool:
    """Invalidate (delete) a session by token."""
    session = db.query(Session).filter(Session.token == token).first()
    if session:
        db.delete(session)
        db.commit()
        return True
    return False
