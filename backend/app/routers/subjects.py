"""Subjects router."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.subject import Subject
from app.schemas.subject import SubjectCreate, SubjectResponse

router = APIRouter(prefix="/subjects", tags=["subjects"])


@router.get("", response_model=list[SubjectResponse])
def list_subjects(
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all subjects (predefined + custom)."""
    subjects = db.query(Subject).order_by(Subject.is_custom, Subject.name).all()
    return [SubjectResponse.model_validate(s) for s in subjects]


@router.post("", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
def create_subject(
    body: SubjectCreate,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new custom subject."""
    # Check for duplicate name
    existing = db.query(Subject).filter(Subject.name == body.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Subject with this name already exists",
        )

    subject = Subject(name=body.name, is_custom=1)
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return SubjectResponse.model_validate(subject)


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subject(
    subject_id: str,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a custom subject (only custom ones can be deleted)."""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")

    if not subject.is_custom:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete predefined subjects",
        )

    db.delete(subject)
    db.commit()
