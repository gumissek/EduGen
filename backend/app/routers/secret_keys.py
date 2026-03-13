"""Secret keys router — CRUD for user API keys."""

from __future__ import annotations

import requests as http_requests
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.dependencies import get_current_user
from app.encryption import encrypt_api_key, decrypt_api_key
from app.models.user import User
from app.models.secret_key import SecretKey
from app.schemas.secret_key import (
    SecretKeyCreate,
    SecretKeyResponse,
    SecretKeyValidateResponse,
)

router = APIRouter(prefix="/secret-keys", tags=["secret-keys"])


@router.get("", response_model=List[SecretKeyResponse])
def list_secret_keys(
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all API keys belonging to the current user (never returns the actual key)."""
    keys = (
        db.query(SecretKey)
        .filter(SecretKey.user_id == current_user.id)
        .order_by(SecretKey.created_at.desc())
        .all()
    )
    return [SecretKeyResponse.model_validate(k) for k in keys]


@router.post("", response_model=SecretKeyResponse, status_code=status.HTTP_201_CREATED)
def create_secret_key(
    body: SecretKeyCreate,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a new API key (encrypted at rest)."""
    encrypted = encrypt_api_key(body.secret_key)

    key = SecretKey(
        user_id=current_user.id,
        platform=body.platform,
        key_name=body.key_name,
        secret_key_hash=encrypted,
        is_active=True,
    )
    db.add(key)
    db.commit()
    db.refresh(key)

    return SecretKeyResponse.model_validate(key)


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_secret_key(
    key_id: str,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an API key."""
    key = (
        db.query(SecretKey)
        .filter(SecretKey.id == key_id, SecretKey.user_id == current_user.id)
        .first()
    )
    if not key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Klucz nie znaleziony")

    db.delete(key)
    db.commit()


@router.post("/{key_id}/validate", response_model=SecretKeyValidateResponse)
def validate_secret_key(
    key_id: str,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Validate an API key by making a lightweight call to OpenRouter."""
    key = (
        db.query(SecretKey)
        .filter(SecretKey.id == key_id, SecretKey.user_id == current_user.id)
        .first()
    )
    if not key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Klucz nie znaleziony")

    try:
        api_key = decrypt_api_key(key.secret_key_hash)

        # Quick validation: list models on OpenRouter
        resp = http_requests.get(
            "https://openrouter.ai/api/v1/models",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=15,
        )

        if resp.status_code == 200:
            # Update last_used_at
            key.last_used_at = datetime.now(timezone.utc).isoformat()
            db.commit()
            return SecretKeyValidateResponse(valid=True)
        else:
            error_detail = resp.json().get("error", {}).get("message", resp.text[:200])
            return SecretKeyValidateResponse(valid=False, error=error_detail)

    except Exception as e:
        return SecretKeyValidateResponse(valid=False, error=str(e))
