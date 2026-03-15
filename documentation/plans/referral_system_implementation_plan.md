# Plan implementacji: System poleceń dla nauczycieli

> **Status:** Plan  
> **Autor:** Zespół deweloperski EduGen  
> **Data:** 2026-03-15  
> **Powiązany dokument koncepcyjny:** `documentation/future_features/system_polecen_nauczyciele.md`

---

## Spis treści

1. [Analiza funkcjonalna](#1-analiza-funkcjonalna)
2. [Analiza architektoniczna](#2-analiza-architektoniczna)
3. [Szczegółowy plan implementacji — Backend](#3-szczegółowy-plan-implementacji--backend)
4. [Szczegółowy plan implementacji — Baza danych](#4-szczegółowy-plan-implementacji--baza-danych)
5. [Szczegółowy plan implementacji — Frontend](#5-szczegółowy-plan-implementacji--frontend)
6. [Infrastruktura i integracje](#6-infrastruktura-i-integracje)
7. [Potencjalne problemy i ryzyka](#7-potencjalne-problemy-i-ryzyka)
8. [Propozycje usprawnień](#8-propozycje-usprawnień)
9. [Kolejność faz implementacji](#9-kolejność-faz-implementacji)
10. [Plan testów](#10-plan-testów)
11. [Zmiany w strukturze plików](#11-zmiany-w-strukturze-plików)
12. [Zmiany w dokumentacji](#12-zmiany-w-dokumentacji)

---

## 1. Analiza funkcjonalna

### 1.1. Cel funkcjonalności

System poleceń umożliwia nauczycielom zapraszanie innych nauczycieli do aplikacji EduGen za pomocą unikalnego linku polecającego. Za każdego nauczyciela, który zarejestruje się przez link, polecający otrzymuje 1 miesiąc subskrypcji PRO. System ma na celu organiczny wzrost bazy użytkowników bez nakładów reklamowych.

### 1.2. Problem, który rozwiązuje

- Brak mechanizmu organicznego pozyskiwania użytkowników
- Nauczyciele naturalnie polecają sobie nawzajem narzędzia — brak infrastruktury do śledzenia i nagradzania tych poleceń
- Brak motywacji dla obecnych użytkowników do aktywnego dzielenia się aplikacją

### 1.3. Wpływ na istniejący system

| Obszar | Typ zmiany | Opis |
|--------|-----------|------|
| **Model `User`** | Modyfikacja | Nowe kolumny: `referral_code`, `referred_by_user_id`, `referral_bonus_months` |
| **Rejestracja** | Modyfikacja | Opcjonalne pole kodu polecającego w formularzu i endpoincie |
| **Baza danych** | Nowa tabela + migracja | Tabela `referrals` do śledzenia poleceń; nowe kolumny w `users` |
| **Frontend — rejestracja** | Modyfikacja | Obsługa parametru `ref` w URL, profilaktyczne pole kodu |
| **Frontend — panel użytkownika** | Nowa sekcja | Sekcja „Zaproś nauczycieli" w profilu lub osobna strona |
| **Frontend — strona publiczna** | Nowa sekcja | Ranking najaktywniejszych polecających |
| **Backend — nowy router** | Nowy plik | Endpointy CRUD dla systemu poleceń |
| **Backend — nowy serwis** | Nowy plik | Logika biznesowa: naliczanie bonusów, walidacja kodów |

### 1.4. Nowe możliwości

- Każdy użytkownik otrzymuje unikalny kod polecający (generowany automatycznie przy rejestracji)
- Link polecający: `/register?ref=<kod>`
- Śledzenie: kto kogo zaprosił, kiedy, jakie bonusy naliczono
- Naliczanie bonusu: +1 miesiąc PRO za każde udane polecenie
- Bonus progresywny: 5 zaproszeń → 3 miesiące, 10 zaproszeń → 6 miesięcy (kumulatywnie)
- Ranking top 5 polecających na stronie publicznej
- Panel „Zaproś nauczycieli" w profilu użytkownika

---

## 2. Analiza architektoniczna

### 2.1. Integracja z istniejącą architekturą

System poleceń wpisuje się w obecny wzorzec architektoniczny EduGen:

```
Router (referrals.py) → Service (referral_service.py) → Model (referral.py, user.py)
Schema (referral.py)     Hook (useReferrals.ts)         Component (ReferralPanel.tsx)
```

Wzorzec jest identyczny z istniejącymi modułami (`subjects`, `secret_keys`, `user_ai_models`).

### 2.2. Części systemu wymagające zmian

#### Backend
- **`app/models/user.py`** — dodanie kolumn `referral_code`, `referred_by_user_id`, `referral_bonus_months`
- **`app/models/__init__.py`** — rejestracja nowego modelu `Referral`
- **`app/routers/auth.py`** — modyfikacja endpointu `POST /auth/register` (obsługa parametru `referral_code`)
- **`app/services/auth_service.py`** — modyfikacja `register_user()` (walidacja i powiązanie kodu polecającego)
- **`app/main.py`** — rejestracja nowego routera `referrals`

#### Baza danych
- Nowa tabela `referrals`
- Nowe kolumny w tabeli `users`
- Migracja Alembic `002_referral_system.py`
- Nowe indeksy

#### Frontend
- **`src/components/auth/RegisterForm.tsx`** — pole kodu polecającego
- **`src/app/register/page.tsx`** — odczyt parametru `ref` z URL
- **`src/schemas/auth.ts`** — dodanie pola `referral_code` do schematu rejestracji
- Nowe pliki: hook `useReferrals.ts`, komponent `ReferralPanel.tsx`, strona `/referrals`
- **`src/components/layout/Sidebar.tsx`** — nowy element nawigacji
- **`src/app/page.tsx`** — sekcja rankingu polecających

#### Nie wymaga zmian
- Integracje z LLM (OpenRouter) — brak powiązania z systemem poleceń
- Baza wektorowa (pgvector) — brak powiązania
- Kolejki / caching — nie jest wymagane dla tej funkcjonalności
- System plików / DOCX — brak powiązania

---

## 3. Szczegółowy plan implementacji — Backend

### 3.1. Nowy model: `app/models/referral.py`

```python
"""Referral tracking model."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import String, Text, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Referral(Base):
    __tablename__ = "referrals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    referrer_user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    referred_user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    bonus_months_granted: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[str] = mapped_column(
        Text, nullable=False, default=lambda: datetime.now(timezone.utc).isoformat()
    )

    # Relationships
    referrer = relationship("User", foreign_keys=[referrer_user_id], backref="referrals_made")
    referred = relationship("User", foreign_keys=[referred_user_id], backref="referred_by")
```

**Uzasadnienie decyzji projektowych:**
- Osobna tabela `referrals` zamiast samych kolumn w `users` — umożliwia pełną historię poleceń, audyt, i łatwe budowanie rankingów
- `referred_user_id` jest `unique` — każdy użytkownik może być polecony tylko raz
- `bonus_months_granted` na rekordzie — pozwala na elastyczne naliczanie bonusów progresywnych
- Relacje `backref` zamiast `back_populates`, spójne ze wzorcem `VerificationToken`

### 3.2. Modyfikacja modelu: `app/models/user.py`

Nowe kolumny dodawane do klasy `User`:

```python
# Referral system
referral_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
referred_by_user_id: Mapped[str | None] = mapped_column(
    String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
)
referral_bonus_months: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
```

**Uwagi:**
- `referral_code` — unikalny, 8-znakowy, URL-safe kod alfanumeryczny (generowany przy rejestracji)
- `referred_by_user_id` — `SET NULL` przy usunięciu polecającego (zachowanie historii)
- `referral_bonus_months` — zdesnormalizowany licznik sumaryczny (szybki odczyt bez agregacji)

### 3.3. Modyfikacja `app/models/__init__.py`

```python
from app.models.referral import Referral

# Dodać do __all__:
"Referral",
```

### 3.4. Nowe schematy: `app/schemas/referral.py`

```python
"""Referral system schemas."""

from __future__ import annotations

from pydantic import BaseModel


class ReferralStatsResponse(BaseModel):
    """Statystyki poleceń użytkownika."""
    referral_code: str
    referral_link: str
    total_referrals: int
    bonus_months_earned: int


class ReferralHistoryItem(BaseModel):
    """Pojedynczy rekord polecenia."""
    referred_user_first_name: str | None
    referred_user_email_masked: str
    bonus_months: int
    created_at: str


class ReferralHistoryResponse(BaseModel):
    """Lista poleceń użytkownika."""
    referrals: list[ReferralHistoryItem]
    total_count: int


class TopReferrerItem(BaseModel):
    """Element rankingu polecających."""
    display_name: str
    total_referrals: int
    bonus_months: int
    rank: int


class TopReferrersResponse(BaseModel):
    """Publiczny ranking top polecających."""
    top_referrers: list[TopReferrerItem]
```

### 3.5. Modyfikacja schematu rejestracji: `app/schemas/auth.py`

Dodanie opcjonalnego pola do `RegisterRequest`:

```python
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str | None = None
    last_name: str | None = None
    referral_code: str | None = None  # ← NOWE

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Hasło musi mieć co najmniej 8 znaków")
        return v

    @field_validator("referral_code")
    @classmethod
    def validate_referral_code(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            if not v:
                return None
            if len(v) > 20:
                raise ValueError("Nieprawidłowy kod polecający")
        return v
```

### 3.6. Nowy serwis: `app/services/referral_service.py`

```python
"""Referral system service — code generation, bonus calculation, rankings."""

from __future__ import annotations

import logging
import secrets
import string
from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session as DBSession

from app.models.referral import Referral
from app.models.user import User

logger = logging.getLogger(__name__)

REFERRAL_CODE_LENGTH = 8
REFERRAL_CODE_ALPHABET = string.ascii_lowercase + string.digits

# Bonus tiers: (threshold, total_bonus_months)
# Po osiągnięciu progu, użytkownik otrzymuje łączną liczbę miesięcy (nie dodatkowo)
BONUS_TIERS = [
    (10, 6),  # 10 zaproszeń → 6 miesięcy łącznie
    (5, 3),   # 5 zaproszeń → 3 miesiące łącznie
    (1, 1),   # 1 zaproszenie → 1 miesiąc
]


def generate_referral_code(db: DBSession) -> str:
    """Generate a unique URL-safe referral code."""
    for _ in range(10):
        code = "".join(secrets.choice(REFERRAL_CODE_ALPHABET) for _ in range(REFERRAL_CODE_LENGTH))
        existing = db.query(User).filter(User.referral_code == code).first()
        if not existing:
            return code
    raise RuntimeError("Failed to generate unique referral code after 10 attempts")


def calculate_bonus_months(total_referrals: int) -> int:
    """Calculate total bonus months based on progressive tier structure.

    Tiers (cumulative, not additive):
    - 1 referral  → 1 month total
    - 5 referrals → 3 months total
    - 10 referrals → 6 months total
    - Beyond tiers: 1 month per referral (linear)
    """
    for threshold, bonus in BONUS_TIERS:
        if total_referrals >= threshold:
            # Beyond highest tier: linear 1 month per referral
            if threshold == BONUS_TIERS[0][0] and total_referrals > threshold:
                return bonus + (total_referrals - threshold)
            return bonus
    return 0


def process_referral(db: DBSession, referral_code: str, new_user: User) -> bool:
    """Process a referral after successful registration.

    Returns True if the referral was valid and processed, False otherwise.
    """
    referrer = db.query(User).filter(User.referral_code == referral_code).first()
    if not referrer:
        logger.warning("Referral code '%s' not found — ignoring.", referral_code)
        return False

    if referrer.id == new_user.id:
        logger.warning("User attempted self-referral — ignoring.")
        return False

    # Check if user was already referred
    existing = db.query(Referral).filter(Referral.referred_user_id == new_user.id).first()
    if existing:
        logger.warning("User '%s' already has a referral record — ignoring.", new_user.id)
        return False

    # Count current referrals for tier calculation
    current_count = db.query(func.count(Referral.id)).filter(
        Referral.referrer_user_id == referrer.id
    ).scalar() or 0
    new_count = current_count + 1
    new_bonus = calculate_bonus_months(new_count)

    # Create referral record
    referral = Referral(
        referrer_user_id=referrer.id,
        referred_user_id=new_user.id,
        bonus_months_granted=new_bonus - referrer.referral_bonus_months,
    )
    db.add(referral)

    # Update referrer's bonus
    referrer.referral_bonus_months = new_bonus
    referrer.updated_at = datetime.now(timezone.utc).isoformat()

    # Link the new user to the referrer
    new_user.referred_by_user_id = referrer.id

    db.flush()
    logger.info(
        "Referral processed: %s → %s (total: %d, bonus: %d months)",
        referrer.email,
        new_user.email,
        new_count,
        new_bonus,
    )
    return True


def get_referral_stats(db: DBSession, user: User) -> dict:
    """Get referral statistics for a user."""
    total_referrals = db.query(func.count(Referral.id)).filter(
        Referral.referrer_user_id == user.id
    ).scalar() or 0

    return {
        "referral_code": user.referral_code,
        "total_referrals": total_referrals,
        "bonus_months_earned": user.referral_bonus_months,
    }


def get_referral_history(db: DBSession, user: User) -> list[dict]:
    """Get the list of users referred by a specific user."""
    referrals = (
        db.query(Referral, User)
        .join(User, Referral.referred_user_id == User.id)
        .filter(Referral.referrer_user_id == user.id)
        .order_by(Referral.created_at.desc())
        .all()
    )

    result = []
    for ref, referred_user in referrals:
        # Mask email: show first 2 chars + domain
        email = referred_user.email
        at_idx = email.index("@")
        masked = email[:2] + "***" + email[at_idx:]

        result.append({
            "referred_user_first_name": referred_user.first_name,
            "referred_user_email_masked": masked,
            "bonus_months": ref.bonus_months_granted,
            "created_at": ref.created_at,
        })

    return result


def get_top_referrers(db: DBSession, limit: int = 5) -> list[dict]:
    """Get top referrers for the public leaderboard.

    Only includes users with at least 1 referral.
    Display name: first_name + first letter of last_name + "."
    """
    results = (
        db.query(
            User.first_name,
            User.last_name,
            func.count(Referral.id).label("total_referrals"),
            User.referral_bonus_months,
        )
        .join(Referral, Referral.referrer_user_id == User.id)
        .filter(User.is_active.is_(True))
        .group_by(User.id, User.first_name, User.last_name, User.referral_bonus_months)
        .order_by(func.count(Referral.id).desc())
        .limit(limit)
        .all()
    )

    top = []
    for rank, (first_name, last_name, total, bonus) in enumerate(results, 1):
        if first_name and last_name:
            name = f"{first_name} {last_name[0]}."
        elif first_name:
            name = first_name
        else:
            name = "Anonim"

        top.append({
            "display_name": name,
            "total_referrals": total,
            "bonus_months": bonus,
            "rank": rank,
        })

    return top
```

### 3.7. Nowy router: `app/routers/referrals.py`

```python
"""Referral system router."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.referral import (
    ReferralStatsResponse,
    ReferralHistoryResponse,
    ReferralHistoryItem,
    TopReferrersResponse,
    TopReferrerItem,
)
from app.services.referral_service import (
    get_referral_stats,
    get_referral_history,
    get_top_referrers,
)

router = APIRouter(prefix="/referrals", tags=["referrals"])


@router.get("/my-stats", response_model=ReferralStatsResponse)
def my_referral_stats(
    request: Request,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the current user's referral statistics and link."""
    stats = get_referral_stats(db, current_user)

    # Build referral link using the request's base URL
    base_url = str(request.base_url).rstrip("/")
    referral_link = f"{base_url}/register?ref={stats['referral_code']}"

    return ReferralStatsResponse(
        referral_code=stats["referral_code"],
        referral_link=referral_link,
        total_referrals=stats["total_referrals"],
        bonus_months_earned=stats["bonus_months_earned"],
    )


@router.get("/my-history", response_model=ReferralHistoryResponse)
def my_referral_history(
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the list of users referred by the current user."""
    history = get_referral_history(db, current_user)
    return ReferralHistoryResponse(
        referrals=[ReferralHistoryItem(**item) for item in history],
        total_count=len(history),
    )


@router.get("/top", response_model=TopReferrersResponse)
def top_referrers(
    db: DBSession = Depends(get_db),
):
    """Get the public leaderboard of top referrers.

    This endpoint does NOT require authentication — it is publicly accessible.
    """
    top = get_top_referrers(db, limit=5)
    return TopReferrersResponse(
        top_referrers=[TopReferrerItem(**item) for item in top],
    )
```

**Uwaga:** Endpoint `GET /referrals/top` jest **publiczny** (brak `Depends(get_current_user)`) — ranking jest widoczny na stronie głównej bez logowania.

### 3.8. Modyfikacja `app/routers/auth.py` — endpoint rejestracji

Aktualna sygnatura `register()`:
```python
@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: DBSession = Depends(get_db)):
```

**Zmiana:** Po wywołaniu `register_user()` dodać przetwarzanie kodu polecającego:

```python
@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: DBSession = Depends(get_db)):
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Użytkownik z tym adresem e-mail już istnieje")

    user = register_user(
        db,
        email=body.email,
        password=body.password,
        first_name=body.first_name,
        last_name=body.last_name,
    )

    # Process referral code if provided
    if body.referral_code:
        from app.services.referral_service import process_referral
        process_referral(db, body.referral_code, user)
        db.commit()
        db.refresh(user)

    return UserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
        created_at=user.created_at,
    )
```

### 3.9. Modyfikacja `app/services/auth_service.py` — generowanie kodu polecającego

W funkcji `register_user()` — generować `referral_code` przy tworzeniu użytkownika:

```python
def register_user(db, email, password, first_name=None, last_name=None) -> User:
    from app.services.referral_service import generate_referral_code

    now_iso = datetime.now(timezone.utc).isoformat()
    code = generate_referral_code(db)

    user = User(
        email=email,
        password_hash=hash_password(password),
        first_name=first_name,
        last_name=last_name,
        referral_code=code,  # ← NOWE
    )
    db.add(user)
    db.flush()
    # ... reszta bez zmian (seed default AI models) ...
```

### 3.10. Rejestracja routera w `app/main.py`

```python
from app.routers import ..., referrals  # dodać import

app.include_router(referrals.router, prefix="/api")  # dodać rejestrację
```

### 3.11. Kontrakt API — podsumowanie endpointów

| Metoda | Ścieżka | Auth | Opis | Request | Response |
|--------|---------|------|------|---------|----------|
| `GET` | `/api/referrals/my-stats` | Wymagana | Statystyki poleceń użytkownika | — | `ReferralStatsResponse` |
| `GET` | `/api/referrals/my-history` | Wymagana | Historia poleceń użytkownika | — | `ReferralHistoryResponse` |
| `GET` | `/api/referrals/top` | **Publiczny** | Ranking top 5 polecających | — | `TopReferrersResponse` |
| `POST` | `/api/auth/register` | Publiczny | Rejestracja (zmodyfikowana) | `RegisterRequest` (+ `referral_code`) | `UserResponse` |

---

## 4. Szczegółowy plan implementacji — Baza danych

### 4.1. Nowa tabela: `referrals`

```sql
CREATE TABLE referrals (
    id              VARCHAR(36) PRIMARY KEY,
    referrer_user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_user_id VARCHAR(36) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    bonus_months_granted INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL
);

CREATE INDEX ix_referrals_referrer_user_id ON referrals(referrer_user_id);
CREATE UNIQUE INDEX ix_referrals_referred_user_id ON referrals(referred_user_id);
```

### 4.2. Nowe kolumny w `users`

```sql
ALTER TABLE users ADD COLUMN referral_code VARCHAR(20) NOT NULL UNIQUE;
ALTER TABLE users ADD COLUMN referred_by_user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN referral_bonus_months INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX ix_users_referral_code ON users(referral_code);
```

### 4.3. Migracja Alembic: `alembic/versions/002_referral_system.py`

```python
"""Referral system — tables and columns

Revision ID: 002
Revises: 001
Create Date: 2026-03-15
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Add referral columns to users ---
    op.add_column("users", sa.Column("referral_code", sa.String(20), nullable=True))
    op.add_column("users", sa.Column(
        "referred_by_user_id", sa.String(36),
        sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    ))
    op.add_column("users", sa.Column(
        "referral_bonus_months", sa.Integer, nullable=False, server_default="0",
    ))

    # Backfill referral codes for existing users
    from uuid import uuid4
    conn = op.get_bind()
    users = conn.execute(sa.text("SELECT id FROM users WHERE referral_code IS NULL")).fetchall()
    import secrets, string
    alphabet = string.ascii_lowercase + string.digits
    used_codes: set[str] = set()
    for (user_id,) in users:
        while True:
            code = "".join(secrets.choice(alphabet) for _ in range(8))
            if code not in used_codes:
                used_codes.add(code)
                break
        conn.execute(
            sa.text("UPDATE users SET referral_code = :code WHERE id = :uid"),
            {"code": code, "uid": user_id},
        )

    # Now make referral_code NOT NULL and UNIQUE
    op.alter_column("users", "referral_code", nullable=False)
    op.create_unique_constraint("uq_users_referral_code", "users", ["referral_code"])
    op.create_index("ix_users_referral_code", "users", ["referral_code"], unique=True)

    # --- Create referrals table ---
    op.create_table(
        "referrals",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("referrer_user_id", sa.String(36),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("referred_user_id", sa.String(36),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("bonus_months_granted", sa.Integer, nullable=False, server_default="1"),
        sa.Column("created_at", sa.Text, nullable=False),
    )
    op.create_index("ix_referrals_referrer_user_id", "referrals", ["referrer_user_id"])
    op.create_index("ix_referrals_referred_user_id", "referrals", ["referred_user_id"], unique=True)


def downgrade() -> None:
    op.drop_table("referrals")
    op.drop_index("ix_users_referral_code", table_name="users")
    op.drop_constraint("uq_users_referral_code", "users", type_="unique")
    op.drop_column("users", "referral_bonus_months")
    op.drop_column("users", "referred_by_user_id")
    op.drop_column("users", "referral_code")
```

### 4.4. Indeksy — uzasadnienie

| Indeks | Uzasadnienie |
|--------|-------------|
| `ix_users_referral_code` (unique) | Szybkie wyszukiwanie kodu polecającego przy rejestracji |
| `ix_referrals_referrer_user_id` | Szybkie zliczanie poleceń i historia |
| `ix_referrals_referred_user_id` (unique) | Gwarancja jednorazowego polecenia + szybkie sprawdzanie |

### 4.5. Diagram relacji

```
users
├── id (PK)
├── referral_code (UNIQUE, NOT NULL)
├── referred_by_user_id (FK → users.id, SET NULL)
├── referral_bonus_months
└── ...

referrals
├── id (PK)
├── referrer_user_id (FK → users.id, CASCADE)
├── referred_user_id (FK → users.id, CASCADE, UNIQUE)
├── bonus_months_granted
└── created_at
```

Relacja `users → referrals`:
- `users.id` ←(1:N)→ `referrals.referrer_user_id` (jedno polecenie → wiele zaproszonych)
- `users.id` ←(1:1)→ `referrals.referred_user_id` (użytkownik polecony tylko raz)
- `users.referred_by_user_id` → `users.id` (samo-referencja, opcjonalna)

---

## 5. Szczegółowy plan implementacji — Frontend

### 5.1. Modyfikacja schematu Zod: `src/schemas/auth.ts`

Dodanie opcjonalnego pola `referral_code` do `RegisterRequestSchema`:

```typescript
export const RegisterRequestSchema = z
  .object({
    email: z.string().email('Podaj poprawny adres e-mail'),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    password: z.string().min(8, 'Hasło musi mieć co najmniej 8 znaków'),
    confirm_password: z.string(),
    referral_code: z.string().optional(),  // ← NOWE
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Hasła nie są identyczne',
    path: ['confirm_password'],
  });
```

### 5.2. Modyfikacja formularza rejestracji: `src/components/auth/RegisterForm.tsx`

**Zmiany:**
- Dodanie pola `referral_code` (TextField, opcjonalne)
- Prop `defaultReferralCode` przekazywany z `register/page.tsx`
- Pole wyświetlane jako read-only jeśli kod pochodzi z URL

```tsx
interface RegisterFormProps {
  defaultReferralCode?: string;
}

export default function RegisterForm({ defaultReferralCode }: RegisterFormProps) {
  // W defaultValues:
  // referral_code: defaultReferralCode || '',

  // Dodać TextField:
  // <TextField
  //   label="Kod polecający (opcjonalny)"
  //   {...register('referral_code')}
  //   InputProps={{ readOnly: !!defaultReferralCode }}
  //   helperText="Jeśli ktoś Cię zaprosił, wpisz jego kod"
  // />
}
```

### 5.3. Modyfikacja strony rejestracji: `src/app/register/page.tsx`

- Odczytać parametr `ref` z URL za pomocą `useSearchParams()`
- Przekazać go jako `defaultReferralCode` do `RegisterForm`
- Wyświetlić informację o zaproszeniu

```tsx
'use client';

import { useSearchParams } from 'next/navigation';

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const referralCode = searchParams.get('ref') || undefined;

  return (
    // ... existing layout ...
    {referralCode && (
      <Alert severity="info" sx={{ mb: 2 }}>
        Rejestrujesz się z polecenia. Po założeniu konta, osoba zapraszająca otrzyma bonus.
      </Alert>
    )}
    <RegisterForm defaultReferralCode={referralCode} />
    // ...
  );
}
```

### 5.4. Modyfikacja hooka `useAuth` — przekazanie `referral_code`

W `src/hooks/useAuth.ts`, funkcja `register()` — przekazać `referral_code` do API:

```typescript
const register = async (data: RegisterRequest) => {
  setIsLoading(true);
  setError(null);
  try {
    await api.post('/api/auth/register', {
      email: data.email,
      password: data.password,
      first_name: data.first_name,
      last_name: data.last_name,
      referral_code: data.referral_code || undefined,  // ← NOWE
    });
    await login({ email: data.email, password: data.password });
  } catch (err: unknown) {
    // ... existing error handling ...
  }
};
```

### 5.5. Nowe typy: `src/types/index.ts`

```typescript
export interface ReferralStats {
  referral_code: string;
  referral_link: string;
  total_referrals: number;
  bonus_months_earned: number;
}

export interface ReferralHistoryItem {
  referred_user_first_name: string | null;
  referred_user_email_masked: string;
  bonus_months: number;
  created_at: string;
}

export interface TopReferrer {
  display_name: string;
  total_referrals: number;
  bonus_months: number;
  rank: number;
}
```

### 5.6. Nowy hook: `src/hooks/useReferrals.ts`

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ReferralStats, ReferralHistoryItem, TopReferrer } from '@/types';

export function useReferralStats() {
  const query = useQuery({
    queryKey: ['referral-stats'],
    queryFn: async () => {
      const res = await api.get<ReferralStats>('/api/referrals/my-stats');
      return res.data;
    },
  });

  return {
    stats: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

export function useReferralHistory() {
  const query = useQuery({
    queryKey: ['referral-history'],
    queryFn: async () => {
      const res = await api.get<{ referrals: ReferralHistoryItem[]; total_count: number }>(
        '/api/referrals/my-history'
      );
      return res.data;
    },
  });

  return {
    history: query.data?.referrals || [],
    totalCount: query.data?.total_count || 0,
    isLoading: query.isLoading,
  };
}

export function useTopReferrers() {
  const query = useQuery({
    queryKey: ['top-referrers'],
    queryFn: async () => {
      const res = await api.get<{ top_referrers: TopReferrer[] }>('/api/referrals/top');
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // cache na 5 minut
  });

  return {
    topReferrers: query.data?.top_referrers || [],
    isLoading: query.isLoading,
  };
}
```

### 5.7. Nowy komponent: `src/components/referrals/ReferralPanel.tsx`

Panel „Zaproś nauczycieli" wyświetlany na stronie `/referrals` lub w profilu:

**Funkcjonalność:**
- Wyświetla unikalny link polecający z przyciskiem „Kopiuj link"
- Licznik zaproszonych nauczycieli
- Licznik zdobytych miesięcy PRO
- Pasek progresu do następnego progu bonusowego
- Tabela historii poleceń

**Struktura UI (MUI):**
```
┌────────────────────────────────────────────────────┐
│ "Zaproś nauczycieli"                               │
│                                                    │
│ ┌───────────────────────────────────────┐           │
│ │ Twój link polecający:                 │           │
│ │ [https://app.../register?ref=abc123| Kopiuj]│     │
│ └───────────────────────────────────────┘           │
│                                                    │
│ Informacja:                                        │
│ "Zaproś innych nauczycieli do aplikacji.           │
│  Za każdego nauczyciela, który założy konto        │
│  z Twojego linku, otrzymujesz 1 miesiąc            │
│  subskrypcji PRO za darmo."                        │
│                                                    │
│ ┌─────────────┐  ┌──────────────────┐              │
│ │ Zaproszeni  │  │ Miesiące PRO     │              │
│ │   7         │  │   7              │              │
│ └─────────────┘  └──────────────────┘              │
│                                                    │
│ Postęp do następnego bonusu:                       │
│ [████████████░░░░] 7/10 (3 do 6 miesięcy PRO)     │
│                                                    │
│ Historia poleceń:                                  │
│ ┌─────────────────────────────────────────┐        │
│ │ Anna K.  | an***@email.com | +1m | data │        │
│ │ Marek P. | ma***@email.com | +1m | data │        │
│ └─────────────────────────────────────────┘        │
└────────────────────────────────────────────────────┘
```

**Podział komponentów:**
- `ReferralPanel.tsx` — główny kontener z layoutem
- `ReferralLinkCard.tsx` — karta z linkiem i przyciskiem kopiowania
- `ReferralStatsCards.tsx` — karty statystyk (zaproszeni + miesiące)
- `ReferralProgressBar.tsx` — pasek progresu do kolejnego progu
- `ReferralHistoryTable.tsx` — tabela historii poleceń

### 5.8. Nowa strona: `src/app/(authenticated)/referrals/page.tsx`

Strona w strefie zalogowanej wyświetlająca `ReferralPanel`:

```tsx
'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ReferralPanel from '@/components/referrals/ReferralPanel';

export default function ReferralsPage() {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
        Zaproś nauczycieli
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Udostępnij swój link polecający i zdobywaj darmowe miesiące subskrypcji PRO.
      </Typography>
      <ReferralPanel />
    </Box>
  );
}
```

### 5.9. Modyfikacja nawigacji: `src/components/layout/Sidebar.tsx`

Dodanie nowego elementu do tablicy `menuItems`:

```typescript
import ShareIcon from '@mui/icons-material/Share';

const menuItems = [
  { text: 'Generuj', icon: <AddCircleIcon />, path: '/generate' },
  { text: 'Materiały', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'Przedmioty i Pliki', icon: <FolderOpenIcon />, path: '/subjects' },
  { text: 'Podstawa Programowa', icon: <MenuBookIcon />, path: '/state-documents/pp' },
  { text: 'Zaproś nauczycieli', icon: <ShareIcon />, path: '/referrals' },  // ← NOWE
  { text: 'Ustawienia', icon: <SettingsIcon />, path: '/settings' },
  { text: 'Mój profil', icon: <AccountCircleIcon />, path: '/profile' },
];
```

### 5.10. Modyfikacja strony publicznej: `src/app/page.tsx`

Dodanie sekcji rankingu na stronie głównej:

```tsx
import { TopReferrersSection } from '@/components/referrals/TopReferrersSection';

// Na końcu strony, przed stopką:
<TopReferrersSection />
```

**Nowy komponent: `src/components/referrals/TopReferrersSection.tsx`**

Wyświetla ranking top 5 polecających z przyciskiem CTA „Zdobądź swój link polecający":

```
┌────────────────────────────────────────────────────┐
│ "Najbardziej aktywni nauczyciele"                  │
│                                                    │
│ 🥇 Anna K.     — 14 zaproszeń — 14 miesięcy PRO  │
│ 🥈 Marek P.    — 11 zaproszeń — 11 miesięcy PRO  │
│ 🥉 Katarzyna L.— 9 zaproszeń  — 9 miesięcy PRO   │
│  4. Tomasz W.  — 7 zaproszeń  — 7 miesięcy PRO   │
│  5. Marta S.   — 6 zaproszeń  — 6 miesięcy PRO   │
│                                                    │
│ "Zaproś nauczycieli i zdobywaj darmowe miesiące   │
│  PRO. 1 zaproszony nauczyciel = 1 miesiąc gratis."│
│                                                    │
│ [ Zdobądź swój link polecający ]                   │
└────────────────────────────────────────────────────┘
```

**Uwaga:** Ranking pobierany z publicznego endpoint `GET /api/referrals/top`. Jeśli brak danych, sekcja jest ukryta.

### 5.11. Flow użytkownika — rejestracja z poleceniem

```
1. Polecający kopiuje link: /register?ref=abc123
2. Polecany otwiera link → strona rejestracji
3. Formularz ma wstępnie wypełniony kod polecający (read-only)
4. Alert: "Rejestrujesz się z polecenia..."
5. Polecany wypełnia formularz i rejestruje się
6. Backend:
   a. Tworzy konto z referral_code
   b. Waliduje kod polecającego → znajduje polecającego
   c. Tworzy rekord w referrals
   d. Aktualizuje bonus polecającego
7. Polecany jest automatycznie zalogowany
8. Polecający widzi +1 polecenie w panelu
```

### 5.12. Flow użytkownika — panel poleceń

```
1. Użytkownik klika "Zaproś nauczycieli" w sidebarze
2. Strona /referrals ładuje się
3. useReferralStats → GET /api/referrals/my-stats
4. useReferralHistory → GET /api/referrals/my-history
5. Wyświetla: link, statystyki, progres, historia
6. Użytkownik klika "Kopiuj link" → navigator.clipboard.writeText()
7. Snackbar: "Link skopiowany do schowka"
```

---

## 6. Infrastruktura i integracje

### 6.1. Brak wymaganych integracji LLM

System poleceń nie wymaga żadnej integracji z modelami AI / OpenRouter — jest to czysto CRUD-owy moduł.

### 6.2. Brak dodatkowej infrastruktury

- **Bazy wektorowe** — nie dotyczy
- **Kolejki** — nie wymagane (przetwarzanie w ramach jednego requestu HTTP)
- **Caching** — React Query na frontendzie wystarcza (5-minutowy staleTime dla rankingu)
- **Zewnętrzne API** — brak

### 6.3. Przyszła integracja z emailami

Gdy serwis `email_service.py` zostanie zintegrowany z prawdziwym dostawcą SMTP:
- Powiadomienie dla polecającego: „Nowy nauczyciel dołączył z Twojego zaproszenia! Masz teraz X miesięcy PRO."
- Nie blokuje obecnej implementacji — email_service jest stub i zwraca `True`.

---

## 7. Potencjalne problemy i ryzyka

### 7.1. Nadużycia systemu poleceń

| Ryzyko | Opis | Mitygacja |
|--------|------|-----------|
| **Samo-polecenie** | Użytkownik tworzy fałszywe konta i poleca sam siebie | Walidacja w `process_referral()`: `referrer.id == new_user.id` → odrzucenie. Dodatkowa ochrona: limit zaproszeń na IP (przyszła iteracja). |
| **Farmienie kont** | Masowe tworzenie kont z jednego źródła | Nie blokuje MVP. Przyszła mitygacja: rate limiting na endpoint `/auth/register`, weryfikacja e-mail (wymaganie `is_email_verified` zanim polecenie się liczy). |
| **Duplikat polecenia** | Ten sam użytkownik polecony wielokrotnie | `referred_user_id` UNIQUE w tabeli `referrals` → baza odrzuci duplikat. |

### 7.2. Problemy z migracją

| Ryzyko | Opis | Mitygacja |
|--------|------|-----------|
| **Kolumna `referral_code` NOT NULL** | Istniejący użytkownicy nie mają kodu | Migracja dwustopniowa: (1) dodaj nullable, (2) backfill, (3) zmień na NOT NULL. |
| **Unikalność kodów** | Kolizja przy backfill | Generowanie z pętlą retry + zbiór `used_codes` w pamięci migracji. |

### 7.3. Wydajność

| Ryzyko | Opis | Mitygacja |
|--------|------|-----------|
| **Ranking (top referrers)** | Agregacja `COUNT + GROUP BY + ORDER BY` na każdy request | Przy małej skali (<10k użytkowników) — nie stanowi problemu. Przy wzroście: cache + materialized view. |
| **Wyszukiwanie kodu** | Lookup po `referral_code` przy rejestracji | Indeks UNIQUE na `referral_code` — O(log n). |

### 7.4. Spójność danych

| Ryzyko | Opis | Mitygacja |
|--------|------|-----------|
| **Zdesnormalizowany `referral_bonus_months`** | Może się rozsynchronizować z tabelą `referrals` | Przeliczany atomicznie w `process_referral()` (flush, nie oddzielna transakcja). W razie potrzeby: skrypt naprawczy przeliczający z `referrals`. |
| **Usunięcie polecającego** | Co z danymi poleconych? | `referred_by_user_id` → `SET NULL` (historia zachowana). `referrals.referrer_user_id` → `CASCADE` (rekord usunięty). |

### 7.5. Premium level vs bonus months

| Ryzyko | Opis | Mitygacja |
|--------|------|-----------|
| **Brak mechanizmu subskrypcji** | Kolumna `premium_level` istnieje, ale nie ma systemu subskrypcji | `referral_bonus_months` nalicza miesiące wirtualnie. Implementacja faktycznego odblokowywania PRO wymaga osobnego systemu subskrypcji. Na razie: zliczanie bonusu, wyświetlanie w UI. Aktywacja gdy system subskrypcji powstanie. |

---

## 8. Propozycje usprawnień

### 8.1. Uproszczenia architektoniczne

1. **Nie tworzyć osobnej tabeli `referral_bonuses`** — bonus wystarczy trzymać w kolumnie `users.referral_bonus_months` + `referrals.bonus_months_granted`. Nie komplikować schematu przed potrzebą.

2. **Publiczny endpoint bez auth middleware** — `GET /api/referrals/top` nie potrzebuje tokena. FastAPI nie wymaga specjalnej konfiguracji — brak `Depends(get_current_user)` wystarczy.

3. **Backfill kodów w migracji zamiast skryptu** — prostsze wdrożenie, brak dodatkowego kroku operacyjnego.

### 8.2. Reużywalne komponenty

- `StatCard` z `profile/page.tsx` może być wyekstrahowany do `src/components/ui/StatCard.tsx` i wykorzystany zarówno w profilu, jak i w panelu poleceń. Jeśli `StatCard` jest już zdefiniowany inline w profilu, warto go przenieść do `components/ui/`.

### 8.3. Lepsze modelowanie danych

- `referral_code` generowany przy rejestracji (nie lazy) — zapewnia, że każdy użytkownik ma kod od początku.
- `bonus_months_granted` na rekordzie `referrals` — umożliwia audyt i sprawdzenie, ile dokładnie dodano za każde polecenie (ważne przy progach).

### 8.4. Refactoring — oportunistyczny

- Przeniesienie `StatCard` do `components/ui/` jeśli jest duplikowany
- Dodanie wspólnego wzorca `useCopyToClipboard` (hook) — używany w panelu poleceń, potencjalnie też w ustawieniach (kopiowanie klucza API)

---

## 9. Kolejność faz implementacji

### Faza 1: Baza danych i modele (dzień 1)

**Zależności:** brak  
**Efekt:** Schemat bazy gotowy do użycia

1. Utworzyć `app/models/referral.py`
2. Dodać kolumny do `app/models/user.py`
3. Zaktualizować `app/models/__init__.py`
4. Utworzyć migrację `002_referral_system.py`
5. Przetestować migrację `upgrade` i `downgrade`

### Faza 2: Backend — serwis i schematy (dzień 1-2)

**Zależności:** Faza 1  
**Efekt:** Logika biznesowa gotowa, schematy walidacji

1. Utworzyć `app/schemas/referral.py`
2. Zmodyfikować `app/schemas/auth.py` (dodać `referral_code`)
3. Utworzyć `app/services/referral_service.py`
4. Napisać testy jednostkowe serwisu

### Faza 3: Backend — endpointy (dzień 2)

**Zależności:** Faza 2  
**Efekt:** API dostępne

1. Utworzyć `app/routers/referrals.py`
2. Zmodyfikować `app/routers/auth.py` (obsługa kodu w rejestracji)
3. Zmodyfikować `app/services/auth_service.py` (generowanie kodu)
4. Zarejestrować router w `app/main.py`
5. Napisać testy endpointów

### Faza 4: Frontend — rejestracja (dzień 2-3)

**Zależności:** Faza 3  
**Efekt:** Rejestracja z kodem polecającym działa

1. Zmodyfikować `src/schemas/auth.ts`
2. Zmodyfikować `src/hooks/useAuth.ts`
3. Zmodyfikować `src/components/auth/RegisterForm.tsx`
4. Zmodyfikować `src/app/register/page.tsx`

### Faza 5: Frontend — panel poleceń (dzień 3-4)

**Zależności:** Faza 3  
**Efekt:** Użytkownik widzi swoje polecenia

1. Dodać typy do `src/types/index.ts`
2. Utworzyć `src/hooks/useReferrals.ts`
3. Utworzyć `src/components/referrals/ReferralPanel.tsx` (z podkomponentami)
4. Utworzyć `src/app/(authenticated)/referrals/page.tsx`
5. Zmodyfikować `src/components/layout/Sidebar.tsx` (nowy element nawigacji)

### Faza 6: Frontend — strona publiczna (dzień 4)

**Zależności:** Faza 3 (endpoint `/api/referrals/top`)  
**Efekt:** Ranking widoczny na stronie

1. Utworzyć `src/components/referrals/TopReferrersSection.tsx`
2. Zmodyfikować `src/app/page.tsx` (dodać sekcję rankingu)

### Faza 7: Testy E2E i QA (dzień 4-5)

**Zależności:** Fazy 1–6  
**Efekt:** System przetestowany end-to-end

1. Testy E2E (Playwright): rejestracja z kodem, kopiowanie linku, ranking
2. Testy edge cases: nieprawidłowy kod, samo-polecenie, duplikat
3. Testy regresji: rejestracja bez kodu nadal działa

---

## 10. Plan testów

### 10.1. Testy jednostkowe (pytest)

**Plik: `tests/test_referral_service.py`**

| Test | Opis |
|------|------|
| `test_generate_referral_code_unique` | Generuje unikalny kod 8-znakowy |
| `test_generate_referral_code_retry_on_collision` | Retry gdy kod istnieje |
| `test_calculate_bonus_months_1` | 1 polecenie → 1 miesiąc |
| `test_calculate_bonus_months_5` | 5 poleceń → 3 miesiące |
| `test_calculate_bonus_months_10` | 10 poleceń → 6 miesięcy |
| `test_calculate_bonus_months_15` | 15 poleceń → 11 miesięcy (6 + 5 linear) |
| `test_process_referral_success` | Prawidłowe polecenie nalicza bonus |
| `test_process_referral_invalid_code` | Nieistniejący kod → False, bez zmian |
| `test_process_referral_self_referral` | Samo-polecenie → False |
| `test_process_referral_duplicate` | Drugie polecenie tego samego użytkownika → False |
| `test_get_referral_stats` | Poprawne zliczanie statystyk |
| `test_get_referral_history` | Historia z maskowaniem emaila |
| `test_get_referral_history_empty` | Pusta historia → pusta lista |
| `test_get_top_referrers` | Ranking posortowany malejąco |
| `test_get_top_referrers_display_name` | Format imię + inicjał nazwiska |
| `test_get_top_referrers_empty` | Brak poleceń → pusta lista |

### 10.2. Testy endpointów (pytest + TestClient)

**Plik: `tests/test_referrals_router.py`**

| Test | Opis |
|------|------|
| `test_register_with_referral_code` | POST `/auth/register` z kodem → polecenie przetworzone |
| `test_register_with_invalid_referral_code` | POST `/auth/register` z nieistniejącym kodem → rejestracja OK, polecenie pominięte |
| `test_register_without_referral_code` | POST `/auth/register` bez kodu → jak dotychczas |
| `test_my_stats_authenticated` | GET `/referrals/my-stats` → 200 + stats |
| `test_my_stats_unauthenticated` | GET `/referrals/my-stats` bez tokena → 401 |
| `test_my_history_authenticated` | GET `/referrals/my-history` → 200 + lista |
| `test_top_referrers_public` | GET `/referrals/top` bez auth → 200 + ranking |
| `test_top_referrers_empty` | GET `/referrals/top` bez danych → 200 + pusta lista |

### 10.3. Testy schematu (pytest)

**Plik: `tests/test_schemas.py` (rozszerzenie istniejącego)**

| Test | Opis |
|------|------|
| `test_register_request_with_referral_code` | Walidacja przechodzi z kodem |
| `test_register_request_without_referral_code` | Walidacja przechodzi bez kodu |
| `test_register_request_referral_code_too_long` | Kod >20 znaków → błąd walidacji |
| `test_register_request_referral_code_empty_string` | Pusty string → None |

### 10.4. Testy E2E (Playwright)

**Plik: `frontend/e2e/referrals.spec.ts`** (lub w odpowiednim katalogu)

| Test | Opis |
|------|------|
| `test_register_with_ref_param_shows_alert` | Wejście na `/register?ref=abc` → alert o poleceniu, pole wypełnione |
| `test_register_without_ref_param` | Wejście na `/register` → brak alertu, brak pola read-only |
| `test_referral_panel_copy_link` | Zalogowany → `/referrals` → kliknięcie „Kopiuj" → sukces |
| `test_referral_panel_stats` | Panel wyświetla poprawne liczby |
| `test_public_ranking_visible` | Strona główna → sekcja rankingu widoczna (jeśli są dane) |
| `test_public_ranking_hidden_when_empty` | Strona główna bez danych → sekcja ukryta |

### 10.5. Edge cases

| Edge case | Oczekiwane zachowanie |
|-----------|----------------------|
| Rejestracja z kodem własnego konta | Odrzucone (walidacja samo-polecenia) |
| Rejestracja z kodem nieaktywnego użytkownika | Przetworzenie — kod jest ważny niezależnie od statusu konta |
| Usunięcie polecającego po poleceniu | `referred_by_user_id` → NULL, rekord `referrals` usunięty (CASCADE) |
| Usunięcie poleconego | Rekord `referrals` usunięty (CASCADE), bonus polecającego **nie** jest cofany (uproszczenie MVP) |
| Wielokrotna rejestracja z tym samym kodem | Każda rejestracja to osobne polecenie — OK |
| Rejestracja z kodem ale e-mail weryfikacja wymagana | Polecenie liczone natychmiast (brak wymogu weryfikacji emaila w MVP) |

---

## 11. Zmiany w strukturze plików

### Nowe pliki

```
backend/
├── app/
│   ├── models/
│   │   └── referral.py                    # Model tabeli referrals
│   ├── routers/
│   │   └── referrals.py                   # Endpointy systemu poleceń
│   ├── schemas/
│   │   └── referral.py                    # Schematy Pydantic
│   └── services/
│       └── referral_service.py            # Logika biznesowa poleceń
├── alembic/
│   └── versions/
│       └── 002_referral_system.py         # Migracja bazy danych
├── tests/
│   ├── test_referral_service.py           # Testy serwisu
│   └── test_referrals_router.py           # Testy endpointów

frontend/
├── src/
│   ├── hooks/
│   │   └── useReferrals.ts                # Hook React Query
│   ├── components/
│   │   └── referrals/
│   │       ├── ReferralPanel.tsx           # Główny panel poleceń
│   │       ├── ReferralLinkCard.tsx        # Karta z linkiem
│   │       ├── ReferralStatsCards.tsx      # Karty statystyk
│   │       ├── ReferralProgressBar.tsx     # Pasek progresu
│   │       ├── ReferralHistoryTable.tsx    # Tabela historii
│   │       └── TopReferrersSection.tsx     # Sekcja rankingu (publiczna)
│   └── app/
│       └── (authenticated)/
│           └── referrals/
│               └── page.tsx               # Strona panelu poleceń
```

### Modyfikowane pliki

```
backend/
├── app/
│   ├── models/
│   │   ├── user.py                        # +3 kolumny (referral_code, referred_by_user_id, referral_bonus_months)
│   │   └── __init__.py                    # +import Referral
│   ├── routers/
│   │   └── auth.py                        # Obsługa referral_code w register()
│   ├── schemas/
│   │   └── auth.py                        # +pole referral_code w RegisterRequest
│   ├── services/
│   │   └── auth_service.py                # Generowanie kodu w register_user()
│   └── main.py                            # +import + rejestracja referrals.router

frontend/
├── src/
│   ├── schemas/
│   │   └── auth.ts                        # +pole referral_code w RegisterRequestSchema
│   ├── hooks/
│   │   └── useAuth.ts                     # Przekazanie referral_code w register()
│   ├── components/
│   │   ├── auth/
│   │   │   └── RegisterForm.tsx           # +pole kodu polecającego + prop
│   │   └── layout/
│   │       └── Sidebar.tsx                # +element nawigacji "Zaproś nauczycieli"
│   ├── app/
│   │   ├── register/
│   │   │   └── page.tsx                   # +obsługa parametru ?ref= z URL
│   │   └── page.tsx                       # +sekcja rankingu TopReferrersSection
│   └── types/
│       └── index.ts                       # +typy ReferralStats, TopReferrer, etc.
```

---

## 12. Zmiany w dokumentacji

Po implementacji zaktualizować:

| Plik dokumentacji | Zakres zmian |
|-------------------|-------------|
| `documentation/database_documentation.md` | Nowa tabela `referrals`, nowe kolumny w `users`, nowe indeksy, nowe relacje |
| `documentation/backend_documentation.md` | Nowy router `referrals`, nowy serwis `referral_service.py`, nowe schematy `referral.py`, modyfikacja `auth_service.py` |
| `documentation/frontend_documentation.md` | Nowy hook `useReferrals.ts`, nowe komponenty `referrals/`, nowa strona `/referrals`, modyfikacja `RegisterForm`, modyfikacja `Sidebar`, modyfikacja strony publicznej |

---

## Podsumowanie

System poleceń jest funkcjonalnością CRUD-ową bez złożonych integracji. Wpisuje się idealnie w istniejące wzorce architektury EduGen:
- **Backend:** nowy model + router + serwis + schematy (analogicznie do `subjects`, `secret_keys`)
- **Frontend:** nowy hook + komponenty + strona (analogicznie do `settings`, `profile`)
- **Baza:** nowa tabela + kolumny + migracja (analogicznie do `verification_tokens`)

Główne ryzyka (nadużycia, spójność bonusów) są zaadresowane przez walidacje na poziomie serwisu i ograniczenia bazy danych. System jest gotowy do rozszerzenia o powiadomienia e-mail gdy `email_service` zostanie w pełni zintegrowany.
