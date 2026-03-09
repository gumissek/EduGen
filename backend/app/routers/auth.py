"""Authentication router."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, Cookie, Header, status
from sqlalchemy.orm import Session as DBSession
from typing import Optional

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    LogoutResponse,
    ChangePasswordRequest,
    ChangePasswordResponse,
)
from app.services.auth_service import (
    authenticate_user,
    create_session,
    invalidate_session,
    hash_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(
    body: LoginRequest,
    response: Response,
    db: DBSession = Depends(get_db),
):
    """Authenticate with password and create a session."""
    user = authenticate_user(db, body.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password",
        )

    session = create_session(db, user)

    # Set HttpOnly cookie
    response.set_cookie(
        key="session_token",
        value=session.token,
        httponly=True,
        samesite="lax",
        secure=False,  # localhost
        max_age=900,  # 15 min
    )

    return LoginResponse(
        token=session.token,
        expires_at=session.expires_at,
        must_change_password=user.must_change_password,
    )


@router.post("/change-password", response_model=ChangePasswordResponse)
def change_password(
    body: ChangePasswordRequest,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Change the current user's password. Clears the must_change_password flag."""
    current_user.password_hash = hash_password(body.new_password)
    current_user.must_change_password = False
    current_user.updated_at = datetime.now(timezone.utc).isoformat()
    db.commit()
    return ChangePasswordResponse()


@router.post("/logout", response_model=LogoutResponse)
def logout(
    response: Response,
    db: DBSession = Depends(get_db),
    session_token: Optional[str] = Cookie(None, alias="session_token"),
    authorization: Optional[str] = Header(None),
):
    """Invalidate the current session."""
    token: str | None = None
    if session_token:
        token = session_token
    elif authorization and authorization.startswith("Bearer "):
        token = authorization[7:]

    if token:
        invalidate_session(db, token)

    response.delete_cookie("session_token")
    return LogoutResponse()
