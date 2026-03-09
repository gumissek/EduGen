# Struktura projektu EduGen (Backend)

Podczas wprowadzania zmian w projekcie, zawsze przestrzegaj poniższej struktury katalogów i konwencji.

---

## 1. Architektura ogólna

Projekt EduGen opiera się na nowoczesnym, modularnym backendzie. Składa się on z następujących kluczowych elementów:
- **Framework REST API** — FastAPI.
- **Baza danych** — SQLite z wykorzystaniem SQLAlchemy ORM oraz Alembic do zarządzania migracjami szemy.
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
- `_run_migrations()` — automatyczne uruchamianie schematu baz danych na starcie, dostosowane pod współbieżne procesy dla SQLite (m.in. bezpieczne dodawanie nowych kolumn `ALTER TABLE`).
- `_seed_database()` — tworzy instancję domyślnego użytkownika (`Start1234!`), jeśli baza jest pusta.
- `_start_backup_scheduler()` — inicjuje background scheduler (APScheduler) wykonujący dzienny dump bazy (`daily_backup`).

**Middleware i routery:**
- Załączony `CORSMiddleware`, pobierający listę adresów z `config.py`.
- Rejestrowane routery API dla kluczowych modułów: `auth`, `settings`, `subjects`, `files`, `generations`, `prototypes`, `documents`, `backups`, `diagnostics`, `levels`.
- **Global exception handler** — przechwytuje wyjątki (kod 500) i automatycznie zapisuje szczegóły błędu (z tracebackiem i url) do własnej struktury `DiagnosticLog`.

---

## 3. Backend – Pliki konfiguracyjne i baza

### `backend/app/config.py`
Moduł zarządzania zmiennymi środowiskowymi przez `pydantic-settings`:
- `DATABASE_URL` (domyślnie `sqlite:///./data/edugen.db`)
- `DATA_DIR`, `SESSION_TIMEOUT_MINUTES`, `MAX_FILE_SIZE_MB`, `CORS_ORIGINS`.

### `backend/app/database.py`
Konfiguracja silnika SQLAlchemy (SQLite):
- Włączone mechanizmy PRAGMA specyficzne dla optymalizacji relacyjnych w SQLite: `foreign_keys=ON`, `journal_mode=WAL`, `synchronous=NORMAL`.
- `get_db()` — Dependency injection (wstrzykiwanie sesji bazy do endpointów).

---

## 4. Baza Danych i Modele (`app/models/`)

Kod dzieli się na dedykowane pliki modelowe oparte na `DeclarativeBase`. Kluczowe encje:
- **`user.py`** (Zarządzanie kontami i hasłami, wymuszona zmiana hasła `must_change_password`)
- **`session.py`** (Aktywne sesje auth dla użytkowników, `expires_at`, `token`)
- **`generation.py`** & **`prototype.py`** (Logika zadań AI: parametry generacji a zrenderowane rezultaty docelowe JSON/HTML)
- **`source_file.py`** & **`document.py`** (Przetwarzanie dokumentów dostarczanych przez użytkownika na tekst używany jako kontekst AI)
- **`settings.py`** (Klucz API OpenAI zapisywany jako AES encrypted string, konfig modelów LLM np. gpt-4)
- **`diagnostic_log.py`** (Logowanie wszystkich błędów rzuconych w apce poprzez exception handler).

---

## 5. Zależności i Autoryzacja (`app/dependencies.py`)

Główna kontrola uwierzytelniaczy odbywa się w zależności `get_current_user`:
- Odczyt tokena na trzystopniowy wariant: (1) Ciasteczko HttpOnly `session_token`, (2) Ciasteczko Frontend `edugen-auth`, (3) Nagłówek HTTP `Authorization: Bearer`.
- **Rolling Expiration Mechanism**: Po każdym udanym autoryzowanym żądaniu, sesja użytkownika zyskuje odświeżenie wygasania o kolejne `SESSION_TIMEOUT_MINUTES` minut do przodu, poprawiając UX.

---

## 6. Serwisy i Logika Biznesowa (`app/services/`)

Zbiór usług wyizolowany z kontrolerów, separujący szczegóły implementacyjne API (routery) od logiki domenowej.

