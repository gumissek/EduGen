# Plan: Wdrożenie kompletnego backendu EduGen Local

**TL;DR** — Budujemy backend FastAPI od zera: inicjalizacja projektu `uv`, modele SQLAlchemy + migracje Alembic dla SQLite, system autentykacji z bcrypt i sesjami 15-minutowymi, szyfrowanie klucza API (Fernet), CRUD przedmiotów i plików z ekstrakcją tekstu (PyMuPDF/python-docx) i OCR (OpenAI Vision), pipeline generowania prototypów AI z BackgroundTasks, edytor/reprompt, generowanie DOCX z wariantami (python-docx), dashboard z paginacją i bulk download ZIP, backup/diagnostyka. Wszystko zapakowane w Docker.

---

## Struktura katalogów backendu

```
backend/
├── pyproject.toml
├── alembic.ini
├── alembic/
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
│       └── 001_initial_schema.py
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app, lifespan, middleware
│   ├── config.py                  # Settings z .env (Pydantic BaseSettings)
│   ├── database.py                # SQLAlchemy engine, session, pragmas
│   ├── dependencies.py            # get_db, get_current_user
│   ├── encryption.py              # Fernet key management
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── session.py
│   │   ├── settings.py
│   │   ├── subject.py
│   │   ├── source_file.py
│   │   ├── generation.py
│   │   ├── generation_source_file.py
│   │   ├── prototype.py
│   │   ├── document.py
│   │   ├── ai_request.py
│   │   ├── backup.py
│   │   └── diagnostic_log.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── settings.py
│   │   ├── subject.py
│   │   ├── file.py
│   │   ├── generation.py
│   │   ├── prototype.py
│   │   ├── document.py
│   │   ├── backup.py
│   │   └── diagnostic.py
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── settings.py
│   │   ├── subjects.py
│   │   ├── files.py
│   │   ├── generations.py
│   │   ├── prototypes.py
│   │   ├── documents.py
│   │   ├── backups.py
│   │   └── diagnostics.py
│   └── services/
│       ├── __init__.py
│       ├── auth_service.py
│       ├── file_service.py        # Upload, text extraction, OCR
│       ├── ai_service.py          # OpenAI calls, prompt builder
│       ├── generation_service.py  # Orchestrator BackgroundTasks
│       ├── docx_service.py        # DOCX generation + variants
│       ├── backup_service.py      # Backup/restore logic
│       └── diagnostic_service.py
├── data/                          # Runtime data volume
│   ├── edugen.db
│   ├── fernet.key
│   ├── subjects/
│   └── backups/
├── .env.example
└── Dockerfile
```

---

## Faza 1 — Projekt i infrastruktura

### 1. Inicjalizacja projektu `uv`
Utworzyć `backend/pyproject.toml` z zależnościami: `fastapi[standard]`, `uvicorn`, `sqlalchemy>=2.0`, `alembic`, `passlib[bcrypt]`, `cryptography`, `python-multipart`, `openai`, `pymupdf`, `python-docx`, `python-magic-bin` (Windows-compatible), `pydantic-settings`, `aiofiles`, `apscheduler`. Uruchomić `uv sync`.

### 2. Konfiguracja aplikacji
Utworzyć `app/config.py` z `pydantic-settings.BaseSettings` ładującym z `.env`: `DATABASE_URL` (default `sqlite:///./data/edugen.db`), `DEFAULT_PASSWORD_HASH` (bcrypt hash), `DATA_DIR` (default `./data`), `SESSION_TIMEOUT_MINUTES` (default 15), `MAX_FILE_SIZE_MB` (default 10), `CORS_ORIGINS` (default `["http://localhost:3000"]`).

### 3. Baza danych SQLAlchemy
W `app/database.py` skonfigurować `create_engine` z `connect_args={"check_same_thread": False}` dla SQLite. Listener `@event.listens_for(engine, "connect")` ustawiający `PRAGMA foreign_keys=ON`, `PRAGMA journal_mode=WAL`, `PRAGMA synchronous=NORMAL`. Session factory via `sessionmaker`. Dependency `get_db()` jako AsyncGenerator.

