"""Authentication router."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, Cookie, Header, status
from sqlalchemy.orm import Session as DBSession
from typing import Optional

from app.database import get_db
from app.schemas.auth import LoginRequest, LoginResponse, LogoutResponse
from app.services.auth_service import authenticate_user, create_session, invalidate_session

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
    )


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
