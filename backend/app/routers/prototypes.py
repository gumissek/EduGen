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
from app.schemas.prototype import PrototypeResponse, PrototypeUpdate, RepromptRequest
from app.services.ai_service import call_openai_reprompt
from app.services.generation_service import _render_content_html, _build_answer_key

router = APIRouter(prefix="/prototypes", tags=["prototypes"])


@router.get("/{generation_id}", response_model=PrototypeResponse)
def get_prototype(
    generation_id: str,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the prototype for a generation."""
    prototype = db.query(Prototype).filter(Prototype.generation_id == generation_id).first()
    if not prototype:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prototype not found")

    return PrototypeResponse.model_validate(prototype)


@router.put("/{generation_id}", response_model=PrototypeResponse)
def update_prototype(
    generation_id: str,
    body: PrototypeUpdate,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Save edited content for a prototype."""
    prototype = db.query(Prototype).filter(Prototype.generation_id == generation_id).first()
    if not prototype:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prototype not found")

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
    prototype = db.query(Prototype).filter(Prototype.generation_id == generation_id).first()
    if not prototype:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prototype not found")

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
    generation = db.query(Generation).filter(Generation.id == generation_id).first()
    if not generation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Generation not found")

    prototype = db.query(Prototype).filter(Prototype.generation_id == generation_id).first()
    if not prototype:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prototype not found")

    # Get API key
    user_settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if not user_settings or not user_settings.openai_api_key_encrypted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OpenAI API key not configured",
        )

    api_key = decrypt_api_key(user_settings.openai_api_key_encrypted)
    model = user_settings.default_model or "gpt-5-mini"

    # Use edited content if available, otherwise original
    current_content = prototype.edited_content or prototype.original_content

    try:
        result = call_openai_reprompt(
            db, generation, current_content, body.prompt, api_key, model,
            raw_questions_json=prototype.raw_questions_json,
        )

        # Update prototype
        new_content = _render_content_html(result)
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
