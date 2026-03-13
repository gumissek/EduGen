# Schemat bazy danych — EduGen (PostgreSQL)

> **Uwaga techniczna:** Backend używa PostgreSQL 16 jako silnika bazy danych (SQLAlchemy ORM). Typy danych są mapowane przez SQLAlchemy na typy PostgreSQL. Daty/czas przechowywane jako TEXT (ISO 8601), klucze UUID jako VARCHAR(36), wartości boolowskie jako BOOLEAN. Migracje zarządzane przez Alembic.

## 1. Lista tabel z kolumnami, typami danych i ograniczeniami

### users

Tabela przechowująca dane uwierzytelniania i profil użytkownika aplikacji (multi-user).

| Kolumna | Typ | Ograniczenia |
|---|---|---|
| id | VARCHAR(36) | PRIMARY KEY |
| email | VARCHAR(255) | NOT NULL UNIQUE, INDEX |
| first_name | VARCHAR(255) | NULL |
| last_name | VARCHAR(255) | NULL |
| password_hash | TEXT | NOT NULL |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE |
| is_superuser | BOOLEAN | NOT NULL DEFAULT FALSE |
| created_at | TEXT | NOT NULL DEFAULT (aktualna data ISO 8601) |
| updated_at | TEXT | NOT NULL DEFAULT (aktualna data ISO 8601) |
| last_login_at | TEXT | NULL |
| premium_level | INTEGER | NOT NULL DEFAULT 0 |
| api_quota | INTEGER | NOT NULL DEFAULT 1000 |
| api_quota_reset | TEXT | NULL |
| is_email_verified | BOOLEAN | NOT NULL DEFAULT FALSE |
| email_verification_token | VARCHAR(255) | NULL |
| email_verification_token_expiry | TEXT | NULL |
| reset_password_token | VARCHAR(255) | NULL |
| reset_password_token_expiry | TEXT | NULL |
| last_password_change | TEXT | NULL |
| failed_login_attempts | INTEGER | NOT NULL DEFAULT 0 |
| default_model | VARCHAR(100) | NOT NULL DEFAULT 'openai/gpt-5-mini' |

### secret_keys

Tabela przechowująca zewnętrzne klucze API użytkowników (np. OpenRouter).

| Kolumna | Typ | Ograniczenia |
|---|---|---|
| id | VARCHAR(36) | PRIMARY KEY |
| user_id | VARCHAR(36) | NOT NULL REFERENCES users(id) ON DELETE CASCADE, INDEX |
| platform | VARCHAR(50) | NOT NULL |
| key_name | VARCHAR(255) | NOT NULL |
| secret_key_hash | TEXT | NOT NULL |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE |
| last_used_at | TEXT | NULL |
| created_at | TEXT | NOT NULL |

### user_ai_models

Modele AI przypisane do użytkownika (domyślne + własne).

| Kolumna | Typ | Ograniczenia |
|---|---|---|
| id | VARCHAR(36) | PRIMARY KEY |
| user_id | VARCHAR(36) | NOT NULL REFERENCES users(id) ON DELETE CASCADE, INDEX |
| provider | VARCHAR(100) | NOT NULL (lowercase) |
| model_name | VARCHAR(255) | NOT NULL (lowercase) |
| description | TEXT | NULL |
| price_description | TEXT | NULL |
| is_available | BOOLEAN | NOT NULL DEFAULT TRUE |
| created_at | TEXT | NOT NULL |
| changed_at | TEXT | NULL |
| request_made | INTEGER | NOT NULL DEFAULT 0 |

> UNIQUE constraint: `(user_id, provider, model_name)`. Przy rejestracji tworzone są dwa domyślne modele: `openai/gpt-5.1` i `openai/gpt-5-mini`.

### subjects

Lista przedmiotów (predefiniowane + własne użytkownika).

| Kolumna | Typ | Ograniczenia |
|---|---|---|
| id | VARCHAR(36) | PRIMARY KEY |
| user_id | VARCHAR(36) | NULL REFERENCES users(id) ON DELETE CASCADE, INDEX |
| name | VARCHAR(255) | NOT NULL |
| is_custom | INTEGER | NOT NULL DEFAULT 0 |
| created_at | TEXT | NOT NULL DEFAULT (aktualna data ISO 8601) |

