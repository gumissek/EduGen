"""FastAPI dependencies: get_db, get_current_user (JWT-based)."""

from __future__ import annotations

from fastapi import Depends, HTTPException, status, Cookie, Header
from sqlalchemy.orm import Session as DBSession
from typing import Optional

from app.database import get_db
from app.models.user import User
from app.services.auth_service import verify_access_token


def get_current_user(
    db: DBSession = Depends(get_db),
    edugen_auth: Optional[str] = Cookie(None, alias="edugen-auth"),
    authorization: Optional[str] = Header(None),
) -> User:
    """Extract and validate the JWT token, return the authenticated user.

    Token lookup priority:
    1. ``edugen-auth`` cookie (set by frontend, contains the JWT)
    2. ``Authorization: Bearer`` header
    """
    token: str | None = None

    # Priority: auth cookie → Bearer header
    if edugen_auth:
        token = edugen_auth
    elif authorization and authorization.startswith("Bearer "):
        token = authorization[7:]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify JWT
    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )

    return user


def get_current_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    """Require the current user to be a superuser."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superuser access required",
        )
    return current_user
