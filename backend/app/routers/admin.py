"""Admin router — superuser-only operations."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.dependencies import get_current_superuser
from app.models.user import User
from app.schemas.admin import (
    AdminUserResponse,
    AdminUserListResponse,
    AdminUserUpdateRequest,
    AdminResetPasswordRequest,
    AdminSimpleMessageResponse,
)
from app.services.auth_service import hash_password

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/me", response_model=AdminSimpleMessageResponse)
def admin_me(current_user: User = Depends(get_current_superuser)):
    """Simple superuser check endpoint used by admin views."""
    return AdminSimpleMessageResponse(detail=f"Superuser verified: {current_user.email}")


@router.get("/users", response_model=AdminUserListResponse)
def list_users(
    page: int = 1,
    per_page: int = 50,
    search: str | None = None,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    """List users (superuser only)."""
    query = db.query(User)

    if search:
        like = f"%{search.strip()}%"
        query = query.filter(
            or_(
                User.email.ilike(like),
                User.first_name.ilike(like),
                User.last_name.ilike(like),
            )
        )

    total = query.count()
    users = (
        query.order_by(User.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return AdminUserListResponse(
        users=[AdminUserResponse.model_validate(user) for user in users],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.put("/users/{user_id}", response_model=AdminUserResponse)
def update_user(
    user_id: str,
    body: AdminUserUpdateRequest,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    """Update selected user fields (superuser only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if body.email is not None:
        existing = db.query(User).filter(User.email == body.email, User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")
        user.email = body.email

    for field in (
        "first_name",
        "last_name",
        "is_active",
        "is_superuser",
        "premium_level",
        "api_quota",
        "default_model",
    ):
        value = getattr(body, field)
        if value is not None:
            setattr(user, field, value)

    user.updated_at = datetime.now(timezone.utc).isoformat()

    db.commit()
    db.refresh(user)
    return AdminUserResponse.model_validate(user)


@router.delete("/users/{user_id}", response_model=AdminSimpleMessageResponse)
def delete_user(
    user_id: str,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    """Delete user permanently (superuser only)."""
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot delete your own account")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    db.delete(user)
    db.commit()
    return AdminSimpleMessageResponse(detail="User deleted")


@router.post("/users/{user_id}/reset-password", response_model=AdminSimpleMessageResponse)
def reset_user_password(
    user_id: str,
    body: AdminResetPasswordRequest,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    """Reset user password by setting a new password (superuser only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    user.password_hash = hash_password(body.new_password)
    user.last_password_change = now_iso
    user.reset_password_token = None
    user.reset_password_token_expiry = None
    user.failed_login_attempts = 0
    user.updated_at = now_iso

    db.commit()

    return AdminSimpleMessageResponse(detail="Password has been reset")