### 4. Modele ORM
12 modeli w `app/models/` odzwierciedlających schemat z `database_structure.md`. Kluczowe konwersje PostgreSQL→SQLite:
- `UUID` → `String(36)` z `default=lambda: str(uuid4())`
- `TIMESTAMP WITH TIME ZONE` → `String` z ISO-8601 (lub `DateTime` SQLAlchemy)
- `JSONB` → `Text` (z JSON serializacją w Pythonie)
- `BOOLEAN` → `Integer` (0/1)
- Relacje: `User.sessions`, `User.settings`, `Subject.source_files`, `Subject.generations`, `Generation.prototype` (uselist=False), `Generation.documents`, `Generation.ai_requests`, `Generation.source_files` (secondary=`generation_source_files`)

### 5. Migracja Alembic
Skonfigurować `alembic.ini` z `sqlalchemy.url`. W `alembic/env.py` importować `Base.metadata`. Utworzyć migrację `001_initial_schema.py` tworzącą wszystkie tabele + indeksy (`idx_source_files_subject`, `idx_generations_created_at`, `idx_generations_status`, `idx_documents_generation`, itd.). **Seed data**: 4 domyślne przedmioty (Matematyka, Fizyka, Język Polski, Historia) w `is_custom=False`. Seed domyślnego użytkownika z hashem hasła z `.env`.

### 6. Moduł szyfrowania
`app/encryption.py`: przy starcie sprawdzić czy `data/fernet.key` istnieje; jeśli nie — wygenerować `Fernet.generate_key()` i zapisać. Funkcje `encrypt_api_key(plain: str) -> str` i `decrypt_api_key(encrypted: str) -> str`.

### 7. FastAPI main.py
Lifespan handler: tworzenie `data/` directory jeśli nie istnieje, uruchomienie schedulera backupów (APScheduler). Middleware CORS (`localhost:3000`). Include wszystkich routerów z prefixem `/api`. Healthcheck `GET /api/health`.

### 8. Dockerfile
`python:3.12-slim`, instalacja `uv`, `poppler-utils`, `libmagic1`. COPY + `uv sync`. CMD `uvicorn app.main:app --host 0.0.0.0 --port 8000`.

---

## Faza 2 — Autentykacja i ustawienia

### 9. Auth router + service
`POST /api/auth/login`: przyjmuje `{"password": str}`, weryfikuje bcrypt vs hash z DB (`users` table), tworzy rekord w `sessions` z UUID tokenem i `expires_at = now + 15min`. Zwraca `{"token": "uuid", "expires_at": "ISO"}`. Ustawia token w `Set-Cookie` (HttpOnly, SameSite=Lax, Secure=false bo localhost). `POST /api/auth/logout`: invaliduje sesję w DB.

### 10. Dependency `get_current_user`
Middleware/dependency: odczytuje token z cookie lub header `Authorization: Bearer`. Sprawdza `sessions` table, czy `expires_at > now()`. Jeśli nie → `401`. Przy każdym authenticated request aktualizuje `last_activity_at` i przesuwa `expires_at` o 15 minut (rolling expiration).

### 11. Settings router
`GET /api/settings`: zwraca `{"default_model": str, "has_api_key": bool}` (nigdy nie zwracamy klucza!). `PUT /api/settings`: przyjmuje opcjonalnie `openai_api_key` (szyfruje Fernetem) i `default_model`. `POST /api/settings/validate-key`: testuje klucz via `openai.Client.models.list()` — zwraca `{"valid": bool, "models": [...]}`.

---

## Faza 3 — Przedmioty i pliki

### 12. Subjects router
`GET /api/subjects`: lista (predefiniowane + custom). `POST /api/subjects`: tworzy nowy z `is_custom=True`. `DELETE /api/subjects/{id}`: soft-delete (tylko custom). Walidacja Pydantic: name must match `^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ0-9 -]+$` (polskie znaki).

