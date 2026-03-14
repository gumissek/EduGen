"""Prototypes router — view, edit, reprompt."""

from __future__ import annotations

import asyncio
import json
import logging
import traceback
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_
from sqlalchemy import insert, select
from sqlalchemy.orm import Session as DBSession

logger = logging.getLogger(__name__)

from app.database import get_db
from app.dependencies import get_current_user
from app.encryption import decrypt_api_key
from app.models.user import User
from app.models.generation import Generation
from app.models.prototype import Prototype
from app.models.document import Document
from app.models.subject import Subject
from app.models.secret_key import SecretKey
from app.models.generation_source_file import generation_source_files
from app.schemas.prototype import (
    PrototypeResponse,
    PrototypeUpdate,
    RepromptRequest,
    PrototypeListItemResponse,
    PrototypeListResponse,
)
from app.services.ai_service import call_openrouter_reprompt, call_openrouter_reprompt_free_form, TYPES_WITHOUT_QUESTIONS
from app.services.generation_service import render_content_html, build_answer_key

router = APIRouter(prefix="/prototypes", tags=["prototypes"])


def _append_copy_suffix(value: str) -> str:
    text = (value or "").strip()
    if not text:
        return "copy"
    return f"{text} copy"


@router.get("", response_model=PrototypeListResponse)
def list_prototypes(
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List editable prototype drafts (prototypes without active finalized documents)."""
    rows = (
        db.query(Prototype, Generation, Subject)
        .join(Generation, Prototype.generation_id == Generation.id)
        .join(Subject, Subject.id == Generation.subject_id)
        .outerjoin(
            Document,
            and_(
                Document.generation_id == Generation.id,
                Document.deleted_at.is_(None),
            ),
        )
        .filter(
            Generation.user_id == current_user.id,
            Prototype.user_id == current_user.id,
            Document.id.is_(None),
        )
        .order_by(Prototype.updated_at.desc())
        .all()
    )

    prototypes = [
        PrototypeListItemResponse(
            id=prototype.id,
            generation_id=generation.id,
            subject_id=(generation.subject_id or ""),
            subject_name=(subject.name or ""),
            title=(generation.topic or "Wersja robocza"),
            content_type=(generation.content_type or ""),
            education_level=(generation.education_level or ""),
            class_level=str(generation.class_level).strip() if generation.class_level else "",
            created_at=prototype.created_at,
            updated_at=prototype.updated_at,
        )
        for prototype, generation, subject in rows
    ]

    return PrototypeListResponse(prototypes=prototypes, total=len(prototypes))


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
    if body.comments_json is not None:
        prototype.comments_json = body.comments_json
    prototype.updated_at = datetime.now(timezone.utc).isoformat()
    db.commit()
    db.refresh(prototype)

    return PrototypeResponse.model_validate(prototype)


@router.delete("/{generation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_prototype_draft(
    generation_id: str,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a draft generation+prototype if it is not finalized as an active document."""
    generation = _get_user_generation(db, generation_id, current_user.id)

    has_active_document = db.query(Document).filter(
        Document.generation_id == generation.id,
        Document.deleted_at.is_(None),
    ).first()
    if has_active_document:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete draft for finalized material",
        )

    db.delete(generation)
    db.commit()


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


_REPROMPT_TIMEOUT_SECONDS = 90  # Hard cap for the AI call


