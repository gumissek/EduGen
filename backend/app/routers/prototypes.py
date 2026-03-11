"""Prototypes router — view, edit, reprompt."""

from __future__ import annotations

import json
import logging
import traceback
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

logger = logging.getLogger(__name__)

from app.database import get_db
from app.dependencies import get_current_user
from app.encryption import decrypt_api_key
from app.models.user import User
from app.models.generation import Generation
from app.models.prototype import Prototype
from app.models.settings import UserSettings
from app.models.secret_key import SecretKey
from app.schemas.prototype import PrototypeResponse, PrototypeUpdate, RepromptRequest
from app.services.ai_service import call_openai_reprompt, call_openai_reprompt_free_form, TYPES_WITHOUT_QUESTIONS
from app.services.generation_service import _render_content_html, _build_answer_key

router = APIRouter(prefix="/prototypes", tags=["prototypes"])


def _get_user_generation(db: DBSession, generation_id: str, user_id: str) -> Generation:
    """Get a generation, verifying it belongs to the user."""
    generation = db.query(Generation).filter(
        Generation.id == generation_id,
        Generation.user_id == user_id,
    ).first()
    if not generation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Generation not found")
    return generation


def _get_user_prototype(db: DBSession, generation_id: str, user_id: str) -> Prototype:
    """Get a prototype, verifying the parent generation belongs to the user."""
    prototype = (
        db.query(Prototype)
        .join(Generation, Prototype.generation_id == Generation.id)
        .filter(
            Prototype.generation_id == generation_id,
            Generation.user_id == user_id,
        )
        .first()
    )
    if not prototype:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prototype not found")
    return prototype


@router.get("/{generation_id}", response_model=PrototypeResponse)
def get_prototype(
    generation_id: str,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the prototype for a generation."""
    prototype = _get_user_prototype(db, generation_id, current_user.id)
    return PrototypeResponse.model_validate(prototype)


@router.put("/{generation_id}", response_model=PrototypeResponse)
def update_prototype(
    generation_id: str,
    body: PrototypeUpdate,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Save edited content for a prototype."""
    prototype = _get_user_prototype(db, generation_id, current_user.id)

    prototype.edited_content = body.edited_content
    prototype.updated_at = datetime.now(timezone.utc).isoformat()
    db.commit()
    db.refresh(prototype)

    return PrototypeResponse.model_validate(prototype)


@router.post("/{generation_id}/restore", response_model=PrototypeResponse)
def restore_original(
    generation_id: str,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Restore prototype to original content (discard edits)."""
    prototype = _get_user_prototype(db, generation_id, current_user.id)

    prototype.edited_content = None
    prototype.updated_at = datetime.now(timezone.utc).isoformat()
    db.commit()
    db.refresh(prototype)

    return PrototypeResponse.model_validate(prototype)


@router.post("/{generation_id}/reprompt", response_model=PrototypeResponse)
def reprompt(
    generation_id: str,
    body: RepromptRequest,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reprompt AI to modify the prototype based on user feedback."""
    generation = _get_user_generation(db, generation_id, current_user.id)
    prototype = _get_user_prototype(db, generation_id, current_user.id)

    # Get API key — prefer secret_keys, fall back to legacy settings
    api_key = None
    secret_key = (
        db.query(SecretKey)
        .filter(SecretKey.user_id == current_user.id, SecretKey.is_active == True)
        .first()
    )
    if secret_key:
        api_key = decrypt_api_key(secret_key.secret_key_hash)
        from datetime import datetime, timezone
        secret_key.last_used_at = datetime.now(timezone.utc).isoformat()

    if not api_key:
        user_settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
        if user_settings and user_settings.openai_api_key_encrypted:
            api_key = decrypt_api_key(user_settings.openai_api_key_encrypted)

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="API key not configured — add a key in Settings",
        )

    user_settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    model = (user_settings.default_model if user_settings else None) or "openai/gpt-5-mini"

    # Use edited content if available, otherwise original
    current_content = prototype.edited_content or prototype.original_content

    try:
        if generation.content_type in TYPES_WITHOUT_QUESTIONS:
            # Free-form types (worksheet / lesson_materials) — update HTML directly
            new_html = call_openai_reprompt_free_form(
                db, generation, current_content, body.prompt, api_key, model
            )
            prototype.edited_content = new_html
            prototype.updated_at = datetime.now(timezone.utc).isoformat()
            db.commit()
            db.refresh(prototype)
            return PrototypeResponse.model_validate(prototype)

        result = call_openai_reprompt(
            db, generation, current_content, body.prompt, api_key, model,
            raw_questions_json=prototype.raw_questions_json,
        )

        # Update prototype
        new_content = _render_content_html(result, generation.content_type)
        new_answer_key = _build_answer_key(result)

        prototype.edited_content = new_content
        prototype.answer_key = new_answer_key
        prototype.raw_questions_json = json.dumps(result, ensure_ascii=False)
        prototype.updated_at = datetime.now(timezone.utc).isoformat()
        db.commit()
        db.refresh(prototype)

        return PrototypeResponse.model_validate(prototype)

    except Exception as e:
        logger.error(
            "Reprompt error for generation %s [%s]: %s\n%s",
            generation_id,
            type(e).__name__,
            e,
            traceback.format_exc(),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Reprompt failed ({type(e).__name__}): {str(e)}",
        )