### 13. Files router + service
`POST /api/files`: Multipart + `subject_id`. Walidacja: MIME via python-magic (dozwolone: `application/pdf`, `application/vnd.openxmlformats...`, `image/jpeg`, `image/png`). Max 10MB. Zapis do `data/subjects/{subject_id}/{uuid}.{ext}`. Po zapisie — **BackgroundTask** do ekstrakcji tekstu:
- **PDF z tekstem**: PyMuPDF `fitz.open()` → `page.get_text()` na wszystkich stronach
- **PDF skan** (wykrycie: jeśli `get_text()` zwraca < 50 znaków na stronę): konwersja stron na obrazy → OpenAI Vision (max 5 stron)
- **DOCX**: `python-docx` → `doc.paragraphs + doc.tables`
- **IMG**: base64 encode → OpenAI Vision z promptem "Transcribe all textual, structural, and mathematical components from this image exactly."
- Po ekstrakcji: wywołanie OpenAI z promptem "Provide a 1-sentence descriptive summary of this educational material." → zapis `summary` do DB
- `GET /api/files?subject_id=`: lista plików z metadanymi. `DELETE /api/files/{id}`: soft-delete (`deleted_at`).

---

## Faza 4 — Pipeline generowania AI

### 14. Generation router
`POST /api/generations`: przyjmuje pełny `GenerationParams` (Pydantic schema mapujący kolumny `generations` + lista `source_file_ids`). Walidacja: `total_questions == open_questions + closed_questions`, `difficulty BETWEEN 1 AND 4`, `variants_count >= 1`. Tworzy rekord w `generations` ze `status=processing`. Uruchamia **BackgroundTask** `generate_prototype`.

### 15. AI Service — Prompt Builder
Buduje system prompt:
- Role: "Jesteś ekspertem w tworzeniu materiałów edukacyjnych w języku polskim."
- Kontekst: education_level, class_level, difficulty (mapowany na label), content_type
- Materiał źródłowy: concat `extracted_text` z powiązanych `source_files`
- Instrukcje: topic, instructions (user text)
- Format wyjścia: JSON z `Quiz` / `Worksheet` Pydantic schema (structured output via `response_format`)
- Dla testów/sprawdzianów: wymagana liczba pytań open/closed, format odpowiedzi a/b/c/d

### 16. AI Service — OpenAI Call
Deszyfruje API key. Tworzy `openai.AsyncOpenAI(api_key=...)`. Wywołanie `client.chat.completions.create()` z modelem z `settings.default_model`. Loguje do `ai_requests`: model, tokens, request/response payload. Parse JSON response. W razie błędu (timeout, malformed JSON) → `status=error` w `generations`, log do `diagnostic_logs`.

### 17. Generation Service — Background Task
Orchestrator: pobiera konfigurację, buduje prompt, wywołuje OpenAI, parsuje do Pydantic `Quiz`, tworzy rekord `prototypes` z `original_content` (HTML rendering) i `answer_key`. Aktualizuje `generations.status` na `ready`. Polling: `GET /api/generations/{id}` zwraca `{"status": "draft|processing|ready|error", "error_message": ...}`.

---

## Faza 5 — Edycja prototypu i reprompt

### 18. Prototypes router
`GET /api/prototypes/{generation_id}`: zwraca `original_content`, `edited_content` (lub null), `answer_key`. `PUT /api/prototypes/{generation_id}`: zapisuje `edited_content` (HTML z edytora WYSIWYG). `POST /api/prototypes/{generation_id}/reprompt`: przyjmuje `{"prompt": str}`, bierze aktualny `edited_content` (lub `original_content`), wysyła do OpenAI z dodatkowym promptem użytkownika, aktualizuje `edited_content` i `answer_key`. Loguje do `ai_requests`.

---

## Faza 6 — Generowanie DOCX z wariantami

