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
│   ├── encryption.py         # Szyfrowanie kluczy API (cryptography)
│   ├── init_app.py           # Skrypt inicjalizacyjny: migracje, katalogi
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
│   │   └── verification_token.py
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
│   │   └── user_ai_models.py
│   ├── schemas/              # Pydantic modele request/response
│   └── services/
│       ├── ai_service.py
│       ├── auth_service.py
│       ├── backup_service.py
│       ├── diagnostic_service.py
│       ├── docx_service.py
│       ├── email_service.py
│       ├── file_service.py
│       ├── generation_service.py
│       └── verification_service.py
├── alembic/
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
│       ├── 001_initial_schema.py
│       └── 002_add_verification_tokens.py
├── alembic.ini
├── Dockerfile
└── pyproject.toml
```


## 1. Architektura ogólna

Projekt EduGen opiera się na nowoczesnym, modularnym backendzie. Składa się on z następujących kluczowych elementów:
- **Framework REST API** — FastAPI.
- **Baza danych** — PostgreSQL 16 z wykorzystaniem SQLAlchemy ORM oraz Alembic do zarządzania migracjami schematu.
- **Konteneryzacja** — Docker Compose z trzema serwisami: `postgres`, `backend`, `frontend`. Backend i Postgres komunikują się przez wewnętrzną sieć `backend_network`.
- **Integracja AI** — Komunikacja z modelami AI poprzez OpenRouter API (`https://openrouter.ai/api/v1/chat/completions`) w celu generowania dedykowanych treści edukacyjnych. Wykorzystywana jest biblioteka `requests` zamiast dedykowanego SDK.
- **Menedżer pakietów** — Skonfigurowany za pomocą `pyproject.toml` (wymaga Pythona >= 3.12).
- **Zadania w tle (Background Tasks)** — `apscheduler` dla codziennych kopii zapasowych oraz tła dla asynchronicznego generowania materiałów edukacyjnych.
- **Logowanie** — Centralnie skonfigurowany Python `logging` ze znacznikami czasu (`app/logging_config.py`). Format: `YYYY-MM-DD HH:MM:SS [LEVEL   ] moduł: treść`.

### Główne katalogi w `backend/`:
- `app/` — Główny kod źródłowy aplikacji (FastAPI, w tym endpointy, serwisy, modele, obiekty przesyłu).
- `alembic/` — Migracje bazy danych.

---

## 2. Backend – Punkt wejścia API

### `backend/app/main.py`
To centrum zarządzania całą aplikacją, definiujące aplikację FastAPI oraz uruchamiające się procesy.

**Lifespan & Mechanizmy Startowe:**
- `configure_logging()` — pierwsza instrukcja przy starcie; konfiguruje logger zgodnie z `app/logging_config.py`.
- `_ensure_directories()` — automatyczne tworzenie folderów (`data/`, `data/subjects/`, `data/documents/`, `data/backups/`).
- `_start_backup_scheduler()` — inicjuje background scheduler (APScheduler) wykonujący dzienny dump bazy (`daily_backup`).

**Middleware i routery:**
- Załączony `CORSMiddleware`, pobierający listę adresów z `config.py`.
- Rejestrowane routery API dla kluczowych modułów: `auth`, `settings`, `subjects`, `files`, `generations`, `prototypes`, `documents`, `backups`, `diagnostics`, `levels`, `task_types`, `admin`.
- **Global exception handler** — przechwytuje wyjątki (kod 500) i automatycznie zapisuje szczegóły błędu (z tracebackiem i url) do własnej struktury `DiagnosticLog`.

---

## 3. Backend – Pliki konfiguracyjne i baza

### `backend/app/logging_config.py`
Centralna konfiguracja Pythonowego `logging` dla całej aplikacji:
- `configure_logging(level)` — konfiguruje root logger poprzez `logging.config.dictConfig`. Bezpieczna do wielokrotnego wywołania (działa idempotentnie).
- Format wyjścia: `YYYY-MM-DD HH:MM:SS [LEVEL   ] nazwa.modułu: treść wiadomości`
- Handler: `StreamHandler → stdout` (kompatybilny z Docker/kontenerami).
- Wyciszeni zewnętrzni: `uvicorn.access` (WARNING), `apscheduler` (WARNING), `sqlalchemy.engine` (WARNING).
- Używana przez: `main.py` (startup), `init_app.py` (skrypt inicjalizacyjny).

