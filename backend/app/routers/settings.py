"""Settings router."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from openai import OpenAI
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.dependencies import get_current_user
from app.encryption import encrypt_api_key, decrypt_api_key
from app.models.user import User
from app.models.settings import UserSettings
from app.schemas.settings import (
    SettingsResponse,
    SettingsUpdate,
    ValidateKeyResponse,
)

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=SettingsResponse)
def get_settings(
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current settings (never returns the API key itself)."""
    user_settings = (
        db.query(UserSettings)
        .filter(UserSettings.user_id == current_user.id)
        .first()
    )
    if not user_settings:
        return SettingsResponse(default_model="gpt-5-mini", has_api_key=False)

    return SettingsResponse(
        default_model=user_settings.default_model,
        has_api_key=bool(user_settings.openai_api_key_encrypted),
    )


@router.put("", response_model=SettingsResponse)
def update_settings(
    body: SettingsUpdate,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update settings (API key and/or default model)."""
    user_settings = (
        db.query(UserSettings)
        .filter(UserSettings.user_id == current_user.id)
        .first()
    )

    if not user_settings:
        user_settings = UserSettings(user_id=current_user.id)
        db.add(user_settings)

    if body.openai_api_key is not None:
        user_settings.openai_api_key_encrypted = encrypt_api_key(body.openai_api_key)

    if body.default_model is not None:
        user_settings.default_model = body.default_model

    user_settings.updated_at = datetime.now(timezone.utc).isoformat()
    db.commit()
    db.refresh(user_settings)

    return SettingsResponse(
        default_model=user_settings.default_model,
        has_api_key=bool(user_settings.openai_api_key_encrypted),
    )


@router.post("/validate-key", response_model=ValidateKeyResponse)
def validate_key(
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Validate the stored OpenAI API key by listing models."""
    user_settings = (
        db.query(UserSettings)
        .filter(UserSettings.user_id == current_user.id)
        .first()
    )
    if not user_settings or not user_settings.openai_api_key_encrypted:
        return ValidateKeyResponse(valid=False, error="Brak skonfigurowanego klucza API")

    try:
        api_key = decrypt_api_key(user_settings.openai_api_key_encrypted)
        client = OpenAI(api_key=api_key)
        models_response = client.models.list()
        model_ids = sorted([m.id for m in models_response.data if "gpt" in m.id.lower()])
        return ValidateKeyResponse(valid=True, models=model_ids)
    except Exception as e:
        return ValidateKeyResponse(valid=False, error=str(e))