### 19. DOCX Service
`POST /api/generations/{id}/finalize`:
- Pobiera prototyp (`edited_content` ?? `original_content`)
- Parsuje JSON/HTML do struktury `Quiz`
- Jeśli `variants_count > 1`: dla każdego wariantu losowo tasuje kolejność pytań zamkniętych + losowo tasuje opcje a/b/c/d w każdym pytaniu zamkniętym; pytania otwarte też tasuje pozycyjnie
- Generuje `python-docx` Document:
  - Nagłówek: tytuł, klasa, przedmiot, data, "Grupa A/B/C..."
  - Pytania z numeracją ciągłą
  - `document.add_page_break()` między grupami
  - Na końcu: Klucz odpowiedzi dla wszystkich grup
- Zapis do `data/documents/{generation_id}/{filename}.docx`
- Rekord w `documents` table
- `GET /api/documents/{id}/download`: `FileResponse` ze streamem DOCX

---

## Faza 7 — Historia, bulk download, backup

### 20. Documents router
`GET /api/documents?page=&per_page=&subject_id=&sort_by=`: paginacja (`limit`/`offset`), filtrowanie, sortowanie. `DELETE /api/documents/{id}`: soft-delete. `POST /api/documents/bulk-download`: przyjmuje `{"document_ids": [...]}`, tworzy streamed ZIP via `StreamingResponse` + `zipfile` w trybie write-to-stream.

### 21. Backup Service
APScheduler job co 24h: `shutil.copy2` bazy SQLite → `data/backups/edugen_backup_{date}.zip`. Retencja 7 dni (usuwanie starszych). `POST /api/backups`: manual trigger. `GET /api/backups`: lista. `POST /api/backups/restore`: przyjmuje `backup_id`, kopiuje backup → aktywna baza (z restartem engine). Loguje do `diagnostic_logs`.

### 22. Diagnostics router
`GET /api/diagnostics/logs?level=&page=&per_page=`: paginowana lista logów. Centralny exception handler w FastAPI logujący do `diagnostic_logs` (level, message, metadata z traceback).

---

## Faza 8 — Docker i finalizacja

### 23. Dockerfile backendu
Multi-stage build: `python:3.12-slim`, instalacja systemowych zależności (`libmagic1`, `poppler-utils`), `uv sync --frozen`, expose 8000.

### 24. Docker Compose
Service `backend` z `127.0.0.1:8000:8000`, volume `./edugen_data:/app/data`. `.env.example` z dokumentacją wszystkich zmiennych.

### 25. Startup script
Lifespan: auto-tworzenie katalogów (`data/subjects`, `data/documents`, `data/backups`), `alembic upgrade head` (lub programmatyczny), seed sprawdzenie.

---

## Verification

1. `uv run alembic upgrade head` — baza tworzy się z pełnym schematem, seed data (4 przedmioty + user) obecne
2. `uv run pytest` — testy unit (ekstrakcja tekstu, generowanie DOCX, shuffling wariantów, szyfrowanie Fernet) + integration (mockowany OpenAI, pełny flow auth→generation)
3. `docker compose up --build` — backend startuje na `127.0.0.1:8000`, healthcheck `GET /api/health` zwraca 200
4. Manual test: login → ustawienie API key → upload PDF → stworzenie generacji → polling status → edycja prototypu → finalizacja DOCX → pobranie pliku
5. Sprawdzenie WAL mode: `PRAGMA journal_mode;` zwraca `wal`
6. Backup: trigger manual → sprawdzić czy ZIP istnieje w `data/backups/`

---

## Decisions

- **UUID jako String(36)** zamiast SQLAlchemy `UUID` type — pełna kompatybilność SQLite↔PostgreSQL
- **Rolling session expiration** (15 min od ostatniej aktywności) — zgodne z PRD US-001
- **python-magic-bin** zamiast `python-magic` na Windows — nie wymaga `libmagic` systemowo w development
- **APScheduler** zamiast `schedule` — natywna integracja z async FastAPI
- **Structured output** (response_format JSON) — wymusza poprawną strukturę odpowiedzi AI, eliminuje problem malformed JSON
- **StreamingResponse** dla bulk ZIP — unika memory overflow przy wielu dokumentach
- **Fernet key w osobnym pliku** — nawet jeśli DB wycieknie, klucz API jest bezpieczny