### `backend/app/config.py`
Moduł zarządzania zmiennymi środowiskowymi przez `pydantic-settings`:
- `DATABASE_URL` (domyślnie `postgresql+psycopg://edugen_user:edugen_pass@localhost:5432/edugen`)
- `DATA_DIR`, `MAX_FILE_SIZE_MB`, `CORS_ORIGINS`
- `JWT_SECRET_KEY` — klucz do podpisywania tokenów JWT (auto-generowany jeśli nie ustawiony w `.env`)
- `JWT_ALGORITHM` — algorytm podpisu (domyślnie `HS256`)
- `JWT_EXPIRATION_MINUTES` — czas życia tokena JWT (domyślnie `30` minut)

> **Szablon konfiguracji:** Główny katalog projektu zawiera plik **`.env.example`**, który jest domyślnym szablonem konfiguracyjnym. Skrypty startowe (`start_windows.bat` / `start_mac_linux.sh`) automatycznie kopiują go do pliku `.env` w głównym katalogu, jeśli plik ten nie istnieje.

### `backend/app/database.py`
Konfiguracja silnika SQLAlchemy (PostgreSQL):
- `pool_pre_ping=True` — zapewnia odporność połączenia na przerwy w komunikacji z bazą.
- `get_db()` — Dependency injection (wstrzykiwanie sesji bazy do endpointów).

### `docker-compose.yml`
Definicja trzech serwisów:
- **postgres** — PostgreSQL 16 z health checkiem, wolumenem `edugen_postgres_data`, w sieci `backend_network`.
- **backend** — FastAPI z `DATABASE_URL` wskazującym na kontener Postgres, zależny od healthy Postgres.
- **frontend** — Next.js, zależny od healthy backendu. Przekazuje `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_VERSION`, `NEXT_PUBLIC_APP_RELEASE_DATE` jako build args (inlinowane przez Next.js podczas budowania obrazu).

---

## 4. Baza Danych i Modele (`app/models/`)

Kod dzieli się na dedykowane pliki modelowe oparte na `DeclarativeBase`. Kluczowe encje:
- **`user.py`** — Multi-user: `email` (unikalne, indeksowane), `first_name`, `last_name`, `is_active`, `is_superuser`, `premium_level`, `api_quota`, `api_quota_reset`, `is_email_verified`, `email_verification_token`, `reset_password_token`, `last_password_change`, `failed_login_attempts`, `default_model`. Relacje do `SecretKey`, `Subject`, `Generation`, `SourceFile`, `Document`, `Prototype`.
- **`secret_key.py`** — Przechowywanie zewnętrznych kluczy API (platform, key_name, secret_key_hash, is_active, last_used_at). FK → `users.id`.
- **`generation.py`** & **`prototype.py`** — Logika zadań AI: parametry generacji a zrenderowane rezultaty docelowe JSON/HTML. Pole `user_id` (FK → `users.id`, NOT NULL) zapewnia izolację danych per użytkownik. Pole `comments_json` (TEXT, nullable) przechowuje strukturyzowany JSON z komentarzami użytkownika z edytora TipTap (wyodrębnione z HTML `<mark class="tiptap-comment" data-comment="...">`).
- **`source_file.py`** & **`document.py`** — Przetwarzanie dokumentów dostarczanych przez użytkownika. Oba zawierają `user_id` (FK → `users.id`, NOT NULL).
- **`ai_request.py`** — Logi zapytań do modeli AI (OpenRouter). `user_id` (FK → `users.id`, nullable).
- **`subject.py`** — Przedmioty edukacyjne. `user_id` (FK → `users.id`, nullable — predefinowane przedmioty nie mają właściciela).
- **`diagnostic_log.py`** — Logowanie wszystkich błędów rzuconych w apce poprzez exception handler.
- **`verification_token.py`** — Tokeny/kody weryfikacyjne do zmiany e-mail (link URL-safe, 24h) i zmiany hasła (6-cyfrowy kod, 5 min). FK → `users.id`. Przechowują payload JSON z danymi operacji (np. nowy e-mail, nowy hash hasła).

> **Usunięte modele:** `session.py` — usunięty, JWT zastępuje sesje serwerowe. `settings.py` — usunięty, preferencja modelu przeniesiona do `users.default_model`, klucze API do tabeli `secret_keys`.

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
- AI requests: powiązane z użytkownikiem (nullable).

---

## 6. Serwisy i Logika Biznesowa (`app/services/`)

Zbiór usług wyizolowany z kontrolerów, separujący szczegóły implementacyjne API (routery) od logiki domenowej.

