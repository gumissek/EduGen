# Struktura projektu EduGen (Backend)

Podczas wprowadzania zmian w projekcie, zawsze przestrzegaj poniższej struktury katalogów i konwencji.

---

## 1. Architektura ogólna

Projekt EduGen opiera się na nowoczesnym, modularnym backendzie. Składa się on z następujących kluczowych elementów:
- **Framework REST API** — FastAPI.
- **Baza danych** — PostgreSQL 16 z wykorzystaniem SQLAlchemy ORM oraz Alembic do zarządzania migracjami schematu.
- **Konteneryzacja** — Docker Compose z trzema serwisami: `postgres`, `backend`, `frontend`. Backend i Postgres komunikują się przez wewnętrzną sieć `backend_network`.
- **Integracja AI** — Komunikacja z modelami OpenAI API w celu generowania dedykowanych treści edukacyjnych.
- **Menedżer pakietów** — Skonfigurowany za pomocą `pyproject.toml` (wymaga Pythona >= 3.12).
- **Zadania w tle (Background Tasks)** — `apscheduler` dla codziennych kopii zapasowych oraz tła dla asynchronicznego generowania materiałów edukacyjnych.

### Główne katalogi w `backend/`:
- `app/` — Główny kod źródłowy aplikacji (FastAPI, w tym endpointy, serwisy, modele, obiekty przesyłu).
- `alembic/` — Migracje bazy danych.

---

## 2. Backend – Punkt wejścia API

### `backend/app/main.py`
To centrum zarządzania całą aplikacją, definiujące aplikację FastAPI oraz uruchamiające się procesy.

**Lifespan & Mechanizmy Startowe:**
- `_ensure_directories()` — automatyczne tworzenie folderów (`data/`, `data/subjects/`, `data/documents/`, `data/backups/`).
- `_start_backup_scheduler()` — inicjuje background scheduler (APScheduler) wykonujący dzienny dump bazy (`daily_backup`).

**Middleware i routery:**
- Załączony `CORSMiddleware`, pobierający listę adresów z `config.py`.
- Rejestrowane routery API dla kluczowych modułów: `auth`, `settings`, `subjects`, `files`, `generations`, `prototypes`, `documents`, `backups`, `diagnostics`, `levels`, `task_types`.
- **Global exception handler** — przechwytuje wyjątki (kod 500) i automatycznie zapisuje szczegóły błędu (z tracebackiem i url) do własnej struktury `DiagnosticLog`.

---

## 3. Backend – Pliki konfiguracyjne i baza

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
- **frontend** — Next.js, zależny od healthy backendu.

---

## 4. Baza Danych i Modele (`app/models/`)

Kod dzieli się na dedykowane pliki modelowe oparte na `DeclarativeBase`. Kluczowe encje:
- **`user.py`** — Multi-user: `email` (unikalne, indeksowane), `first_name`, `last_name`, `is_active`, `is_superuser`, `premium_level`, `api_quota`, `api_quota_reset`, `is_email_verified`, `email_verification_token`, `reset_password_token`, `last_password_change`, `failed_login_attempts`. Relacje do `UserSettings`, `SecretKey`, `Subject`, `Generation`, `SourceFile`, `Document`, `Prototype`.
- **`secret_key.py`** — Przechowywanie zewnętrznych kluczy API (platform, key_name, secret_key_hash, is_active, last_used_at). FK → `users.id`.
- **`generation.py`** & **`prototype.py`** — Logika zadań AI: parametry generacji a zrenderowane rezultaty docelowe JSON/HTML. Pole `user_id` (FK → `users.id`, NOT NULL) zapewnia izolację danych per użytkownik.
- **`source_file.py`** & **`document.py`** — Przetwarzanie dokumentów dostarczanych przez użytkownika. Oba zawierają `user_id` (FK → `users.id`, NOT NULL).
- **`settings.py`** — Klucz API OpenAI zapisywany jako AES encrypted string, konfig modelów LLM. FK → `users.id`.
- **`ai_request.py`** — Logi zapytań do modeli OpenAI. `user_id` (FK → `users.id`, nullable).
- **`subject.py`** — Przedmioty edukacyjne. `user_id` (FK → `users.id`, nullable — predefinowane przedmioty nie mają właściciela).
- **`diagnostic_log.py`** — Logowanie wszystkich błędów rzuconych w apce poprzez exception handler.

