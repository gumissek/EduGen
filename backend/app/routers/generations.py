"""Generations router."""

from __future__ import annotations

from datetime import datetime, timezone
import json

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.generation import Generation
from app.models.source_file import SourceFile
from app.schemas.generation import GenerationCreate, GenerationResponse, GenerationListResponse
from app.services.generation_service import generate_prototype_task

router = APIRouter(prefix="/generations", tags=["generations"])


@router.post("", response_model=GenerationResponse, status_code=status.HTTP_201_CREATED)
def create_generation(
    body: GenerationCreate,
    background_tasks: BackgroundTasks,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new generation and start AI processing."""
    generation = Generation(
        user_id=current_user.id,
        subject_id=body.subject_id,
        content_type=body.content_type,
        education_level=body.education_level,
        class_level=body.class_level,
        language_level=body.language_level,
        topic=body.topic,
        instructions=body.instructions,
        difficulty=body.difficulty,
        total_questions=body.total_questions,
        open_questions=body.open_questions,
        closed_questions=body.closed_questions,
        variants_count=body.variants_count,
        task_types=json.dumps(body.task_types) if body.task_types else None,
        status="processing",
    )
    db.add(generation)
    db.flush()  # Get the ID

    # Link source files (only those belonging to the user)
    if body.source_file_ids:
        source_files = (
            db.query(SourceFile)
            .filter(
                SourceFile.id.in_(body.source_file_ids),
                SourceFile.user_id == current_user.id,
                SourceFile.deleted_at.is_(None),
            )
            .all()
        )
        generation.source_files = source_files

    db.commit()
    db.refresh(generation)

    # Start background task
    background_tasks.add_task(generate_prototype_task, db, generation.id)

    return GenerationResponse.model_validate(generation)


@router.get("/{generation_id}", response_model=GenerationResponse)
def get_generation(
    generation_id: str,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get generation status and details (used for polling)."""
    generation = db.query(Generation).filter(
        Generation.id == generation_id,
        Generation.user_id == current_user.id,
    ).first()
    if not generation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Generation not found")

    return GenerationResponse.model_validate(generation)


@router.get("", response_model=GenerationListResponse)
def list_generations(
    subject_id: str | None = None,
    status_filter: str | None = None,
    page: int = 1,
    per_page: int = 20,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List generations with optional filters and pagination."""
    query = db.query(Generation).filter(Generation.user_id == current_user.id)

    if subject_id:
        query = query.filter(Generation.subject_id == subject_id)
    if status_filter:
        query = query.filter(Generation.status == status_filter)

    total = query.count()
    generations = (
        query
        .order_by(Generation.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return GenerationListResponse(
        generations=[GenerationResponse.model_validate(g) for g in generations],
        total=total,
    )