@router.post("/{generation_id}/reprompt", response_model=PrototypeResponse)
async def reprompt(
    generation_id: str,
    body: RepromptRequest,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reprompt AI to modify the prototype based on user feedback."""
    generation = _get_user_generation(db, generation_id, current_user.id)
    prototype = _get_user_prototype(db, generation_id, current_user.id)

    # Get API key from secret_keys
    api_key = None
    secret_key = (
        db.query(SecretKey)
        .filter(SecretKey.user_id == current_user.id, SecretKey.is_active == True)
        .first()
    )
    if secret_key:
        api_key = decrypt_api_key(secret_key.secret_key_hash)
        secret_key.last_used_at = datetime.now(timezone.utc).isoformat()

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="API key not configured — add a key in Settings",
        )

    model = current_user.default_model or "openai/gpt-4o-mini"

    # Use edited content if available, otherwise original
    current_content = prototype.edited_content or prototype.original_content

    try:
        if generation.content_type in TYPES_WITHOUT_QUESTIONS:
            # Free-form types (worksheet / lesson_materials) — run in thread executor
            # to avoid blocking the event loop, with a hard timeout.
            new_html = await asyncio.wait_for(
                asyncio.to_thread(
                    call_openrouter_reprompt_free_form,
                    db, generation, current_content, body.prompt, api_key, model,
                ),
                timeout=_REPROMPT_TIMEOUT_SECONDS,
            )
            prototype.edited_content = new_html
            prototype.updated_at = datetime.now(timezone.utc).isoformat()
            db.commit()
            db.refresh(prototype)
            return PrototypeResponse.model_validate(prototype)

        result = await asyncio.wait_for(
            asyncio.to_thread(
                call_openrouter_reprompt,
                db, generation, current_content, body.prompt, api_key, model,
                raw_questions_json=prototype.raw_questions_json,
            ),
            timeout=_REPROMPT_TIMEOUT_SECONDS,
        )

        # Update prototype
        new_content = render_content_html(result, generation.content_type)
        new_answer_key = build_answer_key(result)

        prototype.edited_content = new_content
        prototype.answer_key = new_answer_key
        prototype.raw_questions_json = json.dumps(result, ensure_ascii=False)
        prototype.updated_at = datetime.now(timezone.utc).isoformat()
        db.commit()
        db.refresh(prototype)

        return PrototypeResponse.model_validate(prototype)

    except asyncio.TimeoutError:
        logger.error("Reprompt timed out (>%ds) for generation %s", _REPROMPT_TIMEOUT_SECONDS, generation_id)
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=(
                f"Zapytanie do AI przekroczyło limit czasu ({_REPROMPT_TIMEOUT_SECONDS}s). "
                "Spróbuj ponownie lub wybierz szybszy model AI w Ustawieniach."
            ),
        )
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


@router.post("/{generation_id}/copy", response_model=PrototypeListItemResponse, status_code=status.HTTP_201_CREATED)
def copy_prototype_draft(
    generation_id: str,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Duplicate a draft (generation + prototype + generation_source_files)."""
    generation = _get_user_generation(db, generation_id, current_user.id)
    prototype = _get_user_prototype(db, generation_id, current_user.id)

    has_active_document = db.query(Document).filter(
        Document.generation_id == generation.id,
        Document.deleted_at.is_(None),
    ).first()
    if has_active_document:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot copy finalized material as draft",
        )

    now_iso = datetime.now(timezone.utc).isoformat()

    copied_generation = Generation(
        user_id=generation.user_id,
        subject_id=generation.subject_id,
        content_type=generation.content_type,
        education_level=generation.education_level,
        class_level=generation.class_level,
        language_level=generation.language_level,
        topic=_append_copy_suffix(generation.topic),
        instructions=generation.instructions,
        difficulty=generation.difficulty,
        total_questions=generation.total_questions,
        open_questions=generation.open_questions,
        closed_questions=generation.closed_questions,
        variants_count=generation.variants_count,
        task_types=generation.task_types,
        created_at=now_iso,
        updated_at=now_iso,
        status="ready",
        error_message=None,
    )
    db.add(copied_generation)
    db.flush()

    source_rows = db.execute(
        select(generation_source_files.c.source_file_id).where(
            generation_source_files.c.generation_id == generation.id
        )
    ).all()
    if source_rows:
        db.execute(
            insert(generation_source_files),
            [
                {
                    "generation_id": copied_generation.id,
                    "source_file_id": row.source_file_id,
                }
                for row in source_rows
            ],
        )

    copied_prototype = Prototype(
        user_id=prototype.user_id,
        generation_id=copied_generation.id,
        original_content=prototype.original_content,
        edited_content=prototype.edited_content,
        answer_key=prototype.answer_key,
        raw_questions_json=prototype.raw_questions_json,
        comments_json=prototype.comments_json,
        created_at=now_iso,
        updated_at=now_iso,
    )
    db.add(copied_prototype)
    db.commit()

    subject = db.query(Subject).filter(Subject.id == copied_generation.subject_id).first()

    return PrototypeListItemResponse(
        id=copied_prototype.id,
        generation_id=copied_generation.id,
        subject_id=(copied_generation.subject_id or ""),
        subject_name=(subject.name if subject else ""),
        title=(copied_generation.topic or "Wersja robocza"),
        content_type=(copied_generation.content_type or ""),
        education_level=(copied_generation.education_level or ""),
        class_level=str(copied_generation.class_level).strip() if copied_generation.class_level else "",
        created_at=copied_prototype.created_at,
        updated_at=copied_prototype.updated_at,
    )
