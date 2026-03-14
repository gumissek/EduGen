# Struktura projektu EduGen (Backend)

Podczas wprowadzania zmian w projekcie, zawsze przestrzegaj poniższej struktury katalogów i konwencji.

## Struktura plików

```
backend/
├── app/
│   ├── main.py               # Punkt wejścia FastAPI, lifespan, middleware, routery
│   ├── config.py             # Konfiguracja z pydantic-settings (.env)
│   ├── database.py           # Silnik SQLAlchemy, get_db() dependency
│   ├── dependencies.py       # get_current_user(), get_current_superuser()
│   ├── encryption.py         # Szyfrowanie kluczy API (Fernet / cryptography)
│   ├── init_app.py           # Skrypt inicjalizacyjny: baza, migracje, katalogi
│   ├── logging_config.py     # Centralna konfiguracja logowania z znacznikami czasu
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── secret_key.py
│   │   ├── generation.py
│   │   ├── prototype.py
│   │   ├── source_file.py
│   │   ├── document.py
│   │   ├── ai_request.py
│   │   ├── subject.py
│   │   ├── diagnostic_log.py
│   │   ├── backup.py
│   │   ├── file_content_cache.py
│   │   ├── generation_source_file.py
│   │   ├── verification_token.py
│   │   ├── user_ai_model.py
│   │   ├── curriculum_document.py
│   │   └── curriculum_chunk.py
│   ├── routers/
│   │   ├── admin.py
│   │   ├── auth.py
│   │   ├── backups.py
│   │   ├── diagnostics.py
│   │   ├── documents.py
│   │   ├── files.py
│   │   ├── generations.py
│   │   ├── levels.py
│   │   ├── prototypes.py
│   │   ├── secret_keys.py
│   │   ├── settings.py
│   │   ├── subjects.py
│   │   ├── task_types.py
│   │   ├── user_ai_models.py
│   │   └── curriculum.py
│   ├── schemas/
│   │   ├── admin.py
│   │   ├── auth.py
│   │   ├── backup.py
│   │   ├── diagnostic.py
│   │   ├── document.py
│   │   ├── file.py
│   │   ├── generation.py
│   │   ├── prototype.py
│   │   ├── secret_key.py
│   │   ├── settings.py
│   │   ├── subject.py
│   │   ├── user_ai_model.py
│   │   └── curriculum.py
│   └── services/
│       ├── ai_service.py
│       ├── auth_service.py
│       ├── backup_service.py
│       ├── diagnostic_service.py
│       ├── docx_service.py
│       ├── email_service.py
│       ├── file_service.py
│       ├── generation_service.py
│       ├── verification_service.py
│       └── curriculum_service.py
├── alembic/
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
│       └── 001_initial_schema.py
├── alembic.ini
├── Dockerfile
└── pyproject.toml
```


## 1. Architektura ogólna

Projekt EduGen opiera się na nowoczesnym, modularnym backendzie. Składa się on z następujących kluczowych elementów:
- **Framework REST API** — FastAPI (wersja aplikacji: `0.2.0`).
- **Baza danych** — PostgreSQL 16 z wykorzystaniem SQLAlchemy ORM oraz Alembic do zarządzania migracjami schematu.
- **Konteneryzacja** — Docker Compose z trzema serwisami: `postgres`, `backend`, `frontend`. Wszystkie komunikują się przez wewnętrzną sieć `backend_network` (bridge).
- **Integracja AI** — Komunikacja z modelami AI poprzez OpenRouter API (`https://openrouter.ai/api/v1/chat/completions`) w celu generowania dedykowanych treści edukacyjnych. Wykorzystywana jest biblioteka `requests` zamiast dedykowanego SDK.
- **Menedżer pakietów** — `uv` + `pyproject.toml` (wymaga Pythona >= 3.12). Build system: Hatchling.
- **Zadania w tle (Background Tasks)** — `apscheduler` (BackgroundScheduler) dla codziennych kopii zapasowych (interwał 24h) oraz FastAPI background tasks dla asynchronicznego generowania materiałów edukacyjnych.
- **Logowanie** — Centralnie skonfigurowany Python `logging` ze znacznikami czasu (`app/logging_config.py`). Format: `YYYY-MM-DD HH:MM:SS [LEVEL   ] moduł: treść`.

### Główne katalogi w `backend/`:
- `app/` — Główny kod źródłowy aplikacji (FastAPI, w tym endpointy, serwisy, modele, schematy Pydantic).
- `alembic/` — Migracje bazy danych (1 skonsolidowana wersja: pełny aktualny schemat).
- `tests/` — Testy jednostkowe i regresyjne (pytest).

---

## 2. Backend – Punkt wejścia API

### `backend/app/main.py`
Centrum zarządzania całą aplikacją, definiujące aplikację FastAPI oraz uruchamiające się procesy.

**Lifespan & Mechanizmy Startowe:**
- `configure_logging()` — pierwsza instrukcja przy starcie (wywołana na poziomie modułu); konfiguruje logger zgodnie z `app/logging_config.py`.
- `_start_backup_scheduler()` — inicjuje background scheduler (APScheduler, `BackgroundScheduler`) wykonujący dzienny dump bazy (`create_backup` + `cleanup_old_backups`). Scheduler zamykany przy shutdown.

> **Uwaga:** Tworzenie katalogów (`data/`, `data/subjects/`, `data/documents/`, `data/backups/`) oraz migracje obsługiwane są przez `app/init_app.py`, który uruchamiany jest jako osobny proces przed startem uvicorn.

**Middleware i routery:**
- Załączony `CORSMiddleware`, pobierający listę adresów z `settings.cors_origins_list`.
- Rejestrowane routery API (prefiks `/api`): `auth`, `settings`, `subjects`, `files`, `generations`, `prototypes`, `documents`, `backups`, `diagnostics`, `levels`, `task_types`, `secret_keys`, `user_ai_models`, `admin`.
- **Health check** — `GET /api/health` → `{"status": "ok"}` (używany przez Docker healthcheck).
- **Global exception handler** — przechwytuje wszystkie nieobsłużone wyjątki (kod 500), zapisuje szczegóły błędu (ścieżka, metoda HTTP, traceback) do tabeli `DiagnosticLog`.

---

## 3. Backend – Pliki konfiguracyjne i baza

