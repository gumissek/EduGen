# Plan Implementacji: Marketplace Materiałów dla Nauczycieli

> **Dokument techniczny** — wersja 1.0  
> **Data:** 2026-03-15  
> **Autor:** Senior Software Engineer  
> **Status:** Draft  

---

## Spis Treści

1. [Analiza funkcjonalna](#1-analiza-funkcjonalna)
2. [Wpływ na istniejący system](#2-wpływ-na-istniejący-system)
3. [Zmiany w bazie danych](#3-zmiany-w-bazie-danych)
4. [Implementacja backendu](#4-implementacja-backendu)
5. [Implementacja frontendu](#5-implementacja-frontendu)
6. [Struktura plików](#6-struktura-plików)
7. [Potencjalne problemy i ryzyka](#7-potencjalne-problemy-i-ryzyka)
8. [Proponowane usprawnienia](#8-proponowane-usprawnienia)
9. [Fazy implementacji](#9-fazy-implementacji)
10. [Plan testów](#10-plan-testów)

---

## 1. Analiza Funkcjonalna

### 1.1 Cel funkcjonalności

Marketplace umożliwia nauczycielom udostępnianie wygenerowanych materiałów edukacyjnych innym użytkownikom aplikacji. Funkcjonalność rozwiązuje problem izolacji treści — obecnie każdy użytkownik widzi wyłącznie swoje materiały. Nauczyciele w praktyce regularnie wymieniają się materiałami dydaktycznymi, a marketplace digitalizuje i systematyzuje ten proces.

### 1.2 Nowe możliwości

| Możliwość | Opis |
|---|---|
| **Trzy poziomy udostępniania** | Prywatne (domyślne) → Udostępnione linkiem → Publiczne w bibliotece |
| **Biblioteka społeczności** | Przeglądanie i wyszukiwanie publicznych materiałów z filtrami (przedmiot, klasa, temat, typ) |
| **Klonowanie materiałów** | Użytkownik może skopiować cudzy materiał do swoich zasobów i dalej go edytować lub regenerować warianty |
| **System ocen** | Oceny gwiazdkowe (1–5), liczba użyć, liczba pobrań — ranking materiałów |

### 1.3 Model udostępniania — szczegóły

**Poziom 1 — Prywatne (private)**  
Domyślny stan każdego materiału. Zachowuje się identycznie jak obecnie — materiał widzi wyłącznie autor.

**Poziom 2 — Udostępnione linkiem (link_shared)**  
Autor generuje jednorazowy token URL. Każdy, kto posiada link (musi być zalogowanym użytkownikiem), może wyświetlić materiał i skopiować go do swoich zasobów. Token nie wygasa, ale autor może go odwołać.

**Poziom 3 — Publiczne w bibliotece (public)**  
Materiał jest widoczny w bibliotece społeczności. Pojawia się w wynikach wyszukiwania i może być przeglądany, klonowany i oceniany przez wszystkich zalogowanych użytkowników.

### 1.4 Jednostka udostępniania

Udostępniany jest **sfinalizowany dokument** (`documents` + powiązany `prototypes` + `generations`). Materiał w statusie `draft` lub `processing` nie może być udostępniony — wymaga najpierw finalizacji. Udostępnieniu podlega *snapshot* treści (zamrożona kopia HTML, nie referencja na żywo), aby edycje autora nie wpływały na już udostępniony materiał.

---

## 2. Wpływ na Istniejący System

### 2.1 Komponenty wymagające zmian

| Warstwa | Komponent | Rodzaj zmiany |
|---|---|---|
| **Baza danych** | Nowe tabele: `shared_materials`, `material_ratings`, `share_tokens` | Dodanie |
| **Backend — Models** | Nowe modele ORM | Dodanie |
| **Backend — Routers** | Nowy router `marketplace.py` | Dodanie |
| **Backend — Schemas** | Nowe schematy Pydantic | Dodanie |
| **Backend — Services** | Nowy serwis `marketplace_service.py` | Dodanie |
| **Backend — Main** | Rejestracja nowego routera | Modyfikacja (1 linia) |
| **Backend — Models/__init__** | Import nowych modeli | Modyfikacja |
| **Backend — User model** | Relacja do `shared_materials`, `material_ratings` | Modyfikacja |
| **Frontend — Routing** | Nowe trasy: `/marketplace`, `/marketplace/[id]` | Dodanie |
| **Frontend — Components** | Nowy katalog `marketplace/` z komponentami | Dodanie |
| **Frontend — Hooks** | Nowy hook `useMarketplace.ts` | Dodanie |
| **Frontend — Types** | Nowe typy marketplace | Modyfikacja |
| **Frontend — Sidebar** | Nowy link nawigacyjny | Modyfikacja |
| **Frontend — DocumentCard** | Przycisk „Udostępnij" | Modyfikacja |
| **Frontend — Documents page** | Kontrolka udostępniania | Modyfikacja |

### 2.2 Komponenty niezmienione

- Logika generowania AI (`generation_service.py`, `ai_service.py`) — bez zmian
- Logika plików źródłowych (`file_service.py`) — bez zmian
- Autoryzacja JWT (`dependencies.py`) — bez zmian (wykorzystywana bez modyfikacji)
- System backupów — bez zmian (nowe tabele automatycznie objęte pg_dump)
- Curriculum (Podstawa Programowa) — bez zmian
- Konfiguracja Docker/Compose — bez zmian

### 2.3 Integracja z LLM

Marketplace **nie wymaga integracji z LLM**. Funkcjonalność operuje wyłącznie na istniejących, już wygenerowanych materiałach. Klonowanie materiału tworzy kopię lokalną — jeśli użytkownik chce regenerować warianty, korzysta z istniejącego flow generowania (które osobno używa OpenRouter).

---

## 3. Zmiany w Bazie Danych

### 3.1 Nowe tabele

#### `shared_materials`

Tabela przechowująca metadane udostępnionego materiału (snapshot treści z momentu publikacji).

| Kolumna | Typ | Ograniczenia |
|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY |
| `author_id` | VARCHAR(36) | NOT NULL REFERENCES users(id) ON DELETE CASCADE, INDEX |
| `source_document_id` | VARCHAR(36) | NOT NULL REFERENCES documents(id) ON DELETE CASCADE |
| `title` | VARCHAR(500) | NOT NULL |
| `description` | TEXT | NULL |
| `content_snapshot` | TEXT | NOT NULL |
| `answer_key_snapshot` | TEXT | NOT NULL |
| `content_type` | VARCHAR(50) | NOT NULL |
| `education_level` | VARCHAR(255) | NOT NULL |
| `class_level` | VARCHAR(100) | NOT NULL |
| `subject_name` | VARCHAR(255) | NOT NULL |
| `difficulty` | INTEGER | NOT NULL |
| `total_questions` | INTEGER | NOT NULL |
| `visibility` | VARCHAR(20) | NOT NULL DEFAULT 'private' CHECK(visibility IN ('private', 'link_shared', 'public')) |
| `share_token` | VARCHAR(64) | NULL UNIQUE, INDEX |
| `clone_count` | INTEGER | NOT NULL DEFAULT 0 |
| `download_count` | INTEGER | NOT NULL DEFAULT 0 |
| `avg_rating` | FLOAT | NOT NULL DEFAULT 0.0 |
| `rating_count` | INTEGER | NOT NULL DEFAULT 0 |
| `created_at` | TEXT | NOT NULL DEFAULT (ISO 8601) |
| `updated_at` | TEXT | NOT NULL DEFAULT (ISO 8601) |

> **Uwaga:** `content_snapshot` i `answer_key_snapshot` to zamrożone kopie treści z momentu publikacji. Nie są referencjami do `prototypes` — autor może dalej edytować swój oryginalny materiał bez wpływu na wersję publiczną.

> **Uwaga:** `subject_name` jest zdenormalizowaną kopią nazwy przedmiotu (nie FK), ponieważ przedmiot autora może być niestandardowy i niewidoczny dla innych użytkowników.

#### `material_ratings`

Tabela przechowująca oceny materiałów przez użytkowników.

| Kolumna | Typ | Ograniczenia |
|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY |
| `shared_material_id` | VARCHAR(36) | NOT NULL REFERENCES shared_materials(id) ON DELETE CASCADE, INDEX |
| `user_id` | VARCHAR(36) | NOT NULL REFERENCES users(id) ON DELETE CASCADE, INDEX |
| `rating` | INTEGER | NOT NULL CHECK(rating >= 1 AND rating <= 5) |
| `created_at` | TEXT | NOT NULL DEFAULT (ISO 8601) |
| `updated_at` | TEXT | NOT NULL DEFAULT (ISO 8601) |

> UniqueConstraint: `(shared_material_id, user_id)` — jeden użytkownik może ocenić dany materiał tylko raz (update dozwolony).

#### `material_clones`

Tabela trackująca relację klonowania (do analityki i zapobiegania duplikatom).

| Kolumna | Typ | Ograniczenia |
|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY |
| `shared_material_id` | VARCHAR(36) | NOT NULL REFERENCES shared_materials(id) ON DELETE CASCADE, INDEX |
| `cloned_by_user_id` | VARCHAR(36) | NOT NULL REFERENCES users(id) ON DELETE CASCADE, INDEX |
| `cloned_document_id` | VARCHAR(36) | NOT NULL REFERENCES documents(id) ON DELETE CASCADE |
| `created_at` | TEXT | NOT NULL DEFAULT (ISO 8601) |

> UniqueConstraint: `(shared_material_id, cloned_by_user_id)` — użytkownik klonuje dany materiał najwyżej raz (może go usunąć i sklonować ponownie).

### 3.2 Indeksy

```sql
-- Shared materials
CREATE INDEX ix_shared_materials_author ON shared_materials(author_id);
CREATE INDEX ix_shared_materials_visibility ON shared_materials(visibility);
CREATE INDEX ix_shared_materials_content_type ON shared_materials(content_type);
CREATE INDEX ix_shared_materials_education_level ON shared_materials(education_level);
CREATE INDEX ix_shared_materials_subject_name ON shared_materials(subject_name);
CREATE INDEX ix_shared_materials_created_at ON shared_materials(created_at);
CREATE UNIQUE INDEX ix_shared_materials_share_token ON shared_materials(share_token);

-- Composite index for filtered browsing (most common query pattern)
CREATE INDEX ix_shared_materials_browse 
    ON shared_materials(visibility, content_type, education_level, subject_name);

-- Material ratings
CREATE INDEX ix_material_ratings_material ON material_ratings(shared_material_id);
CREATE INDEX ix_material_ratings_user ON material_ratings(user_id);
CREATE UNIQUE INDEX uq_material_ratings_user_material 
    ON material_ratings(shared_material_id, user_id);

-- Material clones
CREATE INDEX ix_material_clones_material ON material_clones(shared_material_id);
CREATE INDEX ix_material_clones_user ON material_clones(cloned_by_user_id);
CREATE UNIQUE INDEX uq_material_clones_user_material 
    ON material_clones(shared_material_id, cloned_by_user_id);
```

### 3.3 Relacje

```
users (1) ──→ (N) shared_materials     [author_id]
users (1) ──→ (N) material_ratings     [user_id]
users (1) ──→ (N) material_clones      [cloned_by_user_id]
documents (1) ──→ (N) shared_materials [source_document_id]
shared_materials (1) ──→ (N) material_ratings
shared_materials (1) ──→ (N) material_clones
documents (1) ──→ (N) material_clones  [cloned_document_id]
```

### 3.4 Migracja Alembic

Plik: `backend/alembic/versions/005_marketplace_tables.py`

```python
"""Add marketplace tables: shared_materials, material_ratings, material_clones

Revision ID: 005
Revises: 004
Create Date: 2026-03-XX
"""
revision = "005"
down_revision = "004"
```

Migracja tworzy trzy tabele z kolumnami, ograniczeniami CHECK, indeksami oraz kluczami obcymi opisanymi powyżej. Operacja `downgrade()` wykonuje `op.drop_table()` w odwrotnej kolejności (clones → ratings → materials).

---

## 4. Implementacja Backendu

### 4.1 Nowe modele ORM

#### `backend/app/models/shared_material.py`

```python
class SharedMaterial(Base):
    __tablename__ = "shared_materials"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    author_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    source_document_id: Mapped[str] = mapped_column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    content_snapshot: Mapped[str] = mapped_column(Text, nullable=False)
    answer_key_snapshot: Mapped[str] = mapped_column(Text, nullable=False)
    content_type: Mapped[str] = mapped_column(String(50), nullable=False)
    education_level: Mapped[str] = mapped_column(String(255), nullable=False)
    class_level: Mapped[str] = mapped_column(String(100), nullable=False)
    subject_name: Mapped[str] = mapped_column(String(255), nullable=False)
    difficulty: Mapped[int] = mapped_column(Integer, nullable=False)
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False)
    visibility: Mapped[str] = mapped_column(String(20), nullable=False, default="private")
    share_token: Mapped[str | None] = mapped_column(String(64), nullable=True, unique=True, index=True)
    clone_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    download_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    avg_rating: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    rating_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Mapped[str] = mapped_column(String, nullable=False, default=lambda: datetime.now(timezone.utc).isoformat())

    # Relationships
    author = relationship("User", back_populates="shared_materials")
    source_document = relationship("Document")
    ratings = relationship("MaterialRating", back_populates="shared_material", cascade="all, delete-orphan")
    clones = relationship("MaterialClone", back_populates="shared_material", cascade="all, delete-orphan")
```

#### `backend/app/models/material_rating.py`

```python
class MaterialRating(Base):
    __tablename__ = "material_ratings"
    __table_args__ = (
        UniqueConstraint("shared_material_id", "user_id", name="uq_material_ratings_user_material"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    shared_material_id: Mapped[str] = mapped_column(String(36), ForeignKey("shared_materials.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Mapped[str] = mapped_column(String, nullable=False, default=lambda: datetime.now(timezone.utc).isoformat())

    shared_material = relationship("SharedMaterial", back_populates="ratings")
    user = relationship("User")
```

#### `backend/app/models/material_clone.py`

```python
class MaterialClone(Base):
    __tablename__ = "material_clones"
    __table_args__ = (
        UniqueConstraint("shared_material_id", "cloned_by_user_id", name="uq_material_clones_user_material"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    shared_material_id: Mapped[str] = mapped_column(String(36), ForeignKey("shared_materials.id", ondelete="CASCADE"), nullable=False, index=True)
    cloned_by_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    cloned_document_id: Mapped[str] = mapped_column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=lambda: datetime.now(timezone.utc).isoformat())

    shared_material = relationship("SharedMaterial", back_populates="clones")
    user = relationship("User")
    cloned_document = relationship("Document")
```

### 4.2 Modyfikacje istniejącego modelu User

W `backend/app/models/user.py` dodać relację:

```python
shared_materials = relationship("SharedMaterial", back_populates="author", cascade="all, delete-orphan")
```

### 4.3 Nowe schematy Pydantic

Plik: `backend/app/schemas/marketplace.py`

```python
# ---------- Request schemas ----------

class ShareMaterialRequest(BaseModel):
    """Publikacja materiału w marketplace."""
    document_id: str
    title: str
    description: Optional[str] = None
    visibility: str = "public"  # 'link_shared' | 'public'

    @field_validator("visibility")
    @classmethod
    def validate_visibility(cls, v: str) -> str:
        allowed = {"link_shared", "public"}
        if v not in allowed:
            raise ValueError(f"Visibility must be one of: {', '.join(sorted(allowed))}")
        return v

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Tytuł jest wymagany")
        if len(v) > 500:
            raise ValueError("Tytuł nie może przekraczać 500 znaków")
        return v


class UpdateSharedMaterialRequest(BaseModel):
    """Aktualizacja metadanych udostępnionego materiału."""
    title: Optional[str] = None
    description: Optional[str] = None
    visibility: Optional[str] = None

    @field_validator("visibility")
    @classmethod
    def validate_visibility(cls, v: str | None) -> str | None:
        if v is not None and v not in {"private", "link_shared", "public"}:
            raise ValueError("Nieprawidłowy poziom widoczności")
        return v


class RateMaterialRequest(BaseModel):
    """Ocena materiału."""
    rating: int

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v: int) -> int:
        if v < 1 or v > 5:
            raise ValueError("Ocena musi być między 1 a 5")
        return v


class MarketplaceBrowseParams(BaseModel):
    """Parametry filtrowania biblioteki."""
    content_type: Optional[str] = None
    education_level: Optional[str] = None
    class_level: Optional[str] = None
    subject_name: Optional[str] = None
    search_query: Optional[str] = None
    sort_by: str = "newest"  # 'newest' | 'top_rated' | 'most_cloned'
    page: int = 1
    per_page: int = 20


# ---------- Response schemas ----------

class AuthorInfo(BaseModel):
    """Publiczne informacje o autorze."""
    id: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None

    class Config:
        from_attributes = True


class SharedMaterialResponse(BaseModel):
    """Odpowiedź z danymi udostępnionego materiału."""
    id: str
    author: AuthorInfo
    title: str
    description: Optional[str] = None
    content_type: str
    education_level: str
    class_level: str
    subject_name: str
    difficulty: int
    total_questions: int
    visibility: str
    share_token: Optional[str] = None
    clone_count: int
    download_count: int
    avg_rating: float
    rating_count: int
    created_at: str
    updated_at: str
    # Only for detail view
    content_snapshot: Optional[str] = None
    answer_key_snapshot: Optional[str] = None
    # User-specific
    user_rating: Optional[int] = None
    is_cloned: bool = False

    class Config:
        from_attributes = True


class SharedMaterialListResponse(BaseModel):
    """Odpowiedź z listą materiałów i paginacją."""
    materials: list[SharedMaterialResponse]
    total: int
    page: int
    per_page: int


class ShareLinkResponse(BaseModel):
    """Odpowiedź z wygenerowanym linkiem do udostępniania."""
    share_url: str
    share_token: str
```

### 4.4 Nowy serwis — `marketplace_service.py`

Plik: `backend/app/services/marketplace_service.py`

#### Główne metody

```python
def share_material(db, user_id, document_id, title, description, visibility) -> SharedMaterial:
    """
    Tworzy udostępnienie materiału:
    1. Weryfikuje, że document należy do user_id i jest sfinalizowany
    2. Pobiera powiązane Generation + Prototype (content, answer_key)
    3. Pobiera Subject.name (denormalizacja)
    4. Tworzy snapshot treści (zamrożona kopia HTML)
    5. Jeśli visibility == 'link_shared', generuje share_token (secrets.token_urlsafe(32))
    6. Zapisuje SharedMaterial do DB
    """

def update_shared_material(db, user_id, shared_material_id, updates) -> SharedMaterial:
    """
    Aktualizuje metadane (title, description, visibility).
    Tylko autor może modyfikować.
    Przy zmianie na 'link_shared' generuje token jeśli brak.
    Przy zmianie na 'private' czyści share_token.
    """

def delete_shared_material(db, user_id, shared_material_id) -> None:
    """
    Usuwa udostępnienie (hard delete).
    Nie usuwa oryginalnego dokumentu autora.
    Tylko autor może usunąć.
    """

def browse_materials(db, user_id, filters: MarketplaceBrowseParams) -> tuple[list, int]:
    """
    Zwraca publiczne materiały z filtrami, sortowaniem i paginacją.
    Wyklucza materiały autora z wyników (autor widzi swoje w oddzielnym widoku).
    Wzbogaca o: user_rating (jeśli zalogowany), is_cloned.
    Sortowanie: newest (created_at DESC), top_rated (avg_rating DESC), 
                most_cloned (clone_count DESC).
    Wyszukiwanie: ILIKE na title, description, subject_name.
    """

def get_material_detail(db, user_id, shared_material_id) -> SharedMaterial:
    """
    Szczegóły materiału z content_snapshot i answer_key_snapshot.
    Dostępne jeśli: visibility='public' LUB autor LUB materiał 'link_shared'.
    """

def get_material_by_token(db, user_id, share_token) -> SharedMaterial:
    """
    Pobiera materiał po share_token (dostęp przez link).
    Weryfikuje, że visibility != 'private'.
    """

def clone_material(db, user_id, shared_material_id) -> Document:
    """
    Klonuje materiał do zasobów użytkownika:
    1. Tworzy nowy Generation z metadanymi snapshotowymi
    2. Tworzy nowy Prototype z content_snapshot
    3. Tworzy nowy Document wskazujący na nowe Generation
    4. Tworzy rekord MaterialClone (tracking)
    5. Inkrementuje shared_material.clone_count (UPDATE atomowy)
    Użytkownik nie może klonować własnego materiału.
    """

def rate_material(db, user_id, shared_material_id, rating) -> None:
    """
    Dodaje/aktualizuje ocenę materiału:
    1. Sprawdza, czy użytkownik nie jest autorem (autor nie ocenia swoich)
    2. Upsert MaterialRating (INSERT ON CONFLICT UPDATE)
    3. Przelicza avg_rating i rating_count na SharedMaterial (agregacja)
    """

def get_my_shared_materials(db, user_id) -> list[SharedMaterial]:
    """
    Zwraca materiały udostępnione przez zalogowanego użytkownika
    (wszystkie widoczności, z sortowaniem po dacie utworzenia).
    """

def increment_download_count(db, shared_material_id) -> None:
    """
    Atomowy inkrement download_count (UPDATE ... SET download_count = download_count + 1).
    Wywoływany przy pobraniu DOCX klonowanego materiału.
    """

def refresh_content_snapshot(db, user_id, shared_material_id) -> SharedMaterial:
    """
    Aktualizuje snapshot treści najnowszą wersją z oryginalnego prototypu.
    Tylko autor może odświeżyć. Pozwala na propagację poprawek.
    """
```

### 4.5 Nowy router — `marketplace.py`

Plik: `backend/app/routers/marketplace.py`

Prefix: `/api/marketplace`

| Metoda | Endpoint | Opis | Auth |
|---|---|---|---|
| `POST` | `/share` | Udostępnij materiał | Zalogowany |
| `GET` | `/browse` | Przeglądaj bibliotekę (publiczne) | Zalogowany |
| `GET` | `/my` | Moje udostępnione materiały | Zalogowany |
| `GET` | `/{material_id}` | Szczegóły materiału | Zalogowany |
| `GET` | `/shared/{share_token}` | Dostęp przez link | Zalogowany |
| `PUT` | `/{material_id}` | Aktualizuj metadane | Autor |
| `DELETE` | `/{material_id}` | Usuń udostępnienie | Autor |
| `POST` | `/{material_id}/clone` | Klonuj materiał | Zalogowany (nie autor) |
| `POST` | `/{material_id}/rate` | Oceń materiał | Zalogowany (nie autor) |
| `POST` | `/{material_id}/refresh-snapshot` | Odśwież snapshot | Autor |

#### Kontrakty request/response

**`POST /api/marketplace/share`**
```
Request:  ShareMaterialRequest { document_id, title, description?, visibility }
Response: SharedMaterialResponse (201 Created)
Errors:   404 (document not found), 400 (document not finalized), 
          409 (already shared)
```

**`GET /api/marketplace/browse`**
```
Query:    content_type?, education_level?, class_level?, subject_name?, 
          search_query?, sort_by=newest, page=1, per_page=20
Response: SharedMaterialListResponse { materials[], total, page, per_page }
```

**`GET /api/marketplace/{material_id}`**
```
Response: SharedMaterialResponse (with content_snapshot, answer_key_snapshot)
Errors:   404, 403 (private material, not author)
```

**`GET /api/marketplace/shared/{share_token}`**
```
Response: SharedMaterialResponse (with content_snapshot)
Errors:   404 (invalid/expired token)
```

**`POST /api/marketplace/{material_id}/clone`**
```
Response: { document_id: str, generation_id: str, message: str } (201)
Errors:   404, 403 (cannot clone own material), 
          409 (already cloned)
```

**`POST /api/marketplace/{material_id}/rate`**
```
Request:  RateMaterialRequest { rating: 1-5 }
Response: { avg_rating: float, rating_count: int, user_rating: int }
Errors:   404, 403 (cannot rate own material)
```

**`PUT /api/marketplace/{material_id}`**
```
Request:  UpdateSharedMaterialRequest { title?, description?, visibility? }
Response: SharedMaterialResponse
Errors:   404, 403 (not author)
```

**`DELETE /api/marketplace/{material_id}`**
```
Response: 204 No Content
Errors:   404, 403 (not author)
```

### 4.6 Modyfikacja `main.py`

Dodać import i rejestrację routera:

```python
from app.routers import marketplace
app.include_router(marketplace.router, prefix="/api")
```

### 4.7 Walidacja i autoryzacja

Każdy endpoint marketplace wymaga `get_current_user()` (zalogowany użytkownik). Dodatkowe reguły:

- **Właścicielstwo:** Operacje PUT/DELETE na `shared_materials` wymagają `author_id == current_user.id`.
- **Zakaz auto-interakcji:** Użytkownik nie może klonować ani oceniać własnych materiałów.
- **Widoczność:** Browse zwraca wyłącznie `visibility='public'`. Endpoint `/{material_id}` weryfikuje, czy użytkownik ma prawo dostępu (autor lub materiał publiczny/link_shared).
- **Status dokumentu:** Udostępnić można wyłącznie dokument w statusie `finalized` lub `ready`.

---

## 5. Implementacja Frontendu

### 5.1 Nowe trasy (App Router)

```
src/app/(authenticated)/marketplace/
├── page.tsx                    # Biblioteka społeczności — browse
├── my/
│   └── page.tsx                # Moje udostępnione materiały
└── [id]/
    └── page.tsx                # Szczegóły materiału
```

Dodać także obsługę share_token na trasie publicznej o ile chcemy umożliwić dostęp niezalogowanym — w MVP share link wymaga zalogowania, więc trasa w `(authenticated)`:

```
src/app/(authenticated)/marketplace/shared/
└── [token]/
    └── page.tsx                # Podgląd materiału przez link
```

### 5.2 Nowy hook — `useMarketplace.ts`

Plik: `frontend/src/hooks/useMarketplace.ts`

```typescript
// Queries
useMarketplaceBrowse(filters)     // GET /api/marketplace/browse — paginated, filtered
useMarketplaceMaterial(id)        // GET /api/marketplace/{id} — detail
useMySharedMaterials()            // GET /api/marketplace/my — author's materials
useSharedByToken(token)           // GET /api/marketplace/shared/{token}

// Mutations
useShareMaterial()                // POST /api/marketplace/share
useUpdateSharedMaterial()         // PUT /api/marketplace/{id}
useDeleteSharedMaterial()         // DELETE /api/marketplace/{id}
useCloneMaterial()                // POST /api/marketplace/{id}/clone
useRateMaterial()                 // POST /api/marketplace/{id}/rate
useRefreshSnapshot()              // POST /api/marketplace/{id}/refresh-snapshot
```

Wzorce:
- `queryKey`: `['marketplace', 'browse', filtersHash]`, `['marketplace', 'material', id]`, `['marketplace', 'my']`
- Cache invalidation po mutacjach: `invalidateQueries({ queryKey: ['marketplace'] })`
- Snackbar notifications na sukces/błąd (wzorzec z `useDocuments`)

### 5.3 Nowe typy

W `frontend/src/types/index.ts` dodać:

```typescript
export type MaterialVisibility = 'private' | 'link_shared' | 'public';

export interface SharedMaterial {
  id: string;
  author: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  };
  title: string;
  description: string | null;
  content_type: ContentType;
  education_level: string;
  class_level: string;
  subject_name: string;
  difficulty: number;
  total_questions: number;
  visibility: MaterialVisibility;
  share_token: string | null;
  clone_count: number;
  download_count: number;
  avg_rating: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
  content_snapshot?: string;
  answer_key_snapshot?: string;
  user_rating?: number | null;
  is_cloned: boolean;
}

export interface SharedMaterialListResponse {
  materials: SharedMaterial[];
  total: number;
  page: number;
  per_page: number;
}
```

### 5.4 Nowe stałe

W `frontend/src/lib/constants.ts` dodać:

```typescript
export const MARKETPLACE_SORT_OPTIONS = [
  { value: 'newest', label: 'Najnowsze' },
  { value: 'top_rated', label: 'Najlepiej oceniane' },
  { value: 'most_cloned', label: 'Najpopularniejsze' },
] as const;

export const MARKETPLACE_PER_PAGE = 20;
```

### 5.5 Nowe komponenty

#### `frontend/src/components/marketplace/`

```
marketplace/
├── MarketplaceFilters.tsx          # Panel filtrów (przedmiot, typ, poziom, sortowanie)
├── MaterialCard.tsx                # Karta materiału w liście (tytuł, autor, ocena, chipy)
├── MaterialDetailView.tsx          # Widok szczegółowy z podglądem treści
├── MaterialRating.tsx              # Komponent gwiazdek z interakcją
├── ShareMaterialDialog.tsx         # Dialog udostępniania materiału
├── ShareLinkDialog.tsx             # Dialog z linkiem do kopiowania
└── MySharedMaterialsList.tsx       # Lista materiałów autora z akcjami
```

#### `MarketplaceFilters.tsx`
- Row z Autocomplete/Select: content_type, education_level, class_level, subject_name
- TextField na wyszukiwanie tekstowe (debounced, 300ms)
- Select na sortowanie
- Przycisk "Wyczyść filtry"
- Wartości filtrów z `CONTENT_TYPES`, `EDUCATION_LEVELS` z `constants.ts`
- Stan filtrów trzymany w URL query params (shallow routing) — umożliwia linkowanie do filtrowanych wyników

#### `MaterialCard.tsx`
- `Card` z `variant="outlined"` (wzorzec z `DocumentCard`)
- Sekcje: tytuł (max 2 linie, truncation), autor (imię + nazwisko lub "Anonim"), chipy (typ, przedmiot, klasa), gwiazdki (read-only), statystyki (klony, pobrania)
- Hover effect: border + shadow + translate (istniejący wzorzec)
- Click → nawigacja do `/marketplace/{id}`
- Responsywny grid: 3 kolumny (md), 2 (sm), 1 (xs)

#### `MaterialDetailView.tsx`
- Nagłówek: tytuł, autor, data, chipy metadanych
- Podgląd treści: renderuje `content_snapshot` jako HTML (read-only, bez edycji)
- Sidebar (lub sekcja poniżej na mobile): statystyki, ocena interaktywna, przycisk „Klonuj do moich materiałów"
- Jeśli `is_cloned=true`: przycisk zmienia się na „Już sklonowane" (disabled)
- Jeśli użytkownik jest autorem: zamiast klonowania/oceniania — przyciski edycji metadanych, zmiany widoczności, usunięcia

#### `MaterialRating.tsx`
- 5 gwiazdek (MUI `Rating` component)
- Read-only w liście, interaktywny w widoku szczegółów
- Wyświetlanie: gwiazdki + liczba ocen w nawiasie
- Po kliknięciu: mutacja `rate` → aktualizacja avg_rating w UI (optymistic update)

#### `ShareMaterialDialog.tsx`
- Dialog (MUI `Dialog`) otwierany z widoku dokumentu
- Formularz: tytuł (pre-filled z nazwy dokumentu), opis (opcjonalny textarea), widoczność (radio: "Publiczny w bibliotece" / "Udostępniony linkiem")
- Przycisk „Udostępnij" → mutacja → toast sukcesu
- Walidacja: tytuł wymagany, max 500 znaków

#### `ShareLinkDialog.tsx`
- Dialog z polem tekstowym (read-only) zawierającym link
- Przycisk „Kopiuj link" (`navigator.clipboard.writeText()`)
- Informacja: „Każdy zalogowany użytkownik z tym linkiem może wyświetlić i skopiować materiał"

#### `MySharedMaterialsList.tsx`
- Tabela lub lista kart przedstawiająca materiały udostępnione przez zalogowanego użytkownika
- Kolumny: tytuł, widoczność (chip z kolorem), statystyki (ocena, klony, pobrania), data
- Akcje: edytuj metadane, zmień widoczność, kopiuj link (tylko dla `link_shared`), usuń, odśwież snapshot
- Pusta lista: `EmptyState` z CTA do udostępnienia pierwszego materiału

### 5.6 Modyfikacje istniejących komponentów

#### Sidebar (`frontend/src/components/layout/Sidebar.tsx`)

Dodać nowy link nawigacyjny w tablicy `menuItems`:

```typescript
{ 
  label: 'Marketplace', 
  path: '/marketplace', 
  icon: <StorefrontIcon /> 
}
```

Umieścić pomiędzy „Materiały" a „Przedmioty i Pliki".

#### Dashboard / Documents

W widoku dokumentu (lub liście dokumentów) dodać przycisk/ikonę „Udostępnij w marketplace" otwierający `ShareMaterialDialog`. Przycisk widoczny wyłącznie dla dokumentów ze statusem `finalized` lub `ready`.

W `DocumentCard.tsx` dodać opcjonalny przycisk `ShareIcon` w `CardActions` (obok Copy i Delete) — triggering `ShareMaterialDialog`.

### 5.7 Nowe schematy Zod (frontend)

Plik: `frontend/src/schemas/marketplace.ts`

```typescript
export const shareMaterialSchema = z.object({
  document_id: z.string().min(1, "Dokument jest wymagany"),
  title: z.string().min(1, "Tytuł jest wymagany").max(500, "Maks. 500 znaków"),
  description: z.string().max(2000, "Maks. 2000 znaków").optional().or(z.literal("")),
  visibility: z.enum(["link_shared", "public"]),
});
```

### 5.8 Flow użytkownika

#### Flow 1: Udostępnianie materiału

```
Dashboard → Karta dokumentu → Klik „Udostępnij" 
  → ShareMaterialDialog (tytuł, opis, widoczność)
  → POST /api/marketplace/share
  → Sukces: toast + (opcjonalnie) ShareLinkDialog z linkiem
```

#### Flow 2: Przeglądanie marketplace

```
Sidebar → „Marketplace"
  → /marketplace (browse)
  → Filtry (typ, przedmiot, klasa) + wyszukiwanie
  → Grid kart MaterialCard
  → Klik na kartę → /marketplace/{id}
  → MaterialDetailView (podgląd treści, ocena, klonowanie)
```

#### Flow 3: Klonowanie materiału

```
/marketplace/{id} → Klik „Klonuj do moich materiałów"
  → POST /api/marketplace/{id}/clone
  → Sukces: toast + nawigacja do /dashboard (do nowego dokumentu)
```

#### Flow 4: Dostęp przez link

```
Inny nauczyciel otrzymuje link → /marketplace/shared/{token}
  → Wyświetlenie podglądu materiału
  → Opcja klonowania
```

#### Flow 5: Zarządzanie udostępnieniami

```
Sidebar → „Marketplace" → Zakładka „Moje udostępnione" (lub /marketplace/my)
  → Lista materiałów z akcjami (edycja, usunięcie, zmiana widoczności)
```

---

## 6. Struktura Plików

### 6.1 Backend — nowe pliki

```
backend/
├── app/
│   ├── models/
│   │   ├── shared_material.py        # Model SharedMaterial
│   │   ├── material_rating.py        # Model MaterialRating
│   │   └── material_clone.py         # Model MaterialClone
│   ├── routers/
│   │   └── marketplace.py            # Router marketplace
│   ├── schemas/
│   │   └── marketplace.py            # Schematy Pydantic marketplace
│   └── services/
│       └── marketplace_service.py    # Logika biznesowa marketplace
├── alembic/
│   └── versions/
│       └── 005_marketplace_tables.py # Migracja Alembic
```

### 6.2 Backend — modyfikowane pliki

```
backend/app/models/__init__.py        # Import nowych modeli + __all__
backend/app/models/user.py            # Relacja shared_materials
backend/app/main.py                   # Rejestracja routera marketplace
```

### 6.3 Frontend — nowe pliki

```
frontend/
├── src/
│   ├── app/(authenticated)/marketplace/
│   │   ├── page.tsx                            # Browse (biblioteka)
│   │   ├── my/
│   │   │   └── page.tsx                        # Moje udostępnione
│   │   ├── [id]/
│   │   │   └── page.tsx                        # Szczegóły materiału
│   │   └── shared/
│   │       └── [token]/
│   │           └── page.tsx                    # Dostęp przez link
│   ├── components/marketplace/
│   │   ├── MarketplaceFilters.tsx
│   │   ├── MaterialCard.tsx
│   │   ├── MaterialDetailView.tsx
│   │   ├── MaterialRating.tsx
│   │   ├── ShareMaterialDialog.tsx
│   │   ├── ShareLinkDialog.tsx
│   │   └── MySharedMaterialsList.tsx
│   ├── hooks/
│   │   └── useMarketplace.ts
│   └── schemas/
│       └── marketplace.ts
```

### 6.4 Frontend — modyfikowane pliki

```
frontend/src/types/index.ts                     # Nowe typy
frontend/src/lib/constants.ts                   # Nowe stałe
frontend/src/components/layout/Sidebar.tsx       # Nowy link nawigacyjny
frontend/src/components/documents/DocumentCard.tsx  # Przycisk „Udostępnij"
```

### 6.5 Dokumentacja — nowe/modyfikowane pliki

```
documentation/
├── database_documentation.md                    # Nowe tabele i relacje
├── backend_documentation.md                     # Nowy router i serwis
├── frontend_documentation.md                    # Nowe trasy i komponenty
└── modules/
    └── marketplace_module_documentation.md      # Pełna dokumentacja modułu
```

---

## 7. Potencjalne Problemy i Ryzyka

### 7.1 Wydajność

| Problem | Wpływ | Mitygacja |
|---|---|---|
| **Wyszukiwanie ILIKE bez indeksu** | Wolne zapytania LIKE '%text%' przy wielu materiałach | Użyć `pg_trgm` + GIN index na `title` i `description` dla trygramowego wyszukiwania |
| **Obliczanie avg_rating per-query** | Kosztowne joiny/subquery | Denormalizacja: `avg_rating` i `rating_count` przechowywane na `shared_materials`, aktualizowane przy każdej ocenie |
| **Duże snapshoty HTML** | Rozmiar tabeli `shared_materials` rośnie z content_snapshot | Akceptowalne — TEXT w PostgreSQL efektywnie przechowuje compressowalne HTML. Monitorować rozmiar tabeli |
| **N+1 queries** | Wzbogacanie listy o `user_rating` i `is_cloned` | Użyć subquery / LEFT JOIN zamiast iteracji per materiał |

### 7.2 Spójność danych

| Problem | Wpływ | Mitygacja |
|---|---|---|
| **clone_count desynchronizacja** | Użytkownik usuwa sklonowany dokument, ale `clone_count` nie maleje | Akceptowalne — `clone_count` śledzi liczbę klonowań historycznie, nie bieżącą. Alternatywnie: trigger ON DELETE na `material_clones` |
| **Usunięcie oryginalnego dokumentu** | `source_document_id` FK CASCADE usunie `shared_material` | To poprawne zachowanie — jeśli autor usuwa dokument źródłowy, udostępnienie traci sens. Dokumentacja powinna o tym informować użytkownika |
| **Zmiana oryginalnej treści** | Edycja prototypu rozkalibruje snapshot | Snapshot jest zamrożony. Autor może ręcznie wywołać „Odśwież snapshot", aby zaktualizować |

### 7.3 Bezpieczeństwo

| Problem | Wpływ | Mitygacja |
|---|---|---|
| **Enumeration share tokens** | Atakujący próbuje odgadnąć tokeny | `secrets.token_urlsafe(32)` daje 256 bitów entropii — brute-force niepraktyczny |
| **XSS w content_snapshot** | Złośliwy HTML w treści widocznej publicznie | Treść renderowana w `dangerouslySetInnerHTML` musi przejść sanityzację (DOMPurify). **Krytyczne** — dodać sanityzację po stronie backendu (bleach) i frontendu (DOMPurify) |
| **Spam / abuse** | Masowe udostępnianie niskiej jakości | Rate limiting na POST endpoint (np. max 10 udostępnień/dzień/użytkownik). Opcjonalnie: moderacja w panelu admina |
| **Rating manipulation** | Użytkownik tworzy konta do zawyżania ocen | UniqueConstraint na (user, material) zapobiega wielokrotnym ocenom. Dodatkowa ochrona: wymagać `is_email_verified=True` do oceniania |

### 7.4 Architektura

| Problem | Wpływ | Mitygacja |
|---|---|---|
| **Coupling z istniejącymi tabelami** | FK na `documents.id` — zmiany w documents mogą wpłynąć na marketplace | Minimalne ryzyko — FK z CASCADE poprawnie obsługuje usuwanie. Snapshot denormalizuje dane |
| **Brak wyszukiwania pełnotekstowego** | ILIKE jest ograniczone vs. full-text search | Na start ILIKE z `pg_trgm` jest wystarczające. W przyszłości rozważyć PostgreSQL `tsvector` lub integrację z Elasticsearch/Meilisearch |
| **Prywatność autora** | Imię i nazwisko widoczne publicznie | Używać danych z `User.first_name` / `User.last_name` — jeśli null, wyświetlać „Anonim" |

### 7.5 Edge cases

- Materiał publiczny, którego autor jest dezaktywowany (`is_active=False`) — nadal widoczny w marketplace? **Decyzja:** Filtrować po `User.is_active=True` w browse query.
- Użytkownik próbuje udostępnić ten sam dokument dwa razy — **Decyzja:** Zablokować z 409 Conflict (sprawdzenie `source_document_id` + `author_id`).
- Użytkownik klonuje materiał, a potem oryginał zostaje usunięty — **Decyzja:** Klon jest niezależny (snapshot), działa normalnie.
- Bardzo długi opis (>2000 znaków) — **Decyzja:** Walidacja na schemacie Pydantic + Zod (max 2000 znaków).

---

## 8. Proponowane Usprawnienia

### 8.1 Architektoniczne

1. **Indeks trygramowy zamiast ILIKE** — dodać rozszerzenie PostgreSQL `pg_trgm` i GIN index na `shared_materials.title` oraz `shared_materials.description`. Znacznie przyspiesza wyszukiwanie `%partial%`.

2. **Sanityzacja HTML na backendzie** — dodać `bleach` lub `nh3` do pipeline wstawiania `content_snapshot`, aby strona serwera gwarantowała czystość HTML niezależnie od klienta. Whitelist dozwolonych tagów: `<h1>-<h6>`, `<p>`, `<ul>`, `<ol>`, `<li>`, `<strong>`, `<em>`, `<table>`, `<tr>`, `<td>`, `<th>`, `<br>`.

3. **Cachowanie listy browse w Redis/pamięci** — w przyszłości, jeśli browse stanie się wąskim gardłem, dodać krótkotrwały cache (TTL 60s) na najpopularniejsze zapytania filtrowania. Na start zbędne.

### 8.2 Lepsze modelowanie danych

4. **Oddzielenie snapshotów od metadanych** — rozważyć osobną tabelę `material_snapshots(id, shared_material_id, content_snapshot, answer_key_snapshot, snapshot_version, created_at)`. Pozwoliłoby to na wersjonowanie snapshotów bez zmiany głównego rekordu. **Rekomendacja:** Odłożone na etap 2, na start single snapshot na `shared_materials` jest prostszy i wystarczający.

5. **Tagowanie materiałów** — zamiast polegać wyłącznie na `content_type` i `subject_name`, dodać tablicę tagów (wiele-do-wielu), pozwalającą na elastyczniejsze filtrowanie. **Rekomendacja:** Odłożone na etap 2.

### 8.3 Reusable components

6. **Współdzielony CardBase** — `MaterialCard` i `DocumentCard` mają podobny wzorzec (hover, truncate, chipy). Rozważyć wyekstrahowanie wspólnego `BaseCard` component. **Rekomendacja:** Po implementacji marketplace, jeśli wzorzec się potwierdzi, refaktoryzować.

7. **StarRating** — komponent `MaterialRating` opakować jako reusable `StarRating` w `components/ui/` — może być przydatny w przyszłych funkcjach.

### 8.4 UX

8. **Tabela zamiast kart na liście "Moje udostępnione"** — tabela (MUI DataGrid/Table) jest efektywniejsza do zarządzania własnymi materiałami, podczas gdy karty są lepsze do przeglądania (browse).

9. **Preview modal** — w browse, zamiast nawigacji do oddzielnej strony, umożliwić podgląd treści materiału w modalu (MUI Dialog fullscreen). Zmniejsza opuszczanie kontekstu.

---

## 9. Fazy Implementacji

### Faza 1: Baza danych i modele (backend)

**Priorytet:** Krytyczny  
**Zależności:** Brak

1. Stworzyć modele ORM: `SharedMaterial`, `MaterialRating`, `MaterialClone`
2. Dodać relację `shared_materials` do modelu `User`
3. Zaktualizować `models/__init__.py` (importy + `__all__`)
4. Stworzyć migrację Alembic `005_marketplace_tables.py`
5. Przetestować migrację (upgrade + downgrade)

### Faza 2: Serwis i logika biznesowa (backend)

**Priorytet:** Krytyczny  
**Zależności:** Faza 1

1. Zaimplementować `marketplace_service.py` — metody: `share_material`, `get_material_detail`, `browse_materials`, `clone_material`, `rate_material`
2. Zaimplementować sanityzację HTML na `content_snapshot` (bleach/nh3)
3. Dodać schematy Pydantic (`schemas/marketplace.py`)
4. Napisać testy jednostkowe serwisu

### Faza 3: Endpointy API (backend)

**Priorytet:** Krytyczny  
**Zależności:** Faza 2

1. Stworzyć `routers/marketplace.py` z endpointami
2. Zarejestrować router w `main.py`
3. Przetestować endpointy (pytest — mock service, integracja z DB)
4. Zweryfikować autoryzację i walidację

### Faza 4: Typy, hook, stałe (frontend)

**Priorytet:** Krytyczny  
**Zależności:** Faza 3

1. Dodać typy do `types/index.ts`
2. Dodać stałe do `constants.ts`
3. Stworzyć schemat Zod `schemas/marketplace.ts`
4. Zaimplementować hook `useMarketplace.ts`

### Faza 5: Komponenty marketplace (frontend)

**Priorytet:** Wysoki  
**Zależności:** Faza 4

1. **MaterialCard** — karta materiału
2. **MaterialRating** — gwiazdki
3. **MarketplaceFilters** — panel filtrów
4. **MaterialDetailView** — widok szczegółowy
5. **ShareMaterialDialog** — dialog udostępniania
6. **ShareLinkDialog** — dialog z linkiem
7. **MySharedMaterialsList** — zarządzanie własnymi udostępnieniami

### Faza 6: Strony i routing (frontend)

**Priorytet:** Wysoki  
**Zależności:** Faza 5

1. `/marketplace` (browse page) — integracja filtrów + grid kart + paginacja
2. `/marketplace/[id]` (detail page) — detail view + ocenianie + klonowanie
3. `/marketplace/my` — zarządzanie udostępnieniami
4. `/marketplace/shared/[token]` — podgląd przez link
5. Dodać link w `Sidebar.tsx`
6. Dodać przycisk „Udostępnij" w `DocumentCard.tsx`

### Faza 7: Testy i polish

**Priorytet:** Wysoki  
**Zależności:** Faza 6

1. Testy E2E (Playwright): pełny flow udostępniania → przeglądania → klonowania
2. Testy E2E: ocenianie i wyszukiwanie
3. Responsywność (mobile, tablet)
4. Dostępność (ARIA: `aria-label` na gwiazdkach, `aria-live` na toast messages)
5. Aktualizacja dokumentacji

### Diagram zależności

```
Faza 1 ──→ Faza 2 ──→ Faza 3 ──→ Faza 4 ──→ Faza 5 ──→ Faza 6 ──→ Faza 7
(DB)       (Service)   (API)      (Types)    (UI)       (Pages)    (Tests)
```

---

## 10. Plan Testów

### 10.1 Testy jednostkowe (pytest)

Plik: `backend/tests/test_marketplace_service.py`

| Test | Opis |
|---|---|
| `test_share_material_success` | Udostępnienie materiału z poprawnym dokumentem |
| `test_share_material_not_finalized` | Odmowa udostępnienia dokumentu w statusie draft |
| `test_share_material_not_owner` | Odmowa udostępnienia cudzego dokumentu |
| `test_share_material_duplicate` | 409 przy ponownym udostępnieniu tego samego dokumentu |
| `test_browse_returns_only_public` | Browse zwraca wyłącznie visibility=public |
| `test_browse_excludes_own_materials` | Browse wyklucza materiały autora |
| `test_browse_filters` | Filtrowanie: content_type, education_level, subject_name |
| `test_browse_sorting` | Sortowanie: newest, top_rated, most_cloned |
| `test_browse_pagination` | Poprawna paginacja (page, per_page, total) |
| `test_browse_search_query` | Wyszukiwanie ILIKE w title i description |
| `test_clone_material_success` | Klonowanie tworzy nowy dokument + generation + prototype |
| `test_clone_own_material_forbidden` | Odmowa klonowania własnego materiału |
| `test_clone_material_duplicate` | 409 przy ponownym klonowaniu |
| `test_rate_material_success` | Ocena aktualizuje avg_rating i rating_count |
| `test_rate_material_update` | Zmiana oceny przelicza średnią |
| `test_rate_own_material_forbidden` | Odmowa oceny własnego materiału |
| `test_update_visibility_generates_token` | Zmiana na link_shared generuje share_token |
| `test_update_visibility_clears_token` | Zmiana na private czyści share_token |
| `test_delete_shared_material` | Usunięcie udostępnienia nie usuwa oryginalnego dokumentu |
| `test_access_by_share_token` | Dostęp przez token działa dla link_shared |
| `test_access_by_token_private` | Token prywatnego materiału zwraca 404 |
| `test_deactivated_author_hidden` | Browse pomija materiały dezaktywowanych użytkowników |
| `test_refresh_snapshot` | Odświeżenie snapshotu pobiera najnowszą treść z prototypu |

Plik: `backend/tests/test_marketplace_router.py`

| Test | Opis |
|---|---|
| `test_share_endpoint_201` | POST /share zwraca 201 z poprawnym body |
| `test_share_endpoint_401` | POST /share bez tokena JWT zwraca 401 |
| `test_browse_endpoint_200` | GET /browse zwraca 200 z listą |
| `test_browse_endpoint_query_params` | GET /browse z filtrami zwraca odfiltrowane wyniki |
| `test_detail_endpoint_200` | GET /{id} z publicznym materiałem zwraca 200 |
| `test_detail_endpoint_403` | GET /{id} z prywatnym materiałem (nie autor) zwraca 403 |
| `test_clone_endpoint_201` | POST /{id}/clone zwraca 201 |
| `test_rate_endpoint_200` | POST /{id}/rate zwraca zaktualizowane statystyki |
| `test_update_endpoint_403` | PUT /{id} przez nie-autora zwraca 403 |
| `test_delete_endpoint_204` | DELETE /{id} przez autora zwraca 204 |

### 10.2 Testy jednostkowe frontend (vitest)

Plik: `frontend/src/__tests__/useMarketplace.test.ts`

| Test | Opis |
|---|---|
| `test_browse_query_fetches_data` | Hook poprawnie fetchuje i parsuje listę materiałów |
| `test_share_mutation_invalidates_cache` | Mutacja share invaliduje ['marketplace'] |
| `test_clone_mutation_success` | Mutacja clone wywołuje POST i zwraca nowy document_id |
| `test_rate_mutation_optimistic_update` | Ocena natychmiast aktualizuje UI (optymistic) |

Plik: `frontend/src/__tests__/MarketplaceFilters.test.tsx`

| Test | Opis |
|---|---|
| `test_filter_change_triggers_callback` | Zmiana filtra wywołuje onChange z nowym stanem |
| `test_clear_filters_resets_state` | Przycisk „Wyczyść" resetuje wszystkie filtry |

Plik: `frontend/src/__tests__/MaterialCard.test.tsx`

| Test | Opis |
|---|---|
| `test_renders_title_and_author` | Karta wyświetla tytuł i autora |
| `test_displays_rating_stars` | Gwiazdki odpowiadają avg_rating |
| `test_click_navigates_to_detail` | Kliknięcie na kartę naviguje do /marketplace/{id} |

### 10.3 Testy E2E (Playwright)

Plik: `frontend/e2e/marketplace.spec.ts`

| Test | Opis |
|---|---|
| `test_full_share_flow` | Zaloguj → utwórz materiał → finalizuj → udostępnij → zweryfikuj w marketplace |
| `test_browse_and_clone_flow` | Zaloguj jako inny użytkownik → przeglądaj → filtruj → sklonuj → zweryfikuj w moich dokumentach |
| `test_rate_material_flow` | Źródłowy użytkownik udostępnia → inny ocenia → średnia się aktualizuje |
| `test_share_link_flow` | Udostępnij linkiem → skopiuj URL → otwórz w drugim kontekście → wyświetl materiał |
| `test_manage_shared_materials` | Zmień widoczność z public na private → materiał znika z browse |
| `test_mobile_marketplace_view` | Przeglądaj marketplace na viewport 375px — sprawdź responsive layout |
| `test_accessibility_rating` | Sprawdź aria-label na gwiazdkach i aria-live na toast messages |

### 10.4 Pokrycie edge cases

| Edge case | Test |
|---|---|
| Brak materiałów w marketplace | EmptyState z komunikatem |
| Usunięcie dokumentu źródłowego | SharedMaterial CASCADE delete, zweryfikować 404 |
| Dezaktywacja konta autora | Materiały nie pojawiają się w browse |
| Bardzo długi tytuł (500 znaków) | Truncation w karcie, pełny w detail |
| Concurrent rating (race condition) | Dwa requesty rate jednocześnie — avg poprawna |
| Klonowanie po usunięciu z marketplace | 404 na clone endpoint |

---

## Appendix A: Diagramy

### A.1 Diagram przepływu danych — udostępnianie

```
┌─────────┐     POST /share      ┌──────────────┐     INSERT      ┌──────────────────┐
│ Frontend │ ──────────────────→  │  Router      │ ─────────────→  │ shared_materials  │
│          │                      │  marketplace │                  │ (snapshot)        │
└─────────┘                      └──────────────┘                  └──────────────────┘
                                        │
                                        │ read prototype
                                        ▼
                                 ┌──────────────┐
                                 │  prototypes   │
                                 │  + documents  │
                                 │  + generations│
                                 │  + subjects   │
                                 └──────────────┘
```

### A.2 Diagram przepływu danych — klonowanie

```
┌─────────┐   POST /{id}/clone   ┌──────────────┐
│ Frontend │ ──────────────────→  │  Router      │
└─────────┘                      │  marketplace │
                                 └──────┬───────┘
                                        │
                          ┌─────────────┼─────────────┐
                          ▼             ▼             ▼
                   ┌────────────┐ ┌──────────┐ ┌──────────┐
                   │ Generation │ │ Prototype│ │ Document │
                   │ (new)      │ │ (new)    │ │ (new)    │
                   └────────────┘ └──────────┘ └──────────┘
                                        │
                                        ▼
                                 ┌──────────────┐
                                 │material_clones│
                                 │ (tracking)    │
                                 └──────────────┘
```

### A.3 Model widoczności

```
  private ←──→ link_shared ←──→ public
     │              │              │
     │              │              │
  Tylko autor    Token URL      Widoczny
  widzi         + autorzy       w browse
                widzą           dla
                                wszystkich
```
