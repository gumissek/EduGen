"""Task types router."""

import csv
from pathlib import Path
from typing import List

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.config import settings

router = APIRouter(prefix="/task-types", tags=["task-types"])

# Determine path based on DATA_DIR so it works both locally and in Docker
TASK_TYPES_FILE = Path(settings.DATA_DIR).parent / "common_filles" / "task_types.csv"


class TaskTypeCreate(BaseModel):
    name: str


@router.get("", response_model=List[str])
def get_task_types():
    """Get all custom task types from CSV."""
    if not TASK_TYPES_FILE.exists():
        return []
    try:
        with open(TASK_TYPES_FILE, mode="r", encoding="utf-8") as f:
            reader = csv.reader(f)
            return [row[0].strip() for row in reader if row and row[0].strip()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading task types: {str(e)}")


@router.post("", response_model=str, status_code=status.HTTP_201_CREATED)
def create_task_type(body: TaskTypeCreate):
    """Add a new task type to the CSV."""
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Nazwa typu zadania nie może być pusta")

    TASK_TYPES_FILE.parent.mkdir(parents=True, exist_ok=True)

    existing = []
    if TASK_TYPES_FILE.exists():
        with open(TASK_TYPES_FILE, mode="r", encoding="utf-8") as f:
            reader = csv.reader(f)
            existing = [row[0].strip() for row in reader if row and row[0].strip()]

    if name in existing:
        return name

    try:
        with open(TASK_TYPES_FILE, mode="a", encoding="utf-8", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([name])
        return name
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error writing task type: {str(e)}")
