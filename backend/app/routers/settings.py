"""Settings router — manages user AI model preference."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.secret_key import SecretKey
from app.schemas.settings import (
    SettingsResponse,
    SettingsUpdate,
)

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=SettingsResponse)
def get_settings(
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current settings (default model and API key availability)."""
    has_api_key = (
        db.query(SecretKey)
        .filter(SecretKey.user_id == current_user.id, SecretKey.is_active == True)
        .first()
    ) is not None

    return SettingsResponse(
        default_model=current_user.default_model or "openai/gpt-5-mini",
        has_api_key=has_api_key,
    )


@router.put("", response_model=SettingsResponse)
def update_settings(
    body: SettingsUpdate,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update AI model preference."""
    if body.default_model is not None:
        current_user.default_model = body.default_model

    current_user.updated_at = datetime.now(timezone.utc).isoformat()
    db.commit()
    db.refresh(current_user)

    has_api_key = (
        db.query(SecretKey)
        .filter(SecretKey.user_id == current_user.id, SecretKey.is_active == True)
        .first()
    ) is not None

    return SettingsResponse(
        default_model=current_user.default_model or "openai/gpt-5-mini",
        has_api_key=has_api_key,
    )