> Predefinowane przedmioty mają `user_id = NULL`. Przedmioty własne użytkownika mają `user_id` ustawione na ID właściciela.

### source_files

Pliki źródłowe (PDF, DOCX, IMG).

| Kolumna | Typ | Ograniczenia |
|---|---|---|
| id | VARCHAR(36) | PRIMARY KEY |
| user_id | VARCHAR(36) | NOT NULL REFERENCES users(id) ON DELETE CASCADE, INDEX |
| subject_id | VARCHAR(36) | NOT NULL REFERENCES subjects(id) ON DELETE CASCADE, INDEX |
| filename | TEXT | NOT NULL |
| original_path | TEXT | NOT NULL |
| file_type | VARCHAR(20) | NOT NULL |
| file_size | INTEGER | NOT NULL |
| file_hash | VARCHAR(64) | NULL, INDEX |
| extracted_text | TEXT | NULL |
| summary | TEXT | NULL |
| page_count | INTEGER | NULL |
| created_at | TEXT | NOT NULL DEFAULT (aktualna data ISO 8601), INDEX |
| deleted_at | TEXT | NULL |

### file_content_cache

Globalny cache deduplikacji treści plików (SHA-256 hash).

| Kolumna | Typ | Ograniczenia |
|---|---|---|
| file_hash | VARCHAR(64) | PRIMARY KEY |
| file_type | VARCHAR(20) | NOT NULL |
| extracted_text | TEXT | NULL |
| summary | TEXT | NULL |
| page_count | INTEGER | NULL |
| created_at | TEXT | NOT NULL DEFAULT (aktualna data ISO 8601) |

### generations

Reprezentuje proces generowania materiału dydaktycznego.

| Kolumna | Typ | Ograniczenia |
|---|---|---|
| id | VARCHAR(36) | PRIMARY KEY |
| user_id | VARCHAR(36) | NOT NULL REFERENCES users(id) ON DELETE CASCADE, INDEX |
| subject_id | VARCHAR(36) | NOT NULL REFERENCES subjects(id) ON DELETE CASCADE, INDEX |
| content_type | VARCHAR(50) | NOT NULL |
| education_level | VARCHAR(255) | NOT NULL |
| class_level | VARCHAR(100) | NOT NULL |
| language_level | VARCHAR(10) | NULL |
| topic | TEXT | NOT NULL |
| instructions | TEXT | NULL |
| difficulty | INTEGER | NOT NULL |
| total_questions | INTEGER | NOT NULL |
| open_questions | INTEGER | NOT NULL |
| closed_questions | INTEGER | NOT NULL |
| variants_count | INTEGER | NOT NULL DEFAULT 1 |
| task_types | TEXT | NULL |
| created_at | TEXT | NOT NULL DEFAULT (aktualna data ISO 8601), INDEX |
| updated_at | TEXT | NOT NULL DEFAULT (aktualna data ISO 8601) |
| status | VARCHAR(20) | NOT NULL DEFAULT 'draft', INDEX |
| error_message | TEXT | NULL |

### generation_source_files

Tabela łącząca materiały źródłowe z generowaniem (relacja many-to-many).

| Kolumna | Typ | Ograniczenia |
|---|---|---|
| generation_id | VARCHAR(36) | NOT NULL REFERENCES generations(id) ON DELETE CASCADE |
| source_file_id | VARCHAR(36) | NOT NULL REFERENCES source_files(id) ON DELETE CASCADE |
| | | PRIMARY KEY (generation_id, source_file_id) |

### prototypes

Wersja prototypowa dokumentu do edycji w WYSIWYG.

| Kolumna | Typ | Ograniczenia |
|---|---|---|
| id | VARCHAR(36) | PRIMARY KEY |
| user_id | VARCHAR(36) | NOT NULL REFERENCES users(id) ON DELETE CASCADE, INDEX |
| generation_id | VARCHAR(36) | NOT NULL UNIQUE REFERENCES generations(id) ON DELETE CASCADE |
| original_content | TEXT | NOT NULL |
| edited_content | TEXT | NULL |
| answer_key | TEXT | NOT NULL |
| raw_questions_json | TEXT | NULL |
| created_at | TEXT | NOT NULL DEFAULT (aktualna data ISO 8601) |
| updated_at | TEXT | NOT NULL DEFAULT (aktualna data ISO 8601) |

