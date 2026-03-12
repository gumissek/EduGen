"""User AI Models router — CRUD for per-user AI model list."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.user_ai_model import UserAIModel
from app.schemas.user_ai_model import (
    UserAIModelCreate,
    UserAIModelResponse,
)

router = APIRouter(prefix="/user-ai-models", tags=["user-ai-models"])


@router.get("", response_model=List[UserAIModelResponse])
def list_user_ai_models(
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all AI models belonging to the current user."""
    models = (
        db.query(UserAIModel)
        .filter(UserAIModel.user_id == current_user.id)
        .order_by(UserAIModel.created_at.asc())
        .all()
    )
    return [UserAIModelResponse.model_validate(m) for m in models]


@router.post("", response_model=UserAIModelResponse, status_code=status.HTTP_201_CREATED)
def create_user_ai_model(
    body: UserAIModelCreate,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a new AI model for the current user.

    Returns 409 if a model with the same provider + model_name already exists for this user.
    """
    model = UserAIModel(
        user_id=current_user.id,
        provider=body.provider,
        model_name=body.model_name,
        description=body.description,
        price_description=body.price_description,
        is_available=True,
        created_at=datetime.now(timezone.utc).isoformat(),
        changed_at=None,
        request_made=0,
    )
    db.add(model)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Model '{body.provider}/{body.model_name}' już istnieje na Twojej liście.",
        )
    db.refresh(model)
    return UserAIModelResponse.model_validate(model)


@router.delete("/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_ai_model(
    model_id: str,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an AI model owned by the current user."""
    model = (
        db.query(UserAIModel)
        .filter(UserAIModel.id == model_id, UserAIModel.user_id == current_user.id)
        .first()
    )
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model nie znaleziony",
        )
    db.delete(model)
    db.commit()