### `ai_service.py` 
Odpowiada za logikę formowania wytycznych promptów (tzw. inżynierię promptów) i połączenie z zasobami OpenAI. Działa jako pośrednik z AI.
- Formowanie tzw. **system prompts** m.in. wsparcie dla typów generacji `test`, `worksheet` (karta pracy, oddająca wygenerowany HTML zamiast tablic JSON-owych), `lesson_materials` na określone poziomy wykształcenia i trudności z wykorzystaniem enumów.
- Formatyzacja oczekiwanej odpowiedzi do modelu API OpenAI - tryb `{"type": "json_object"}`. Zależnie od trybu (Pytania i konwersacje wolnostylowe), budowa JSON-a może przyjmować np: `title`, `questions`, `content_html` czy schemat opcji wariancyjnych ABC.
- **Logowanie** każdego z żądań/odpowiedzi i błędów w tabeli `AIRequest`.
- Funkcje `call_openai_reprompt` oraz `call_openai_reprompt_free_form` posługujące udoskonalaniu wcześniej wygenerowanego przez uzytkownika wyniku AI poprzez interaktywne uwagi zwrotne chatbota.

### `generation_service.py`
Orkiestracja całego procesu zadania z AI. 
- Definiuje worker pracujący w tle (`generate_prototype_task`), który zbiera informacje z modeli `Generation` i `SourceFile` (pliki tekstowe ekstrakowane i przekazane do Promptu), autoryzuje się używając zdekompresowanego OpenAI API_KEY z `UserSettings`, kontaktuje z obiektem z `ai_service.py` a także formuje na jego podstawie nową instancję `Prototype` do bazy danych.
- Mapowanie wygenerowanych w AI JSONów do finalnej formy podglądowej (HTML) do WYSIWYG readera dla powstawania formatu pytaniowego (wstawianie formatowań `[Miejsce na odpowiedź]`) oraz tzw. "Kluczów odpowiedzi" (`_build_answer_key`).

### Inne serwisy:
- **`auth_service.py`**: Hashowanie (`bcrypt`) i weryfikacja logowania.
- **`docx_service.py`**: Eksport generowanych materiałów Edukacyjnych do natywnych formatów MS Word.
- **`file_service.py`**: Użytkowanie biblioteki `pymupdf` (PDF), `python-docx` do analizy przesyłanych zasobów użytkownika wraz uwzględnieniem cache'a zawartości pliku (hashowanemu) dzięki lokalnemu `file_content_cache`.
- **`backup_service.py`**: Rezerwacja instancji z SQLite, zrzuty dumpów na żywo.

---

## 7. Endpointy i Routery (`app/routers/`)

Architektura grupuje endpointy na określone sfery:
| Router | Opis używalności API |
|---|---|
| `/api/auth` | Logowanie (POST) bazujące na cookies lub Bearer, logout. Zmiana hasła przez użytkowników "muszących to zrobić". |
| `/api/settings` | Ustawienia aplikacji globalne — szyfry AES (klucze OpenAI). |
| `/api/subjects` | Rejestr edukacyjnych dyscyplin szkolnych/tematyk. |
| `/api/files` | Wrzucanie i cache-owanie plików pomocniczych do generatora kontekstu AI. |
| `/api/generations` | Rozpoczęcie generatora zadań materiałowych (kierowane do async/await background taska serwisu). |
| `/api/prototypes` | Interfejs roboczy po wygenerowaniu materiału (edytor). Funkcja AI Reprompt. Zastosowanie modyfikacji po zgłoszeniach usera. |
| `/api/documents` | Zespół ostatecznych, zachowanych plików wynikowych na dysku. |
| `/api/backups` | Obsługa w systemie plikowym dumpów bazy SQLite. |
| `/api/diagnostics` | Prezentacja JSON Dashboardu logów o wyjątkach i zapytaniach do AI. |

---

## 8. Zabezpieczenia i Ochrona Danych

- Logika szyfrująca dla kluczy API, zabezpieczająca bazę SQLite (klasa wywołań w module `app/encryption.py` bazująca na kluczach z modułu `cryptography` wprowadzanych do środowiska z `.env`).
- Hashowanie haseł via `bcrypt`.
- Wgrany Path Traversal (Opcje przesiadywania tylko w zdefiniowanych obrębach lokalizacji podanych przez `app/config.py` pod kluczem `DATA_DIR`).
- Izolacja autoryzacji sesyjnej w warstwie backendowo ustrukturyzowanej (brak klasycznych, bezstanowych jwt tokens, backend zachowuje model `Session` w tabeli SQLite — co ułatwia zarządzanie wygasaniem/sesjami siłowymi).