### documents

Finalne wygenerowane pliki DOCX.

| Kolumna | Typ | Ograniczenia |
|---|---|---|
| id | VARCHAR(36) | PRIMARY KEY |
| user_id | VARCHAR(36) | NOT NULL REFERENCES users(id) ON DELETE CASCADE, INDEX |
| generation_id | VARCHAR(36) | NOT NULL REFERENCES generations(id) ON DELETE CASCADE, INDEX |
| filename | TEXT | NOT NULL |
| file_path | TEXT | NOT NULL |
| variants_count | INTEGER | NOT NULL |
| created_at | TEXT | NOT NULL DEFAULT (aktualna data ISO 8601), INDEX |
| deleted_at | TEXT | NULL |

### ai_requests

Logi zapytań do modeli AI (OpenRouter).

| Kolumna | Typ | Ograniczenia |
|---|---|---|
| id | VARCHAR(36) | PRIMARY KEY |
| user_id | VARCHAR(36) | NULL REFERENCES users(id) ON DELETE SET NULL, INDEX |
| generation_id | VARCHAR(36) | NULL REFERENCES generations(id) ON DELETE SET NULL, INDEX |
| model_name | VARCHAR(100) | NOT NULL |
| prompt_tokens | INTEGER | NULL |
| completion_tokens | INTEGER | NULL |
| total_tokens | INTEGER | NULL |
| request_type | VARCHAR(50) | NOT NULL |
| request_payload | TEXT | NULL (JSON string) |
| response_payload | TEXT | NULL (JSON string) |
| created_at | TEXT | NOT NULL DEFAULT (aktualna data ISO 8601), INDEX |

### backups

| Kolumna | Typ | Ograniczenia |
|---|---|---|
| id | VARCHAR(36) | PRIMARY KEY |
| backup_path | TEXT | NOT NULL |
| size_bytes | INTEGER | NOT NULL |
| created_at | TEXT | NOT NULL DEFAULT (aktualna data ISO 8601) |
| expires_at | TEXT | NOT NULL |

### diagnostic_logs

| Kolumna | Typ | Ograniczenia |
|---|---|---|
| id | VARCHAR(36) | PRIMARY KEY |
| level | VARCHAR(20) | NOT NULL |
| message | TEXT | NOT NULL |
| metadata_json | TEXT | NULL (JSON string) |
| created_at | TEXT | NOT NULL DEFAULT (aktualna data ISO 8601) |

### verification_tokens

Tabela przechowująca tokeny/kody weryfikacyjne do zmiany adresu e-mail i zmiany hasła.

| Kolumna | Typ | Ograniczenia |
|---|---|---|
| id | VARCHAR(36) | PRIMARY KEY |
| user_id | VARCHAR(36) | NOT NULL REFERENCES users(id) ON DELETE CASCADE, INDEX |
| token | VARCHAR(255) | NOT NULL UNIQUE, INDEX |
| token_type | VARCHAR(50) | NOT NULL (`email_change` lub `password_change`) |
| payload_json | TEXT | NULL (JSON string — np. `{"new_email": "..."}` lub `{"new_password_hash": "..."}`) |
| expires_at | TEXT | NOT NULL (ISO 8601) |
| is_used | BOOLEAN | NOT NULL DEFAULT FALSE |
| created_at | TEXT | NOT NULL (ISO 8601) |

> - `token_type = 'email_change'`: token URL-safe, ważny 24h, payload zawiera `new_email`.
> - `token_type = 'password_change'`: 6-cyfrowy kod numeryczny, ważny 5 minut, payload zawiera `new_password_hash`.
> - Poprzednie nieużyte tokeny tego samego typu dla danego użytkownika są automatycznie oznaczane jako `is_used = TRUE` przy tworzeniu nowego.

---

## 2. Relacje między tabelami

### Jeden-do-wielu

- users → secret_keys
- users → user_ai_models
- users → subjects (nullable FK — predefinowane przedmioty)
- users → source_files
- users → generations
- users → prototypes
- users → documents
- users → verification_tokens
- subjects → source_files
- subjects → generations
- generations → prototypes
- generations → documents
- generations → ai_requests