### `backend/app/logging_config.py`
Centralna konfiguracja Pythonowego `logging` dla całej aplikacji:
- `configure_logging()` — konfiguruje root logger (poziom INFO). Bezpieczna do wielokrotnego wywołania (sprawdza czy handler już istnieje).
- Format wyjścia: `YYYY-MM-DD HH:MM:SS [LEVEL   ] nazwa.modułu: treść wiadomości`
- Handler: `StreamHandler → stdout` (kompatybilny z Docker/kontenerami).
- Wyciszeni zewnętrzni: `uvicorn.access` (WARNING), `apscheduler` (WARNING), `sqlalchemy.engine` (WARNING), `sqlalchemy.pool` (WARNING).
- Używana przez: `main.py` (startup na poziomie modułu), `init_app.py` (skrypt inicjalizacyjny).

### `backend/app/config.py`
Moduł zarządzania zmiennymi środowiskowymi przez `pydantic-settings` (`BaseSettings`):
- `DATABASE_URL` (domyślnie `postgresql+psycopg://edugen_user:edugen_pass@localhost:5432/edugen`)
- `DATA_DIR`, `MAX_FILE_SIZE_MB`, `CORS_ORIGINS`
- `JWT_SECRET_KEY` — klucz do podpisywania tokenów JWT (auto-generowany jeśli nie ustawiony w `.env`)
- `JWT_ALGORITHM` — algorytm podpisu (domyślnie `HS256`)
- `JWT_EXPIRATION_MINUTES` — czas życia tokena JWT (domyślnie `30` minut)
- **Computed properties:** `cors_origins_list` (JSON-parsed z `CORS_ORIGINS`), `data_path` (Path z `DATA_DIR`), `max_file_size_bytes` (MB → bajty).
- Eksportuje singleton `settings`.

> **Szablon konfiguracji:** Główny katalog projektu zawiera plik **`.env.example`**, który jest domyślnym szablonem konfiguracyjnym. Skrypty startowe (`start_windows.bat` / `start_mac_linux.sh`) automatycznie kopiują go do pliku `.env` w głównym katalogu, jeśli plik ten nie istnieje.

> **Porty PostgreSQL (lokalny development):** `POSTGRES_PORT` oznacza port kontenera PostgreSQL (wewnątrz Docker), a `POSTGRES_HOST_PORT` oznacza port wystawiony na hoście. Lokalny backend uruchamiany poza Dockerem (np. przez `dev_windows.bat`) powinien łączyć się przez `localhost:POSTGRES_HOST_PORT`.

### `backend/app/database.py`
Konfiguracja silnika SQLAlchemy (PostgreSQL):
- `create_engine()` z `pool_pre_ping=True`, `echo=False`.
- `SessionLocal` — `sessionmaker(autocommit=False, autoflush=False)`.
- `Base` — `DeclarativeBase` (klasa bazowa ORM).
- `get_db()` — Dependency injection (wstrzykiwanie sesji bazy do endpointów, zamykana w `finally`).

### `backend/app/init_app.py`
Skrypt inicjalizacyjny uruchamiany przed startem serwera:
- `create_database_if_not_exists()` — łączy się z bazą `postgres` (admin DB) i tworzy docelową bazę jeśli nie istnieje (`CREATE DATABASE`).
	Obsługuje retry przy niedostępnym PostgreSQL i ustawia timeout połączenia, aby start nie „wisiał” bez logów.
- `run_migrations()` — uruchamia Alembic `upgrade head` jeśli bieżąca rewizja różni się od head.
	Jeżeli wykryje niepustą schemę bez wpisu w `alembic_version` (np. po konsolidacji migracji), domyślnie wykonuje `alembic stamp head` zamiast ponownego uruchamiania migracji inicjalnej.
	Jeżeli wykryje nieznaną rewizję w tabeli `alembic_version` (np. pozostałość po starej linii migracji), również domyślnie wykonuje `alembic stamp head`.
	To zachowanie można wyłączyć przez `INIT_DB_AUTO_STAMP_UNVERSIONED=false`. Kończy z kodem 1 przy błędzie.
- `ensure_directories()` — tworzy katalogi: `DATA_DIR`, `DATA_DIR/subjects`, `DATA_DIR/documents`, `DATA_DIR/backups`.

Parametry środowiskowe dla inicjalizacji DB:
- `INIT_DB_MAX_RETRIES` (domyślnie `30`)
- `INIT_DB_RETRY_DELAY_SECONDS` (domyślnie `2.0`)
- `INIT_DB_CONNECT_TIMEOUT_SECONDS` (domyślnie `5`)
- `INIT_DB_AUTO_STAMP_UNVERSIONED` (domyślnie `true`)

### `docker-compose.yml`
Definicja trzech serwisów, dwóch wolumenów i jednej sieci:

- **postgres** — PostgreSQL 16, kontener `edugen-postgres`. Health check: `pg_isready` (interwał 10s, 3 retries). Wolumen `edugen_postgres_data`. Port `${POSTGRES_HOST_PORT:-5432}:5432`.
- **backend** — FastAPI, kontener `edugen-backend`. Port `0.0.0.0:8000:8000`. Wolumeny: `edugen_data:/app/data`, `./backend/common_filles:/app/common_filles:ro`. Healthcheck: `curl http://localhost:8000/api/health` (interwał 30s, start period 15s). Zależny od healthy Postgres. Command: `init_app.py` → `uvicorn` (2 workery).
- **frontend** — Next.js, kontener `edugen-frontend`. Port `0.0.0.0:3000:3000`. Build arg: `BACKEND_URL=http://backend:8000`. Wolumen: `./common_filles:/app/common_filles:ro`. Zależny od healthy backendu i Postgresa.

---

## 4. Baza Danych i Modele (`app/models/`)

Kod dzieli się na dedykowane pliki modelowe oparte na `DeclarativeBase`. Wszystkie ID to UUID jako `String(36)` (wyjątek: `FileContentCache` używa SHA-256 hash jako PK). Wszystkie daty przechowywane są jako stringi ISO (nie natywne `DateTime`).

