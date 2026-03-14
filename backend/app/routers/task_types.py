"""Task types router."""

import csv
from pathlib import Path
from typing import List

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

router = APIRouter(prefix="/task-types", tags=["task-types"])

# Always use backend/common_filles/task_types.csv.
# This keeps task types independent from process cwd and root-level common_filles.
_BACKEND_ROOT = Path(__file__).resolve().parents[2]
TASK_TYPES_FILE = _BACKEND_ROOT / "common_filles" / "task_types.csv"


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