### Wiele-do-wielu

- generations ↔ source_files (generation_source_files)

### Bez relacji do innych tabel

- file_content_cache (cache globalny powiązany z source_files przez file_hash)

---

## 3. Indeksy

```sql
-- Users
CREATE UNIQUE INDEX ix_users_email ON users(email);

-- Secret keys
CREATE INDEX ix_secret_keys_user_id ON secret_keys(user_id);

-- Subjects
CREATE INDEX ix_subjects_user_id ON subjects(user_id);

-- Source files
CREATE INDEX ix_source_files_user_id ON source_files(user_id);
CREATE INDEX ix_source_files_subject ON source_files(subject_id);
CREATE INDEX ix_source_files_created_at ON source_files(created_at);
CREATE INDEX ix_source_files_file_hash ON source_files(file_hash);

-- Generations
CREATE INDEX ix_generations_user_id ON generations(user_id);
CREATE INDEX ix_generations_subject ON generations(subject_id);
CREATE INDEX ix_generations_created_at ON generations(created_at);
CREATE INDEX ix_generations_status ON generations(status);

-- Prototypes
CREATE INDEX ix_prototypes_user_id ON prototypes(user_id);

-- Documents
CREATE INDEX ix_documents_user_id ON documents(user_id);
CREATE INDEX ix_documents_generation ON documents(generation_id);
CREATE INDEX ix_documents_created_at ON documents(created_at);

-- User AI models
CREATE INDEX ix_user_ai_models_user_id ON user_ai_models(user_id);
CREATE UNIQUE INDEX uq_user_ai_models_user_provider_model ON user_ai_models(user_id, provider, model_name);

-- AI requests
CREATE INDEX ix_ai_requests_user_id ON ai_requests(user_id);
CREATE INDEX ix_ai_requests_generation ON ai_requests(generation_id);
CREATE INDEX ix_ai_requests_created_at ON ai_requests(created_at);

-- Backups
CREATE INDEX ix_backups_expiration ON backups(expires_at);

-- Diagnostic logs
CREATE INDEX ix_diagnostic_logs_created_at ON diagnostic_logs(created_at);

-- Verification tokens
CREATE INDEX ix_verification_tokens_user_id ON verification_tokens(user_id);
CREATE UNIQUE INDEX ix_verification_tokens_token ON verification_tokens(token);
```

---

## 4. Uwagi projektowe

- Schemat zgodny z 3NF.
- Silnik bazy danych: **PostgreSQL 16** (Docker, `postgres:16`).
- Izolacja danych: każda tabela z danymi użytkownika zawiera kolumnę `user_id` (FK → `users.id`).
- Predefinowane przedmioty (`subjects`) mają `user_id = NULL` — widoczne dla wszystkich.
- JWT zastępuje sesje serwerowe — tabela `sessions` została usunięta.
- Soft delete dla plików (`source_files.deleted_at`) i dokumentów (`documents.deleted_at`).
- Deduplikacja plików przez `file_content_cache` (klucz: SHA-256 hash pliku).
- Klucze API szyfrowane AES przechowywane w tabeli `secret_keys` (wiele kluczy per użytkownik).
- Preferencja modelu AI zapisana bezpośrednio w tabeli `users` (kolumna `default_model`).
- Migracje schematu zarządzane przez **Alembic** (skonsolidowana migracja: `001`, tokeny weryfikacyjne: `002`).
- Tabela `settings` (legacy) została usunięta — cala funkcjonalność przeniesiona do `users` i `secret_keys`.
- Tabela `verification_tokens` obsługuje weryfikację zmiany e-mail (link, 24h) i zmiany hasła (kod 6-cyfrowy, 5 min). W trybie lokalnym e-maile nie są wysyłane — serwis loguje dane do konsoli.

## 5. Aktualizacja (admin i backupy)

- Wprowadzone funkcje administracyjne (zarządzanie użytkownikami, reset haseł, backup download/upload/restore) działają na istniejącym schemacie — **bez dodawania nowych tabel i kolumn**.
- Kopie zapasowe przechowywane w `backups` zawierają pełny logiczny zrzut tabel aplikacji.
- Operacje diagnostyczne i backupowe są ograniczone do kont z `users.is_superuser = TRUE` na poziomie backendu.