Kluczowe encje:
- **`user.py`** — Multi-user: `email` (unikalne, indeksowane), `first_name`, `last_name`, `is_active`, `is_superuser`, `premium_level`, `api_quota`, `api_quota_reset`, `is_email_verified`, `email_verification_token`, `email_verification_token_expiry`, `reset_password_token`, `reset_password_token_expiry`, `last_password_change`, `failed_login_attempts`, `default_model` (domyślnie `"google/gemini-3.1-flash-lite-preview"`). Relacje do `SecretKey`, `Subject`, `Generation`, `SourceFile`, `Document`, `Prototype`, `UserAIModel`.
- **`user_ai_model.py`** — Konfiguracja modeli AI per użytkownik. Kolumny: `provider`, `model_name`, `description`, `price_description`, `is_available`, `request_made`. UniqueConstraint na `(user_id, provider, model_name)` zapobiega duplikatom. FK → `users.id` (CASCADE).
- **`secret_key.py`** — Przechowywanie zaszyfrowanych kluczy API (Fernet). Kolumny: `platform`, `key_name`, `secret_key_hash`, `is_active`, `last_used_at`. FK → `users.id` (CASCADE).
- **`generation.py`** — Parametry generacji AI: `content_type`, `education_level`, `class_level`, `language_level`, `topic`, `instructions`, `difficulty`, `total_questions`, `open_questions`, `closed_questions`, `variants_count`, `task_types`, `status` (domyślnie `"draft"`), `error_message`. FK → `users.id`, `subjects.id`. Relacje: `prototype` (one-to-one), `documents` (one-to-many), `ai_requests` (one-to-many), `source_files` (many-to-many via `generation_source_files`).
- **`prototype.py`** — Zrenderowane rezultaty AI: `original_content`, `edited_content`, `answer_key`, `raw_questions_json`, `comments_json`. UniqueConstraint na `generation_id` (one-to-one z Generation). FK → `users.id`, `generations.id`.
- **`source_file.py`** — Pliki źródłowe: `filename`, `original_path`, `file_type`, `file_size`, `file_hash` (SHA-256, indeksowany), `extracted_text`, `summary`, `page_count`, `deleted_at` (soft delete). FK → `users.id`, `subjects.id`.
- **`document.py`** — Finalizowane pliki DOCX: `filename`, `file_path`, `variants_count`, `deleted_at` (soft delete). FK → `users.id`, `generations.id`.
- **`ai_request.py`** — Logi zapytań do modeli AI: `model_name`, `prompt_tokens`, `completion_tokens`, `total_tokens`, `request_type`, `request_payload`, `response_payload` (JSON). FK → `users.id` (SET NULL), `generations.id` (SET NULL) — logi zachowywane nawet po usunięciu użytkownika/generacji.
- **`subject.py`** — Przedmioty edukacyjne: `name`, `is_custom` (0=predefinowany, 1=własny). `user_id` nullable — predefinowane przedmioty nie mają właściciela. Kaskadowe usuwanie do `source_files` i `generations`.
- **`file_content_cache.py`** — Globalny cache deduplikacji plików. PK = `file_hash` (SHA-256, nie UUID). Kolumny: `file_type`, `extracted_text`, `summary`, `page_count`.
- **`generation_source_file.py`** — Tabela asocjacyjna many-to-many: `generation_id` + `source_file_id` (composite PK, oba CASCADE).
- **`diagnostic_log.py`** — Logowanie błędów: `level`, `message`, `metadata_json`. Brak FK — samodzielna tabela.
- **`backup.py`** — Kopie zapasowe: `backup_path`, `size_bytes`, `expires_at` (indeksowany). Brak FK.
- **`verification_token.py`** — Tokeny/kody weryfikacyjne: `token` (unique, indeksowany), `token_type` (`email_change` lub `password_change`), `payload_json`, `expires_at`, `is_used`. FK → `users.id` (CASCADE). Używa `backref` zamiast `back_populates`.

---

## 5. Autoryzacja JWT (`app/dependencies.py`)

Backend wykorzystuje bezstanową autoryzację opartą na **JWT (JSON Web Tokens)**:

### `get_current_user()`:
- Odczyt tokena na dwustopniowy wariant: (1) Ciasteczko `edugen-auth`, (2) Nagłówek HTTP `Authorization: Bearer <JWT>`.
- Dekodowanie i walidacja JWT przez `verify_access_token()` (sprawdzenie podpisu i `exp` claim).
- Pobranie użytkownika z bazy na podstawie `sub` (user_id) z payloadu JWT.
- Weryfikacja `is_active` — zablokowane konta otrzymują `403 Forbidden`.

### `get_current_superuser()`:
- Zależy od `get_current_user()`. Sprawdza `is_superuser` — jeśli `False`, zwraca `403 Forbidden`.
- Służy do ochrony endpointów dostępnych wyłącznie dla administratorów (np. panel admina).

### Izolacja danych (Data Isolation):
Każdy endpoint filtruje dane po `user_id == current_user.id`:
- Subjects: widoczne własne + predefinowane (`user_id IS NULL`).
- Source files, generations, prototypes, documents: wyłącznie własne.
- AI requests: powiązane z użytkownikiem (nullable — SET NULL przy usunięciu).

---

## 6. Serwisy i Logika Biznesowa (`app/services/`)

Zbiór usług wyizolowany z kontrolerów, separujący szczegóły implementacyjne API (routery) od logiki domenowej.

### `auth_service.py`
Obsługa uwierzytelniania JWT:
- `hash_password()` / `verify_password()` — hashowanie bcrypt.
- `create_access_token(user_id, email)` — tworzenie JWT z claimami `sub`, `email`, `iat`, `exp`.
- `verify_access_token(token)` — dekodowanie i walidacja JWT (zwraca payload lub None).
- `authenticate_user(db, email, password)` — logowanie na podstawie emaila, śledzenie `failed_login_attempts`, aktualizacja `last_login_at`.
- `register_user(db, email, password, ...)` — rejestracja nowego użytkownika z automatycznym tworzeniem 4 domyślnych modeli AI (Gemini, Nemotron, GPT-5.1, GPT-5-mini) w tabeli `user_ai_models`.