> **Usunięte modele:** `session.py` — usunięty, JWT zastępuje sesje serwerowe.

---

## 5. Autoryzacja JWT (`app/dependencies.py`)

Backend wykorzystuje bezstanową autoryzację opartą na **JWT (JSON Web Tokens)**:

### `get_current_user()`:
- Odczyt tokena na dwustopniowy wariant: (1) Ciasteczko `edugen-auth`, (2) Nagłówek HTTP `Authorization: Bearer <JWT>`.
- Dekodowanie i walidacja JWT przez `verify_access_token()` (sprawdzenie podpisu i `exp` claim).
- Pobranie użytkownika z bazy na podstawie `sub` (user_id) z payloadu JWT.
- Weryfikacja `is_active` — zablokowane konta otrzymują `403 Forbidden`.

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
- `register_user(db, email, password, ...)` — rejestracja nowego użytkownika z automatycznym tworzeniem `UserSettings`.

### `ai_service.py`
Odpowiada za logikę formowania wytycznych promptów i połączenie z zasobami OpenAI:
- System prompts dla typów generacji: `test`, `worksheet`, `lesson_materials`, `quiz`, `exam`.
- Formatyzacja odpowiedzi do modelu API OpenAI — tryb `{"type": "json_object"}`.
- **Logowanie** każdego z żądań/odpowiedzi w tabeli `AIRequest`.
- Funkcje `call_openai_reprompt` oraz `call_openai_reprompt_free_form` do udoskonalania wyników AI.

### `generation_service.py`
Orkiestracja procesu generowania materiałów:
- Worker w tle (`generate_prototype_task`) pobierający klucz API z `UserSettings` **filtrowanych po `generation.user_id`** (izolacja danych).
- Mapowanie wygenerowanych JSONów do HTML (`_render_content_html`) i kluczy odpowiedzi (`_build_answer_key`).

### Inne serwisy:
- **`docx_service.py`**: Eksport do MS Word z wariantami. Document tworzony z `user_id`.
- **`file_service.py`**: Obsługa `pymupdf`, `python-docx` z cache'em SHA-256 (`file_content_cache`).
- **`backup_service.py`**: Kopie zapasowe bazy.

---

## 7. Endpointy i Routery (`app/routers/`)

Architektura grupuje endpointy na określone sfery:
| Router | Opis używalności API |
|---|---|
| `/api/auth` | JWT: rejestracja (POST `/register`), logowanie (POST `/login`), wylogowanie (POST `/logout`), profil (GET `/me`). |
| `/api/settings` | Ustawienia użytkownika — klucze OpenAI (AES encrypted), wybór modelu AI. Filtrowane po `user_id`. |
| `/api/subjects` | Przedmioty edukacyjne (predefinowane + własne użytkownika). Filtrowane po `user_id`. |
| `/api/task-types` | Pobieranie i dodawanie własnych typów zadań. |
| `/api/files` | Wrzucanie i cache'owanie plików pomocniczych. Filtrowane po `user_id`. |
| `/api/generations` | Rozpoczęcie generacji materiałów (background task). Filtrowane po `user_id`. |
| `/api/prototypes` | Edytor generowanych materiałów z AI Reprompt. Weryfikacja własności przez `Generation.user_id`. |
| `/api/documents` | Finalizowane pliki DOCX. Filtrowane po `user_id`. Bulk download z izolacją. |
| `/api/backups` | Zarządzanie kopiami zapasowymi. |
| `/api/diagnostics` | Dashboard logów błędów i zapytań AI. |

---

## 8. Zabezpieczenia i Ochrona Danych

- **JWT (JSON Web Tokens)** — bezstanowa autoryzacja, tokeny podpisywane `HS256`, czas życia 30 min.
- **Izolacja danych** — każdy zasób filtrowany po `user_id`, brak dostępu między użytkownikami.
- Logika szyfrująca dla kluczy API (`app/encryption.py`, klasa bazująca na `cryptography` z kluczami z `.env`).
- Hashowanie haseł via `bcrypt` z śledzeniem nieudanych prób logowania.
- Path Traversal Protection — operacje plikowe ograniczone do `DATA_DIR`.
- Cookie `edugen-auth` z `SameSite=Lax` i 7-dniowym max-age.
