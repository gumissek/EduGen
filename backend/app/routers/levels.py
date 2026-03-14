"""Router for managing education levels and class levels stored in CSV files."""

from __future__ import annotations

import csv
import shutil
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.config import settings
from app.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/levels", tags=["levels"])

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
# In Docker: /app/common_filles (mounted read-only)
# Locally: ../../common_filles relative to backend/
_THIS_FILE = Path(__file__).resolve()
# Try Docker path first, then local dev path
_DOCKER_COMMON = Path("/app/common_filles")
_LOCAL_COMMON = _THIS_FILE.parent.parent.parent.parent / "common_filles"
COMMON_DIR = _DOCKER_COMMON if _DOCKER_COMMON.exists() else _LOCAL_COMMON
DATA_DIR = Path(settings.DATA_DIR)

EDU_CSV_FILENAME = "education_levels.csv"
CLASS_CSV_FILENAME = "class_levels.csv"


def _edu_csv_path() -> Path:
    return DATA_DIR / EDU_CSV_FILENAME


def _class_csv_path() -> Path:
    return DATA_DIR / CLASS_CSV_FILENAME


def _seed_csv(filename: str) -> None:
    """Copy default CSV from common_filles to data dir if not present."""
    dest = DATA_DIR / filename
    if dest.exists():
        return
    src = COMMON_DIR / filename
    if src.exists():
        shutil.copy2(src, dest)
    else:
        # Create empty file with headers
        if filename == EDU_CSV_FILENAME:
            dest.write_text("value,label,class_range_start,class_range_end\n", encoding="utf-8")
        else:
            dest.write_text("value,label,education_level\n", encoding="utf-8")


def _ensure_csvs() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    _seed_csv(EDU_CSV_FILENAME)
    _seed_csv(CLASS_CSV_FILENAME)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class EducationLevelItem(BaseModel):
    value: str
    label: str
    class_range_start: int
    class_range_end: int


class ClassLevelItem(BaseModel):
    value: str
    label: str
    education_level: str


class EducationLevelCreate(BaseModel):
    value: str
    label: str
    class_range_start: int = 1
    class_range_end: int = 8


class ClassLevelCreate(BaseModel):
    value: str
    label: str
    education_level: str


# ---------------------------------------------------------------------------
# CSV helpers
# ---------------------------------------------------------------------------

def _read_edu_levels() -> List[EducationLevelItem]:
    _ensure_csvs()
    path = _edu_csv_path()
    items: List[EducationLevelItem] = []
    with open(path, encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            items.append(EducationLevelItem(
                value=row["value"],
                label=row["label"],
                class_range_start=int(row["class_range_start"]),
                class_range_end=int(row["class_range_end"]),
            ))
    return items


def _write_edu_levels(items: List[EducationLevelItem]) -> None:
    path = _edu_csv_path()
    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["value", "label", "class_range_start", "class_range_end"])
        for item in items:
            writer.writerow([item.value, item.label, item.class_range_start, item.class_range_end])


def _read_class_levels() -> List[ClassLevelItem]:
    _ensure_csvs()
    path = _class_csv_path()
    items: List[ClassLevelItem] = []
    with open(path, encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            items.append(ClassLevelItem(
                value=row["value"],
                label=row["label"],
                education_level=row["education_level"],
            ))
    return items


def _write_class_levels(items: List[ClassLevelItem]) -> None:
    path = _class_csv_path()
    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["value", "label", "education_level"])
        for item in items:
            writer.writerow([item.value, item.label, item.education_level])


# ---------------------------------------------------------------------------
# Education level endpoints
# ---------------------------------------------------------------------------

@router.get("/education", response_model=List[EducationLevelItem])
def list_education_levels(
    current_user: User = Depends(get_current_user),
):
    """Return all education levels from CSV."""
    return _read_edu_levels()


@router.post("/education", response_model=EducationLevelItem, status_code=status.HTTP_201_CREATED)
def add_education_level(
    body: EducationLevelCreate,
    current_user: User = Depends(get_current_user),
):
    """Add a new education level to the CSV."""
    items = _read_edu_levels()
    if any(i.value == body.value for i in items):
        raise HTTPException(status_code=400, detail="Ten poziom edukacji już istnieje")
    new_item = EducationLevelItem(
        value=body.value,
        label=body.label,
        class_range_start=body.class_range_start,
        class_range_end=body.class_range_end,
    )
    items.append(new_item)
    _write_edu_levels(items)
    return new_item


@router.delete("/education/{value}", status_code=status.HTTP_204_NO_CONTENT)
def delete_education_level(
    value: str,
    current_user: User = Depends(get_current_user),
):
    """Delete an education level and its associated class levels."""
    items = _read_edu_levels()
    new_items = [i for i in items if i.value != value]
    if len(new_items) == len(items):
        raise HTTPException(status_code=404, detail="Nie znaleziono poziomu edukacji")
    _write_edu_levels(new_items)

    # Also remove associated class levels
    class_items = _read_class_levels()
    class_items = [c for c in class_items if c.education_level != value]
    _write_class_levels(class_items)


# ---------------------------------------------------------------------------
# Class level endpoints
# ---------------------------------------------------------------------------

@router.get("/classes", response_model=List[ClassLevelItem])
def list_class_levels(
    education_level: Optional[str] = None,
    current_user: User = Depends(get_current_user),
):
    """Return class levels, optionally filtered by education_level."""
    items = _read_class_levels()
    if education_level:
        items = [i for i in items if i.education_level == education_level]
    return items


@router.post("/classes", response_model=ClassLevelItem, status_code=status.HTTP_201_CREATED)
def add_class_level(
    body: ClassLevelCreate,
    current_user: User = Depends(get_current_user),
):
    """Add a new class level to the CSV."""
    items = _read_class_levels()
    if any(i.value == body.value and i.education_level == body.education_level for i in items):
        raise HTTPException(status_code=400, detail="Ten poziom klasy już istnieje dla tego poziomu edukacji")
    new_item = ClassLevelItem(value=body.value, label=body.label, education_level=body.education_level)
    items.append(new_item)
    _write_class_levels(items)
    return new_item


@router.delete("/classes/{education_level}/{value}", status_code=status.HTTP_204_NO_CONTENT)
def delete_class_level(
    education_level: str,
    value: str,
    current_user: User = Depends(get_current_user),
):
    """Delete a class level from the CSV."""
    items = _read_class_levels()
    new_items = [i for i in items if not (i.value == value and i.education_level == education_level)]
    if len(new_items) == len(items):
        raise HTTPException(status_code=404, detail="Nie znaleziono poziomu klasy")
    _write_class_levels(new_items)