### `ai_service.py`
Odpowiada za logikę formowania wytycznych promptów i połączenie z OpenRouter API:
- **Stałe/etykiety:** `DIFFICULTY_LABELS`, `EDUCATION_LEVEL_LABELS`, `CONTENT_TYPE_LABELS`, `TYPES_WITHOUT_QUESTIONS` (`{"worksheet", "lesson_materials"}`).
- `build_system_prompt(generation, source_texts)` — buduje system prompt dla AI. Deleguje do `_build_free_form_prompt` dla worksheet/lesson_materials.
- `call_openrouter(db, generation, system_prompt, api_key, model)` — wysyła zapytanie do OpenRouter, loguje w `AIRequest`, zwraca sparsowany JSON.
- `call_openrouter_reprompt(db, generation, current_content, user_prompt, api_key, model)` — reprompt dla typów Q&A (walidacja struktury via `_normalize_reprompt_response`).
- `call_openrouter_reprompt_free_form(db, generation, current_content, user_prompt, api_key, model)` — reprompt dla free-form, zwraca zmodyfikowany HTML.
- Typy free-form (`worksheet`, `lesson_materials`) wspierają HTML z tabelami: `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>` — oprócz standardowych tagów.
- Wewnętrzna funkcja `_call_openrouter()` realizuje połączenie HTTP z `https://openrouter.ai/api/v1/chat/completions`.
- Formatyzacja odpowiedzi w trybie JSON (`response_format: {"type": "json_object"}`).
- Model używany do generacji pobierany z `User.default_model` (format `provider/model_name`).

### `generation_service.py`
Orkiestracja procesu generowania materiałów:
- `generate_prototype_task(db, generation_id)` — główny worker w tle. Ustawia status `"processing"`, pobiera klucz API z `SecretKey` (filtrowany po `generation.user_id` — izolacja danych), gromadzi teksty źródłowe, wywołuje `build_system_prompt` + `call_openrouter`, tworzy `Prototype` z `original_content`, `answer_key`, `raw_questions_json`. Na sukces: status `"ready"`. Na błąd: status `"error"` + zapis do `DiagnosticLog`.
- `render_content_html(data, content_type)` — konwersja JSON z AI do HTML (free-form: bezpośredni `content_html`; Q&A: renderowanie pytań z opcjami).
- `build_answer_key(data)` — ekstrakcja `correct_answer` z każdego pytania do tekstowego klucza odpowiedzi.

### `docx_service.py`
Eksport do MS Word (DOCX) i PDF z wariantami. Pipeline: **HTML → BeautifulSoup (czyszczenie) → markdownify → Markdown → Pandoc (pypandoc) → DOCX**.
- `generate_docx(db, generation_id, user_id)` — główny punkt wejścia. Obsługuje dwa tryby:
  - **Free-form** (worksheet, lesson_materials): HTML z edytora TipTap → czyszczenie (`_clean_tiptap_html`: usunięcie `<script>`, `<style>`, `<colgroup>`, `<nav>`, unwrap `<mark class="tiptap-comment">`, strip pustych `<p>`, domyślnych colspan/rowspan) → konwersja do Markdown (`_html_to_markdown` via markdownify) → DOCX via Pandoc.
  - **Q&A** (test, quiz, exam): parsowanie pytań z JSON/HTML (`_parse_content_to_questions`) → tasowanie wariantów (`_shuffle_variant`) → renderowanie do HTML (`_render_questions_to_html` + `_render_answer_key_to_html`) → ten sam pipeline do DOCX.
