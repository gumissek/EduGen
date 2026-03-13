"""Authentication router."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.secret_key import SecretKey
from app.models.document import Document
from app.models.generation import Generation
from app.models.ai_request import AIRequest
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    LoginResponse,
    UserResponse,
    LogoutResponse,
    UpdateProfileRequest,
    ChangePasswordRequest,
    UserStatsResponse,
    RequestEmailChangeRequest,
    RequestEmailChangeResponse,
    RequestPasswordChangeCodeRequest,
    RequestPasswordChangeCodeResponse,
    ConfirmPasswordChangeRequest,
    ConfirmPasswordChangeResponse,
    ConfirmEmailChangeResponse,
)
from app.services.auth_service import (
    authenticate_user,
    register_user,
    create_access_token,
    verify_password,
    hash_password,
)
from app.services.verification_service import (
    create_email_change_token,
    confirm_email_change,
    create_password_change_code,
    confirm_password_change,
)
from app.services.email_service import (
    send_email_change_verification,
    send_password_change_code,
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


@router.put("/me", response_model=UserResponse)
def update_me(
    body: UpdateProfileRequest,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update the current user's profile data."""
    from datetime import datetime, timezone

    if body.email is not None and body.email != current_user.email:
        existing = db.query(User).filter(User.email == body.email, User.id != current_user.id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Podany adres e-mail jest już zajęty",
            )
        current_user.email = body.email

    if body.first_name is not None:
        current_user.first_name = body.first_name
    if body.last_name is not None:
        current_user.last_name = body.last_name

    current_user.updated_at = datetime.now(timezone.utc).isoformat()
    db.commit()
    db.refresh(current_user)

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


@router.post("/me/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    body: ChangePasswordRequest,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Change the current user's password."""
    from datetime import datetime, timezone

    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Obecne hasło jest nieprawidłowe",
        )

    current_user.password_hash = hash_password(body.new_password)
    current_user.last_password_change = datetime.now(timezone.utc).isoformat()
    current_user.updated_at = datetime.now(timezone.utc).isoformat()
    db.commit()


@router.get("/me/stats", response_model=UserStatsResponse)
def get_my_stats(
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get usage statistics for the current user."""
    documents_count = db.query(Document).filter(
        Document.user_id == current_user.id,
        Document.deleted_at.is_(None),
    ).count()

    generations_count = db.query(Generation).filter(
        Generation.user_id == current_user.id,
    ).count()

    ai_requests_count = db.query(AIRequest).filter(
        AIRequest.user_id == current_user.id,
    ).count()

    failed_generations_count = db.query(AIRequest).filter(
        AIRequest.user_id == current_user.id,
        AIRequest.response_payload.is_(None),
    ).count()

    return UserStatsResponse(
        documents_count=documents_count,
        ai_requests_count=ai_requests_count,
        generations_count=generations_count,
        failed_generations_count=failed_generations_count,
    )


# ── Email change with verification ──


@router.post("/me/request-email-change", response_model=RequestEmailChangeResponse)
def request_email_change(
    body: RequestEmailChangeRequest,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Request an email change. Sends a verification link to the new email (24h expiry)."""
    # Verify current password
    if not verify_password(body.password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nieprawidłowe hasło",
        )

    # Check that new email is not the same
    if body.new_email == current_user.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nowy adres e-mail jest taki sam jak obecny",
        )

    # Check that new email is not already taken
    existing = db.query(User).filter(User.email == body.new_email, User.id != current_user.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Podany adres e-mail jest już zajęty",
        )

    # Create verification token
    vt = create_email_change_token(db, current_user, body.new_email)

    # Build verification link (frontend route)
    # In local mode the link is logged but not actually emailed
    verification_link = f"/verify-email-change?token={vt.token}"

    email_sent = send_email_change_verification(body.new_email, verification_link)

    return RequestEmailChangeResponse(
        email_sent=email_sent,
        # Expose the link only when email was NOT sent (local/dev mode) so the user can still use it
        verification_link=verification_link if not email_sent else None,
    )


@router.get("/verify-email-change", response_model=ConfirmEmailChangeResponse)
def verify_email_change(
    token: str,
    db: DBSession = Depends(get_db),
):
    """Confirm an email change via verification token (from email link)."""
    try:
        confirm_email_change(db, token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return ConfirmEmailChangeResponse()


# ── Password change with verification code ──


@router.post("/me/request-password-change", response_model=RequestPasswordChangeCodeResponse)
def request_password_change(
    body: RequestPasswordChangeCodeRequest,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Request a password change. Sends a 6-digit verification code to the current email (5 min expiry)."""
    # Verify current password
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Obecne hasło jest nieprawidłowe",
        )

    # Hash the new password and store it in the token payload
    new_password_hash = hash_password(body.new_password)
    vt = create_password_change_code(db, current_user, new_password_hash)

    # Send the code via email (stubbed in local mode)
    send_password_change_code(current_user.email, vt.token)

    return RequestPasswordChangeCodeResponse()


@router.post("/me/confirm-password-change", response_model=ConfirmPasswordChangeResponse)
def confirm_password_change_endpoint(
    body: ConfirmPasswordChangeRequest,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Confirm a password change with the 6-digit verification code."""
    try:
        confirm_password_change(db, current_user.id, body.code)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return ConfirmPasswordChangeResponse()