### `auth_service.py`
Obsługa uwierzytelniania JWT:
- `hash_password()` / `verify_password()` — hashowanie bcrypt.
- `create_access_token(user_id, email)` — tworzenie JWT z claimami `sub`, `email`, `iat`, `exp`.
- `verify_access_token(token)` — dekodowanie i walidacja JWT (zwraca payload lub None).
- `authenticate_user(db, email, password)` — logowanie na podstawie emaila, śledzenie `failed_login_attempts`.
- `register_user(db, email, password, ...)` — rejestracja nowego użytkownika z automatycznym tworzeniem domyślnych modeli AI.

### `ai_service.py`
Odpowiada za logikę formowania wytycznych promptów i połączenie z OpenRouter API:
- System prompts dla typów generacji: `test`, `worksheet`, `lesson_materials`, `quiz`, `exam`.
- Wewnętrzna funkcja `_call_openrouter()` realizuje połączienie HTTP z `https://openrouter.ai/api/v1/chat/completions`.
- Formatyzacja odpowiedzi w trybie JSON (`response_format: {"type": "json_object"}`).
- **Logowanie** każdego z żądań/odpowiedzi w tabeli `AIRequest`.
- Funkcje `call_openrouter_reprompt` oraz `call_openrouter_reprompt_free_form` do udoskonalania wyników AI (oba korzystają z OpenRouter).
- Model używany do generacji pobierany z `User.default_model` (format `provider/model_name`).
### `generation_service.py`
Orkiestracja procesu generowania materiałów:
- Worker w tle (`generate_prototype_task`) pobierający klucz API z `SecretKey` (tabela `secret_keys`), **filtrowanych po `generation.user_id`** (izolacja danych). Model pobierany z `User.default_model`.
- Mapowanie wygenerowanych JSONów do HTML (`_render_content_html`) i kluczy odpowiedzi (`_build_answer_key`).

### Inne serwisy:
- **`docx_service.py`**: Eksport do MS Word z wariantami. Document tworzony z `user_id`.
- **`file_service.py`**: Obsługa `pymupdf`, `python-docx` z cache'em SHA-256 (`file_content_cache`). OCR i summary korzystają z OpenRouter REST API (requests). Detekcja MIME używa `python-magic` (libmagic), a gdy `libmagic` nie jest dostępne (typowo Windows), działa fallback oparty o sygnatury pliku i rozszerzenie nazwy.
- **`backup_service.py`**: Kopie zapasowe bazy.
- **`verification_service.py`**: Generacja i walidacja tokenów/kodów weryfikacyjnych:
  - `create_email_change_token(db, user, new_email)` — tworzy token URL-safe (48 znaków) ważny 24h z payloadem `{"new_email": "..."}`.
  - `confirm_email_change(db, token)` — waliduje token, sprawdza wygaśnięcie i unikalność e-mail, aplikuje zmianę.
  - `create_password_change_code(db, user, new_password_hash)` — tworzy 6-cyfrowy kod numeryczny ważny 5 min z payloadem `{"new_password_hash": "..."}`.
  - `confirm_password_change(db, user_id, code)` — waliduje kod i aplikuje nowe hasło.
  - Automatycznie unieważnia poprzednie nieużyte tokeny tego samego typu.
- **`email_service.py`**: Stub do wysyłki e-maili weryfikacyjnych. W trybie lokalnym loguje treść na konsolę zamiast faktycznego wysyłania. Przygotowany pod przyszłą integrację z SMTP / SendGrid / Mailgun.

---

## 7. Endpointy i Routery (`app/routers/`)

Architektura grupuje endpointy na określone sfery:
| Router | Opis używalności API |
|---|---|
| `/api/auth` | JWT: rejestracja (POST `/register`), logowanie (POST `/login`), wylogowanie (POST `/logout`), profil (GET `/me`). Weryfikowana zmiana e-mail (POST `/me/request-email-change`, GET `/verify-email-change`). Weryfikowana zmiana hasła (POST `/me/request-password-change`, POST `/me/confirm-password-change`). |
| `/api/settings` | Ustawienia użytkownika — wybór modelu AI (`default_model` w tabeli `users`). Filtrowane po `user_id`. |
| `/api/secret-keys` | CRUD kluczy API użytkownika (SecretKey). Dodawanie, usuwanie, walidacja klucza via OpenRouter API. Filtrowane po `user_id`. |
| `/api/subjects` | Przedmioty edukacyjne (predefinowane + własne użytkownika). Filtrowane po `user_id`. |
| `/api/task-types` | Pobieranie i dodawanie własnych typów zadań. |
| `/api/files` | Wrzucanie i cache'owanie plików pomocniczych. Filtrowane po `user_id`. |
| `/api/generations` | Rozpoczęcie generacji materiałów (background task). Filtrowane po `user_id`. |
| `/api/prototypes` | Edytor generowanych materiałów z AI Reprompt. Weryfikacja własności przez `Generation.user_id`. Zawiera także listę wersji roboczych (prototypy bez aktywnego dokumentu końcowego). |
| `/api/documents` | Finalizowane pliki DOCX. Filtrowane po `user_id`. Bulk download z izolacją. |
| `/api/backups` | Zarządzanie kopiami zapasowymi. |
| `/api/diagnostics` | Dashboard logów błędów i zapytań AI. |
| `/api/admin` | Endpointy administracyjne (superuser-only): weryfikacja dostępu, zarządzanie użytkownikami. |