- Plik `.md` (Markdown) jest zapisywany obok `.docx` jako źródło do późniejszej konwersji PDF.
- `export_content_as_pdf(file_path)` — odczyt zapisanego `.md` → konwersja Markdown → HTML (Pandoc) → PDF (xhtml2pdf/pisa). Nie wymaga LaTeX.
- PDF używa rejestracji fontów Unicode w ReportLab (preferencyjnie DejaVu Sans, fallback Arial) pod dedykowaną rodziną CSS, co zapewnia poprawny rendering polskich znaków (ą, ć, ę, ł, ń, ó, ś, ź, ż).
- Hierarchiczna struktura katalogów: `data/documents/{content_type}/{education_level}/{class_level}/{subject}/`.
- Document tworzony z `user_id`, a `file_path` zapisywany jest w formacie POSIX (`/`), aby był przenośny między Windows i Linux (host vs kontener).
- Endpointy dokumentów normalizują zapisane ścieżki (Windows `\` i Linux `/`) przy eksporcie DOCX/PDF oraz kopiowaniu dokumentu.
- Zależności: `markdownify`, `pypandoc`, `beautifulsoup4`, `xhtml2pdf`, `reportlab`. Systemowe (Dockerfile): `pandoc`, `fonts-dejavu-core`, `fontconfig`, `pkg-config`, `libcairo2-dev`.

### `file_service.py`
Obsługa plików źródłowych z cache'em SHA-256:
- `detect_mime(file_bytes, filename)` — detekcja MIME: `python-magic` (libmagic), a gdy niedostępne (typowo Windows) — fallback oparty o sygnatury pliku i rozszerzenie nazwy.
- `compute_file_hash(file_bytes)` — SHA-256 hex digest.
- `validate_file(file_bytes, filename)` — walidacja rozmiaru i MIME (dozwolone: PDF, DOCX, JPEG, PNG).
- `save_file(file_bytes, subject_id, extension)` — zapis do `data/subjects/{subject_id}/{uuid}.{ext}`.
- `extract_text_from_pdf(file_path)` — ekstrakcja tekstu via PyMuPDF (`fitz`).
- `extract_text_from_docx(file_path)` — ekstrakcja paragrafów i komórek tabel via `python-docx`.
- `is_scanned_pdf(file_path)` — wykrywanie zeskanowanych PDF-ów (avg znaków/stronę).
- `pdf_pages_to_images(file_path)` — renderowanie stron PDF jako PNG (200 DPI, max 5 stron).
- `ocr_image_with_vision(image_bytes, api_key, model)` — OCR przez model wizyjny OpenRouter.
- `generate_summary(text, api_key, model)` — generacja 1-zdaniowego podsumowania via OpenRouter.
- `get_api_key_and_model(db, user_id)` — pobieranie i deszyfrowanie klucza API z `SecretKey`, odczyt `default_model` użytkownika.
- `process_file_extraction(db, source_file_id)` — background task: ekstrakcja tekstu (PDF/DOCX/image), OCR dla skanów, generacja summary, deduplikacja via `FileContentCache`.

### `backup_service.py`
Kopie zapasowe bazy danych (JSON logical dump w archiwum ZIP):
- `create_backup(db)` — dump wszystkich tabel do JSON, tworzenie ZIP w `data/backups/`, logowanie do `DiagnosticLog`.
- `cleanup_old_backups(db)` — usuwanie backupów starszych niż 7 dni (`BACKUP_RETENTION_DAYS`).
- `restore_backup(db, backup_id)` — odczyt ZIP, truncate wszystkich tabel w odwrotnej kolejności, re-insert danych.
- `list_backups(db)` — lista backupów posortowana po dacie.
- `validate_backup_archive(backup_path)` — walidacja ZIP (musi zawierać `dump.json`).

### `verification_service.py`
Generacja i walidacja tokenów/kodów weryfikacyjnych:
- `create_email_change_token(db, user, new_email)` — tworzy token URL-safe (48 znaków, `secrets.token_urlsafe(36)`) ważny 24h z payloadem `{"new_email": "..."}`. Unieważnia poprzednie nieużyte tokeny.
- `confirm_email_change(db, token)` — waliduje token, sprawdza wygaśnięcie i unikalność e-mail, aplikuje zmianę. Rzuca `ValueError` z polskojęzycznymi komunikatami.
- `create_password_change_code(db, user, new_password_hash)` — tworzy 6-cyfrowy kod numeryczny ważny 5 min z payloadem `{"new_password_hash": "..."}`. Unieważnia poprzednie kody.
- `confirm_password_change(db, user_id, code)` — waliduje kod i aplikuje nowe hasło, aktualizuje `last_password_change`.

### `email_service.py`
Stub do wysyłki e-maili weryfikacyjnych:
- `send_email_change_verification(to_email, verification_link)` — loguje link weryfikacyjny na konsolę, zawsze zwraca `True`.
- `send_password_change_code(to_email, code)` — loguje 6-cyfrowy kod na konsolę, zawsze zwraca `True`.
- Przygotowany pod przyszłą integrację z SMTP / SendGrid / Mailgun.

### `diagnostic_service.py`
- `get_logs(db, level, page, per_page)` — paginowane pobieranie logów diagnostycznych z opcjonalnym filtrem `level`. Zwraca `(logs, total_count)`.

### `curriculum_service.py`
Serwis obsługujący pipeline wektorowej bazy Podstawy Programowej (RAG):
- `convert_pdf_to_markdown(pdf_path)` — konwersja PDF → HTML (PyMuPDF) → Markdown (markdownify). Zwraca string Markdown.
- `chunk_markdown(markdown_text)` — Dzielenie Markdown na chunki: najpierw `MarkdownHeaderTextSplitter` (wg nagłówków H1–H3), potem `RecursiveCharacterTextSplitter` (1000 znaków, 200 overlap). Zwraca listę `(content, metadata)`.
- `generate_embedding(text, api_key)` — generacja embeddingu (1536 wymiarów) przez OpenRouter API (`openai/text-embedding-3-small`). Zwraca `list[float]`.
- `generate_embeddings_batch(texts, api_key, batch_size=20)` — batch generacja embeddingów.
- `process_curriculum_document(document_id, db, api_key)` — background pipeline: PDF → Markdown → Chunki → Embeddingi → zapis do bazy. Aktualizuje status dokumentu (`processing` → `ready` / `error`).
- `search_similar_chunks(query_embedding, db, limit, threshold, edu_level, subject)` — wyszukiwanie najbardziej podobnych chunków za pomocą pgvector cosine similarity (raw SQL). Zwraca listę wyników z metadanymi dokumentu.
- `check_compliance(generation_id, db, api_key)` — sprawdza zgodność pytań prototypu z Podstawą Programową: embeddingi pytań → search → ranking. Zapisuje JSON do `prototype.compliance_json`. Zwraca `ComplianceResponse`.
- `_extract_requirement_code(text)` — regex extraction kodu wymagania z tekstu.
- W skonsolidowanej migracji `001` kolumna `embedding vector(1536)` jest tworzona dla `curriculum_chunks`; indeks HNSW jest tworzony warunkowo. Na środowiskach pgvector z limitem 2000 wymiarów dla HNSW nad `vector`, migracja pomija indeks i kontynuuje start aplikacji (bez blokowania inicjalizacji backendu).

---

## 7. Endpointy i Routery (`app/routers/`)

Architektura grupuje endpointy na moduły. Łącznie **58 endpointów** w 14 routerach.

### Podsumowanie routerów

| Router | Prefix | Opis |
|---|---|---|
| `auth` | `/api/auth` | JWT: rejestracja, logowanie, wylogowanie, profil, statystyki, weryfikowana zmiana e-mail i hasła. |
| `settings` | `/api/settings` | Ustawienia użytkownika — wybór modelu AI (`default_model`), sprawdzenie klucza API. |
| `secret-keys` | `/api/secret-keys` | CRUD kluczy API (SecretKey). Dodawanie, usuwanie, walidacja via OpenRouter API. |
| `user-ai-models` | `/api/user-ai-models` | CRUD modeli AI użytkownika (UserAIModel). Dodawanie, usuwanie, listowanie. |
| `subjects` | `/api/subjects` | Przedmioty edukacyjne (predefinowane + własne). |
| `task-types` | `/api/task-types` | Pobieranie i dodawanie typów zadań (z CSV, bez auth). |
| `levels` | `/api/levels` | Poziomy edukacji i klas (z CSV). CRUD z kaskadowym usuwaniem. |
| `files` | `/api/files` | Wrzucanie, listowanie, pobieranie i soft-delete plików źródłowych. |
| `generations` | `/api/generations` | Tworzenie generacji (background task), sprawdzanie statusu, listowanie. |
| `prototypes` | `/api/prototypes` | Edytor wersji roboczych z AI Reprompt, CRUD, kopiowanie, przywracanie oryginału. |
| `documents` | `/api/documents` | Finalizacja do DOCX, eksport PDF, CRUD, bulk download, kopiowanie, przenoszenie do wersji roboczej. |
| `backups` | `/api/backups` | Kopie zapasowe (superuser-only): tworzenie, listowanie, przywracanie, pobieranie, upload. |
| `diagnostics` | `/api/diagnostics` | Dashboard logów błędów (superuser-only): listowanie, eksport JSONL. |
| `admin` | `/api/admin` | Panel administracyjny (superuser-only): zarządzanie użytkownikami. |

### Szczegółowe endpointy

#### Auth (`/api/auth`)

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| POST | `/auth/register` | Rejestracja nowego użytkownika. Sprawdzenie unikalności e-mail (409). Zwraca 201. |
| POST | `/auth/login` | Logowanie (email + hasło). Tworzenie JWT, ustawienie cookie `edugen-auth` (httponly=False, samesite=lax, 7-dniowy max-age). |
| POST | `/auth/logout` | Wylogowanie — usunięcie cookie `edugen-auth`. Brak wymaganej autoryzacji. |
| GET | `/auth/me` | Profil użytkownika + `has_secret_keys`. Wymaga `get_current_user`. |
| PUT | `/auth/me` | Aktualizacja profilu: email (409 przy duplikacie), first_name, last_name. |
| POST | `/auth/me/change-password` | Zmiana hasła (weryfikacja current_password, min 8 znaków). Zwraca 204. |
| GET | `/auth/me/stats` | Statystyki użytkownika: liczba dokumentów, generacji, zapytań AI, nieudanych generacji. |
| POST | `/auth/me/request-email-change` | Żądanie zmiany e-mail (weryfikacja hasła, tworzenie tokena, wysyłka e-mail). |
| GET | `/auth/verify-email-change` | Potwierdzenie zmiany e-mail via token (query param). Brak wymaganej autoryzacji. |
| POST | `/auth/me/request-password-change` | Żądanie zmiany hasła (weryfikacja current_password, tworzenie 6-cyfrowego kodu). |
| POST | `/auth/me/confirm-password-change` | Potwierdzenie zmiany hasła kodem 6-cyfrowym. |

#### Settings (`/api/settings`)

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/settings` | Pobranie ustawień: `default_model`, `has_api_key`. |
| PUT | `/settings` | Aktualizacja `default_model`. |

#### Secret Keys (`/api/secret-keys`)

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/secret-keys` | Lista kluczy API użytkownika (bez zwracania samego klucza). |
| POST | `/secret-keys` | Dodanie klucza API (szyfrowanie Fernet). Zwraca 201. |
| DELETE | `/secret-keys/{key_id}` | Usunięcie klucza API. Zwraca 204. |
| POST | `/secret-keys/{key_id}/validate` | Walidacja klucza via OpenRouter `/api/v1/models` (15s timeout). Aktualizacja `last_used_at`. |

#### User AI Models (`/api/user-ai-models`)

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/user-ai-models` | Lista modeli AI użytkownika (posortowana po `created_at`). |
| POST | `/user-ai-models` | Dodanie modelu AI (provider, model_name, description, price_description). 409 przy duplikacie. Zwraca 201. |
| DELETE | `/user-ai-models/{model_id}` | Usunięcie modelu AI. Zwraca 204. |

#### Subjects (`/api/subjects`)

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/subjects` | Lista przedmiotów: predefinowane (`user_id IS NULL`) + własne. Posortowane po `is_custom`, `name`. |
| POST | `/subjects` | Tworzenie własnego przedmiotu (409 przy duplikacie nazwy w scope użytkownika, `is_custom=1`). Zwraca 201. |
| DELETE | `/subjects/{subject_id}` | Usunięcie własnego przedmiotu (403 dla predefinowanych). Zwraca 204. |

#### Task Types (`/api/task-types`) — brak autoryzacji

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/task-types` | Lista typów zadań z CSV (`backend/common_filles/task_types.csv`). |
| POST | `/task-types` | Dodanie typu zadania do CSV (`backend/common_filles/task_types.csv`). Idempotentne. Walidacja niepustej nazwy (400). Zwraca 201. |

#### Levels (`/api/levels`)

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/levels/education` | Lista poziomów edukacji z CSV (value, label, class_range_start, class_range_end). |
| POST | `/levels/education` | Dodanie poziomu edukacji (400 przy duplikacie `value`). Zwraca 201. |
| DELETE | `/levels/education/{value}` | Usunięcie poziomu edukacji z kaskadowym usunięciem powiązanych klas. Zwraca 204. |
| GET | `/levels/classes` | Lista klas, opcjonalny filtr `education_level`. |
| POST | `/levels/classes` | Dodanie klasy (400 przy duplikacie value+education_level). Zwraca 201. |
| DELETE | `/levels/classes/{education_level}/{value}` | Usunięcie klasy. Zwraca 204. |

#### Files (`/api/files`)

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| POST | `/files` | Upload pliku (PDF, DOCX, JPG, PNG). Walidacja MIME, zapis na dysk, SHA-256, tło ekstrakcja tekstu. Zwraca 201. |
| GET | `/files` | Lista plików użytkownika (opcjonalny filtr `subject_id`). Wykluczenie soft-deleted. |
| GET | `/files/{file_id}/download` | Pobranie pliku źródłowego (walidacja właściciela i `deleted_at IS NULL`). |
| DELETE | `/files/{file_id}` | Soft-delete pliku (ustawienie `deleted_at`). Zwraca 204. |

#### Generations (`/api/generations`)

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| POST | `/generations` | Tworzenie generacji z pełnymi parametrami. Linkowanie source files. Status `"processing"`. Background task `generate_prototype_task`. Zwraca 201. |
| GET | `/generations/{generation_id}` | Pobranie statusu/szczegółów generacji (polling). |
| GET | `/generations` | Paginowana lista generacji. Filtry: `subject_id`, `status_filter`. |

#### Prototypes (`/api/prototypes`)

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/prototypes` | Lista wersji roboczych (prototypy BEZ aktywnego dokumentu końcowego). |
| GET | `/prototypes/{generation_id}` | Pobranie prototypu po `generation_id`. |
| PUT | `/prototypes/{generation_id}` | Zapis edytowanej treści + opcjonalny `comments_json`. |
| DELETE | `/prototypes/{generation_id}` | Usunięcie wersji roboczej (blokada gdy istnieje aktywny dokument). Zwraca 204. |
| POST | `/prototypes/{generation_id}/restore` | Przywrócenie oryginału — ustawienie `edited_content` na None. |
| POST | `/prototypes/{generation_id}/reprompt` | AI Reprompt (async, 90s timeout). Wymaga aktywnego klucza API. Dwa tryby: free-form (`call_openrouter_reprompt_free_form`) i Q&A (`call_openrouter_reprompt`). |
| POST | `/prototypes/{generation_id}/copy` | Duplikacja wersji roboczej (generation + prototype + source file links). Sufiks `copy` w temacie. Zwraca 201. Blokada dla sfinalizowanych materiałów (400). |

#### Documents (`/api/documents`)

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| POST | `/documents/{generation_id}/finalize` | Generacja finalnego DOCX z generacji (status musi być `"ready"` lub `"finalized"`). Zwraca 201. |
| GET | `/documents/{document_id}` | Pobranie dokumentu ze szczegółami (join: Generation/Prototype/Subject). Wykluczenie soft-deleted. |
| PUT | `/documents/{document_id}` | Aktualizacja treści dokumentu (w `Prototype.edited_content` + `comments_json`). |
| GET | `/documents/{document_id}/export/docx` | Pobranie pliku DOCX. |
| GET | `/documents/{document_id}/export/pdf` | Konwersja i pobranie PDF (Markdown → Pandoc → PDF). |
| GET | `/documents` | Paginowana lista dokumentów. Filtry: `subject_id`, `content_type`, `class_level`, `sort_by`. Wykluczenie soft-deleted. |
| GET | `/documents/{document_id}/download` | Pobranie pliku DOCX. |
| POST | `/documents/bulk-download` | Pobranie wielu dokumentów jako ZIP. Body: `document_ids`. |
| DELETE | `/documents/{document_id}` | Soft-delete dokumentu. Zwraca 204. |
| POST | `/documents/{document_id}/move-to-draft` | Przeniesienie do wersji roboczej: soft-delete dokumentu, status generacji → `"ready"`, odświeżenie `updated_at`. Zwrot `generation_id`. |
| POST | `/documents/{document_id}/copy` | Deep copy: duplikacja generation/prototype/document + source file links + fizyczny plik DOCX. Sufiks `copy`. Zwraca 201. |

#### Backups (`/api/backups`) — superuser-only

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| POST | `/backups` | Ręczne tworzenie kopii zapasowej. Zwraca 201. |
| GET | `/backups` | Lista dostępnych kopii zapasowych. |
| POST | `/backups/restore` | Przywrócenie bazy z kopii (query param `backup_id`). |
| GET | `/backups/{backup_id}/download` | Pobranie kopii jako ZIP. |
| POST | `/backups/upload` | Upload zewnętrznej kopii `.zip` (walidacja `dump.json`, 7-dniowy expiry). |

#### Diagnostics (`/api/diagnostics`) — superuser-only

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/diagnostics/logs` | Paginowane logi diagnostyczne. Filtry: `level`, `page`, `per_page`. |
| GET | `/diagnostics/export` | Eksport logów jako plik JSONL. Opcjonalny filtr `level`. Max 100k rekordów. |

#### Admin (`/api/admin`) — superuser-only

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/admin/me` | Weryfikacja uprawnień superuser. |
| GET | `/admin/users` | Paginowana lista użytkowników z wyszukiwaniem (`search` → ILIKE po email/first_name/last_name). |
| PUT | `/admin/users/{user_id}` | Edycja danych użytkownika (email z walidacją unikalności → 409). |
| DELETE | `/admin/users/{user_id}` | Usunięcie użytkownika (blokada usunięcia własnego konta → 400). |
| POST | `/admin/users/{user_id}/reset-password` | Reset hasła użytkownika (min 8 znaków). Czyszczenie tokenów i reset `failed_login_attempts`. |

#### Curriculum (`/api/curriculum`) — mixed auth

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/curriculum/documents` | Lista dokumentów PP. Publiczny. Filtry: `education_level`, `subject_name`. |
| POST | `/curriculum/documents` | Upload PDF (superuser). Metadata: `education_level`, `subject_name`, `description`. |
| GET | `/curriculum/documents/{id}` | Szczegóły dokumentu PP (publiczny). |
| GET | `/curriculum/documents/{id}/download` | Pobranie pliku PDF (publiczny). |
| DELETE | `/curriculum/documents/{id}` | Usunięcie dokumentu i chunków (superuser). |
| GET | `/curriculum/documents/{id}/status` | Status przetwarzania (superuser). |
| POST | `/curriculum/documents/{id}/reprocess` | Ponowne przetworzenie PDF (superuser). |
| POST | `/curriculum/search` | Wyszukiwanie semantyczne w chunkach PP (zalogowany). |
| POST | `/curriculum/compliance/{generation_id}` | Sprawdzenie zgodności pytań generacji z PP (zalogowany). |

### Uprawnienia — podsumowanie

| Dependency | Routery |
|---|---|
| `get_current_superuser` | admin, backups, diagnostics, curriculum (upload/delete/status/reprocess) |
| `get_current_user` | auth (większość), documents, files, generations, levels, prototypes, secret-keys, settings, subjects, user-ai-models, curriculum (search/compliance) |
| Brak autoryzacji | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/verify-email-change`, task-types (wszystkie), curriculum (list/get/download) |

---

## 8. Schematy Pydantic (`app/schemas/`)

Schematy request/response zorganizowane w dedykowane pliki:

- **`auth.py`** — `RegisterRequest`, `LoginRequest`, `LoginResponse`, `UserResponse`, `LogoutResponse`, `UpdateProfileRequest`, `ChangePasswordRequest`, `UserStatsResponse`, `RequestEmailChangeRequest/Response`, `ConfirmEmailChangeResponse`, `RequestPasswordChangeCodeRequest/Response`, `ConfirmPasswordChangeRequest/Response`.
- **`admin.py`** — `AdminUserResponse`, `AdminUserListResponse`, `AdminUserUpdateRequest`, `AdminResetPasswordRequest`, `AdminSimpleMessageResponse`.
- **`generation.py`** — `GenerationCreate` (z walidacją cross-field: `closed_questions`, `content_type` enum, `difficulty` 1–5, `variants_count` 1–6), `GenerationResponse`, `GenerationListResponse`.
- **`prototype.py`** — `PrototypeResponse`, `PrototypeUpdate`, `RepromptRequest`, `PrototypeListItemResponse`, `PrototypeListResponse`.
- **`document.py`** — `DocumentResponse`, `DocumentDetailResponse`, `DocumentListItemResponse`, `DocumentUpdateRequest`, `DocumentListResponse`, `BulkDownloadRequest`, `MoveToDraftResponse`.
- **`file.py`** — `FileResponse` (z `has_extracted_text`, `extraction_error`), `FileListResponse`.
- **`secret_key.py`** — `SecretKeyCreate` (dozwolona platforma: `openrouter`, max key len: 512), `SecretKeyResponse`, `SecretKeyValidateResponse`.
- **`user_ai_model.py`** — `UserAIModelCreate` (lowercased provider/model_name), `UserAIModelResponse`.
- **`subject.py`** — `SubjectCreate` (regex walidacja — polskie znaki diakrytyczne), `SubjectResponse`.
- **`settings.py`** — `SettingsResponse`, `SettingsUpdate`.
- **`backup.py`** — `BackupResponse`, `BackupListResponse`.
- **`diagnostic.py`** — `DiagnosticLogResponse`, `DiagnosticListResponse`.
- **`curriculum.py`** — `CurriculumDocumentResponse`, `CurriculumDocumentListResponse`, `CurriculumChunkResponse`, `CurriculumSearchRequest/Result/Response`, `ComplianceQuestionResult`, `ComplianceResponse`, `CurriculumStatusResponse`.

---

## 9. Zabezpieczenia i Ochrona Danych

- **JWT (JSON Web Tokens)** — bezstanowa autoryzacja, tokeny podpisywane `HS256`, czas życia 30 min.
- **Izolacja danych** — każdy zasób filtrowany po `user_id`, brak dostępu między użytkownikami.
- **Szyfrowanie kluczy API** — `app/encryption.py` używa Fernet (symetryczne szyfrowanie z biblioteki `cryptography`). Klucz zapisany w `{DATA_DIR}/fernet.key`, auto-generowany przy pierwszym użyciu. Lazy-loaded singleton.
- Hashowanie haseł via `bcrypt` z śledzeniem nieudanych prób logowania (`failed_login_attempts`).
- Path Traversal Protection — operacje plikowe ograniczone do `DATA_DIR`.
- Cookie `edugen-auth` z `SameSite=Lax`, `httponly=False` i 7-dniowym max-age.
- Frontend po `login/logout` czyści cache zapytań (React Query), co eliminuje chwilowe wyświetlenie danych innego użytkownika po przelogowaniu i wzmacnia izolację danych opartą o `user_id` po stronie API.

---

## 10. Testy

### Pliki testowe (`backend/tests/`)

| Plik | Zakres |
|------|--------|
| `conftest.py` | Fixtury: sesja DB, klient HTTP, mockowane zależności |
| `test_admin_router.py` | Endpointy administracyjne |
| `test_auth_router.py` | Rejestracja, logowanie, profil, zmiana e-mail/hasła |
| `test_auth_service.py` | Serwis uwierzytelniania (hashowanie, JWT, rejestracja) |
| `test_backups_router.py` | Tworzenie/przywracanie/upload kopii zapasowych |
| `test_container_config_regression.py` | Testy regresyjne: Dockerfile i docker-compose.yml |
| `test_diagnostic_service.py` | Serwis logów diagnostycznych |
| `test_diagnostics_router.py` | Endpointy diagnostyczne |
| `test_docx_service.py` | Eksport DOCX/PDF |
| `test_encryption.py` | Szyfrowanie/deszyfrowanie Fernet |
| `test_files_router.py` | Upload/pobieranie/usuwanie plików |
| `test_generation_service.py` | Serwis generowania materiałów |
| `test_generations_router.py` | Endpointy generacji |
| `test_levels_router.py` | Poziomy edukacji i klas |
| `test_prototypes_router.py` | Edytor wersji roboczych |
| `test_schemas.py` | Walidacja schematów Pydantic |
| `test_secret_keys_router.py` | Zarządzanie kluczami API |
| `test_settings_documents_router.py` | Ustawienia i dokumenty |
| `test_subjects_router.py` | Przedmioty edukacyjne |
| `test_task_types_router.py` | Typy zadań |
| `test_user_ai_models_router.py` | Modele AI użytkownika |
| `test_verification_service.py` | Tokeny/kody weryfikacyjne |

### Testy regresyjne konfiguracji kontenerów

- Plik testowy: `backend/tests/test_container_config_regression.py`
- Zakres testów:
	- `backend/Dockerfile`: obecność wymaganych pakietów systemowych (`pandoc`, `fontconfig`, `fonts-dejavu-core`, `libmagic1`, `pkg-config`, `libcairo2-dev`), walidacja fontu DejaVu Sans, instalacja zależności przez `uv sync --frozen`, komenda startowa z `init_app.py` i `uvicorn`.
	- `docker-compose.yml`: obecność usług `postgres`, `backend`, `frontend`, pinning obrazu `postgres:16`, healthcheck backendu (`/api/health`), zależność backendu od zdrowego Postgresa, montowanie `backend/common_filles` w trybie read-only i sieć bridge.

### Ręczne uruchamianie testów backendu

Testy backendu uruchamiane są ręcznie z katalogu głównego projektu dedykowanymi skryptami:

- Windows: `run_tests_windows.bat`
- macOS/Linux: `run_tests_mac_linux.sh`

---

## 11. Zależności (`pyproject.toml`)

**Projekt:** `edugen-backend` v0.1.0, Python ≥ 3.12, build system: Hatchling.

### Zależności produkcyjne (23 pakiety)

| Pakiet | Wersja |
|--------|--------|
| `fastapi[standard]` | ≥0.115.0 |
| `uvicorn[standard]` | ≥0.30.0 |
| `sqlalchemy` | ≥2.0 |
| `alembic` | ≥1.13.0 |
| `bcrypt` | ≥4.0.0 |
| `cryptography` | ≥42.0 |
| `python-multipart` | ≥0.0.9 |
| `requests` | ≥2.31.0 |
| `pymupdf` | ≥1.24.0 |
| `python-docx` | ≥1.1.0 |
| `python-magic` | ≥0.4.27 |
| `pydantic-settings` | ≥2.2.0 |
| `aiofiles` | ≥23.2.0 |
| `apscheduler` | ≥3.10.0 |
| `psycopg[binary]` | ≥3.1.0 |
| `pyjwt` | ≥2.8.0 |
| `email-validator` | ≥2.0.0 |
| `markdownify` | ≥0.14.1 |
| `pypandoc` | ≥1.14 |
| `beautifulsoup4` | ≥4.12.0 |
| `xhtml2pdf` | ≥0.2.17 |
| `langchain-text-splitters` | ≥0.2.0 |
| `pgvector` | ≥0.3.0 |

### Zależności testowe (extra `test`)

| Pakiet | Wersja |
|--------|--------|
| `pytest` | ≥8.0 |
| `httpx` | ≥0.27 |

### Pakiety systemowe (Dockerfile, `python:3.12-slim`)

`curl`, `build-essential`, `pkg-config`, `libcairo2-dev`, `libmagic1`, `pandoc`, `fontconfig`, `fonts-dejavu-core`, `poppler-utils`

### Zasoby kopiowane do obrazu backendu

- `backend/common_filles/*` jest kopiowane w buildzie jako `/app/common_filles/*` (`COPY common_filles ./common_filles`).
