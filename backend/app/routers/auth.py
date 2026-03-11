"""Authentication router."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.secret_key import SecretKey
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    LoginResponse,
    UserResponse,
    LogoutResponse,
)
from app.services.auth_service import (
    authenticate_user,
    register_user,
    create_access_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(
    body: RegisterRequest,
    db: DBSession = Depends(get_db),
):
    """Register a new user account."""
    # Check if email is already taken
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Użytkownik z tym adresem e-mail już istnieje",
        )

    user = register_user(
        db,
        email=body.email,
        password=body.password,
        first_name=body.first_name,
        last_name=body.last_name,
    )

    return UserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
        created_at=user.created_at,
    )


@router.post("/login", response_model=LoginResponse)
def login(
    body: LoginRequest,
    response: Response,
    db: DBSession = Depends(get_db),
):
    """Authenticate with email + password and return a JWT token."""
    user = authenticate_user(db, body.email, body.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy adres e-mail lub hasło",
        )

    access_token = create_access_token(user.id, user.email)

    # Set cookie for the frontend
    response.set_cookie(
        key="edugen-auth",
        value=access_token,
        httponly=False,  # Needs to be readable by Next.js middleware
        samesite="lax",
        secure=False,  # Set to True in production with HTTPS
        max_age=60 * 60 * 24 * 7,  # 7 days (JWT has its own expiry)
    )

    return LoginResponse(access_token=access_token)


@router.get("/me", response_model=UserResponse)
def get_me(
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the currently authenticated user's profile."""
    has_keys = db.query(SecretKey).filter(SecretKey.user_id == current_user.id).count() > 0
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        is_active=current_user.is_active,
        is_superuser=current_user.is_superuser,
        created_at=current_user.created_at,
        api_quota=current_user.api_quota,
        api_quota_reset=current_user.api_quota_reset,
        has_secret_keys=has_keys,
    )


@router.post("/logout", response_model=LogoutResponse)
def logout(
    response: Response,
):
    """Clear the auth cookie (JWT is stateless, no server-side invalidation)."""
    response.delete_cookie("edugen-auth")
    return LogoutResponse()
