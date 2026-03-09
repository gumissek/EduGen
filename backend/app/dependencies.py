"""FastAPI dependencies: get_db, get_current_user."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status, Cookie, Header
from sqlalchemy.orm import Session as DBSession
from typing import Optional

from app.database import get_db
from app.models.session import Session
from app.models.user import User
from app.config import settings


def get_current_user(
    db: DBSession = Depends(get_db),
    session_token: Optional[str] = Cookie(None, alias="session_token"),
    edugen_auth: Optional[str] = Cookie(None, alias="edugen-auth"),
    authorization: Optional[str] = Header(None),
) -> User:
    """Extract and validate the session token, return the authenticated user.

    Token lookup priority:
    1. ``session_token`` HttpOnly cookie (set by backend on login)
    2. ``edugen-auth`` cookie (set by frontend, contains the JWT)
    3. ``Authorization: Bearer`` header

    Implements rolling expiration: every authenticated request extends
    ``expires_at`` by SESSION_TIMEOUT_MINUTES.
    """
    token: str | None = None

    # Priority: HttpOnly session cookie → frontend auth cookie → Bearer header
    if session_token:
        token = session_token
    elif edugen_auth:
        token = edugen_auth
    elif authorization and authorization.startswith("Bearer "):
        token = authorization[7:]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    session = db.query(Session).filter(Session.token == token).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session",
        )

    now = datetime.now(timezone.utc)
    expires_at = datetime.fromisoformat(session.expires_at)
    # Ensure timezone-aware comparison
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired",
        )

    # Rolling expiration
    new_expires = now + timedelta(minutes=settings.SESSION_TIMEOUT_MINUTES)
    session.expires_at = new_expires.isoformat()
    session.last_activity_at = now.isoformat()
    db.commit()

    user = db.query(User).filter(User.id == session.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user