### Uprawnienia administracyjne (backend-first)

- Routery administracyjne korzystają z dependency `get_current_superuser`.
- Dostęp do danych diagnostycznych i backupów został ograniczony do superusera:
	- `GET /api/diagnostics/logs`
	- `GET /api/diagnostics/export`
	- `GET /api/backups`
	- `POST /api/backups`
	- `POST /api/backups/restore`
	- `GET /api/backups/{backup_id}/download`
	- `POST /api/backups/upload`

### Admin API — użytkownicy

- `GET /api/admin/me` — backendowa weryfikacja uprawnień superuser.
- `GET /api/admin/users` — lista użytkowników (paginacja).
- `PUT /api/admin/users/{user_id}` — edycja danych użytkownika.
- `DELETE /api/admin/users/{user_id}` — usunięcie użytkownika.
- `POST /api/admin/users/{user_id}/reset-password` — reset hasła użytkownika.

### Dodatkowe endpointy workflow (wersje robocze i pliki)

- **Pliki źródłowe:**
	- `GET /api/files/{file_id}/download` — pobieranie wcześniej wgranego pliku źródłowego (`SourceFile.original_path`) z walidacją właściciela i `deleted_at IS NULL`.
	- `POST /api/documents/{document_id}/copy` — duplikacja materiału końcowego (deep copy: generation/prototype/document + powiązania source files), nowa nazwa z sufiksem `copy` i nowa data utworzenia.

- **Prototypy / wersje robocze:**
	- `GET /api/prototypes` — lista wersji roboczych do edycji (prototypy użytkownika, dla których nie istnieje aktywny dokument końcowy).
	- `DELETE /api/prototypes/{generation_id}` — usuwanie wersji roboczej (kasowanie `generation` z kaskadą do `prototype`), z blokadą gdy istnieje aktywny dokument końcowy.
	- `POST /api/prototypes/{generation_id}/copy` — duplikacja wersji roboczej (generation + prototype + powiązania source files), nowy temat z sufiksem `copy` i nowe znaczniki czasu.
	- Odpowiedź zawiera metadane do drill-down: `content_type`, `education_level`, `class_level`, `subject_id`, `subject_name`, `title`, `updated_at`.

- **Dokumenty końcowe → wersje robocze:**
	- `POST /api/documents/{document_id}/move-to-draft` — zamienia dokument końcowy na wersję roboczą:
		- soft-delete dokumentu (`documents.deleted_at`),
		- ustawienie `generation.status = "ready"`,
		- odświeżenie `updated_at` dla `generation` i `prototype`,
		- zwrot `generation_id` do przekierowania użytkownika do edytora roboczego.

---

## 8. Zabezpieczenia i Ochrona Danych

- **JWT (JSON Web Tokens)** — bezstanowa autoryzacja, tokeny podpisywane `HS256`, czas życia 30 min.
- **Izolacja danych** — każdy zasób filtrowany po `user_id`, brak dostępu między użytkownikami.
- Logika szyfrująca dla kluczy API (`app/encryption.py`, klasa bazująca na `cryptography` z kluczami z `.env`).
- Hashowanie haseł via `bcrypt` z śledzeniem nieudanych prób logowania.
- Path Traversal Protection — operacje plikowe ograniczone do `DATA_DIR`.
- Cookie `edugen-auth` z `SameSite=Lax` i 7-dniowym max-age.
- Frontend po `login/logout` czyści cache zapytań (React Query), co eliminuje chwilowe wyświetlenie danych innego użytkownika po przelogowaniu i wzmacnia izolację danych opartą o `user_id` po stronie API.
