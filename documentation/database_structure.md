Schemat bazy danych - EduGen Local (SQLite)

> **Uwaga techniczna:** Backend uzywa SQLite jako silnika bazy danych (SQLAlchemy ORM). Typy danych sa mapowane przez SQLAlchemy na typy SQLite: daty/czas przechowywane jako TEXT (ISO 8601), klucze UUID jako VARCHAR(36), wartosci boolowskie jako INTEGER (0/1), a pola JSON jako TEXT.

1. Lista tabel z kolumnami, typami danych i ograniczeniami

users

Tabela przechowujaca dane uwierzytelniania uzytkownika aplikacji.

  Kolumna                 Typ            Ograniczenia
  ----------------------- -------------- ----------------------------------------
  id                      VARCHAR(36)    PRIMARY KEY
  password_hash           TEXT           NOT NULL
  must_change_password    INTEGER        NOT NULL DEFAULT 1
  created_at              TEXT           NOT NULL DEFAULT (aktualna data ISO 8601)
  updated_at              TEXT           NOT NULL DEFAULT (aktualna data ISO 8601)
  last_login_at           TEXT           NULL

sessions

Tabela sesji uzytkownika (wymagane dla auto-logout po 15 minutach).

  Kolumna            Typ            Ograniczenia
  ------------------ -------------- -------------------------------------------------------
  id                 VARCHAR(36)    PRIMARY KEY
  user_id            VARCHAR(36)    NOT NULL REFERENCES users(id) ON DELETE CASCADE
  token              TEXT           NOT NULL UNIQUE
  created_at         TEXT           NOT NULL DEFAULT (aktualna data ISO 8601)
  expires_at         TEXT           NOT NULL
  last_activity_at   TEXT           NOT NULL DEFAULT (aktualna data ISO 8601)

settings

Ustawienia aplikacji (API key, model AI).

  Kolumna                    Typ            Ograniczenia
  -------------------------- -------------- -------------------------------------------------------
  id                         VARCHAR(36)    PRIMARY KEY
  user_id                    VARCHAR(36)    NOT NULL REFERENCES users(id) ON DELETE CASCADE
  openai_api_key_encrypted   TEXT           NOT NULL DEFAULT ''
  default_model              VARCHAR(100)   NOT NULL DEFAULT 'gpt-5-mini'
  created_at                 TEXT           NOT NULL DEFAULT (aktualna data ISO 8601)
  updated_at                 TEXT           NOT NULL DEFAULT (aktualna data ISO 8601)

subjects

Lista przedmiotow (predefiniowane + wlasne).

  Kolumna      Typ            Ograniczenia
  ------------ -------------- ----------------------------------------
  id           VARCHAR(36)    PRIMARY KEY
  name         VARCHAR(255)   NOT NULL
  is_custom    INTEGER        NOT NULL DEFAULT 0
  created_at   TEXT           NOT NULL DEFAULT (aktualna data ISO 8601)

source_files

Pliki zrodlowe (PDF, DOCX, IMG).

  Kolumna          Typ            Ograniczenia
  ---------------- -------------- -------------------------------------------------------
  id               VARCHAR(36)    PRIMARY KEY
  subject_id       VARCHAR(36)    NOT NULL REFERENCES subjects(id) ON DELETE CASCADE
  filename         TEXT           NOT NULL
  original_path    TEXT           NOT NULL
  file_type        VARCHAR(20)    NOT NULL
  file_size        INTEGER        NOT NULL
  file_hash        VARCHAR(64)    NULL
  extracted_text   TEXT           NULL
  summary          TEXT           NULL
  page_count       INTEGER        NULL
  created_at       TEXT           NOT NULL DEFAULT (aktualna data ISO 8601)
  deleted_at       TEXT           NULL

file_content_cache

Globalny cache deduplikacji tresci plikow identyfikowanych przez hash SHA-256. Umozliwia ponowne uzycie ekstraktu tekstu i podsumowania AI bez dodatkowych kosztow tokenow.

  Kolumna          Typ            Ograniczenia
  ---------------- -------------- ----------------------------------------
  file_hash        VARCHAR(64)    PRIMARY KEY
  file_type        VARCHAR(20)    NOT NULL
  extracted_text   TEXT           NULL
  summary          TEXT           NULL
  page_count       INTEGER        NULL
  created_at       TEXT           NOT NULL DEFAULT (aktualna data ISO 8601)

generations

Reprezentuje proces generowania materialu dydaktycznego.

  Kolumna            Typ            Ograniczenia
  ------------------ -------------- -------------------------------------------------------
  id                 VARCHAR(36)    PRIMARY KEY
  subject_id         VARCHAR(36)    NOT NULL REFERENCES subjects(id) ON DELETE CASCADE
  content_type       VARCHAR(50)    NOT NULL
  education_level    VARCHAR(255)   NOT NULL
  class_level        VARCHAR(100)   NOT NULL
  language_level     VARCHAR(10)    NULL
  topic              TEXT           NOT NULL
  instructions       TEXT           NULL
  difficulty         INTEGER        NOT NULL
  total_questions    INTEGER        NOT NULL
  open_questions     INTEGER        NOT NULL
  closed_questions   INTEGER        NOT NULL
  variants_count     INTEGER        NOT NULL DEFAULT 1
  task_types         TEXT           NULL
  created_at         TEXT           NOT NULL DEFAULT (aktualna data ISO 8601)
  updated_at         TEXT           NOT NULL DEFAULT (aktualna data ISO 8601)
  status             VARCHAR(20)    NOT NULL DEFAULT 'draft'
  error_message      TEXT           NULL

generation_source_files

Tabela laczaca materialy zrodlowe z generowaniem (relacja many-to-many).

  Kolumna          Typ            Ograniczenia
  ---------------- -------------- -------------------------------------------------------
  generation_id    VARCHAR(36)    NOT NULL REFERENCES generations(id) ON DELETE CASCADE
  source_file_id   VARCHAR(36)    NOT NULL REFERENCES source_files(id) ON DELETE CASCADE
  PRIMARY KEY      (generation_id, source_file_id)

prototypes

Wersja prototypowa dokumentu do edycji w WYSIWYG.

  Kolumna              Typ            Ograniczenia
  -------------------- -------------- -------------------------------------------------------
  id                   VARCHAR(36)    PRIMARY KEY
  generation_id        VARCHAR(36)    NOT NULL UNIQUE REFERENCES generations(id) ON DELETE CASCADE
  original_content     TEXT           NOT NULL
  edited_content       TEXT           NULL
  answer_key           TEXT           NOT NULL
  raw_questions_json   TEXT           NULL
  created_at           TEXT           NOT NULL DEFAULT (aktualna data ISO 8601)
  updated_at           TEXT           NOT NULL DEFAULT (aktualna data ISO 8601)

documents

Finalne wygenerowane pliki DOCX.

  Kolumna          Typ            Ograniczenia
  ---------------- -------------- -------------------------------------------------------
  id               VARCHAR(36)    PRIMARY KEY
  generation_id    VARCHAR(36)    NOT NULL REFERENCES generations(id) ON DELETE CASCADE
  filename         TEXT           NOT NULL
  file_path        TEXT           NOT NULL
  variants_count   INTEGER        NOT NULL
  created_at       TEXT           NOT NULL DEFAULT (aktualna data ISO 8601)
  deleted_at       TEXT           NULL

ai_requests

Logi zapytan do modeli OpenAI.

  Kolumna             Typ            Ograniczenia
  ------------------- -------------- -------------------------------------------------------
  id                  VARCHAR(36)    PRIMARY KEY
  generation_id       VARCHAR(36)    NULL REFERENCES generations(id) ON DELETE SET NULL
  model_name          VARCHAR(100)   NOT NULL
  prompt_tokens       INTEGER        NULL
  completion_tokens   INTEGER        NULL
  total_tokens        INTEGER        NULL
  request_type        VARCHAR(50)    NOT NULL
  request_payload     TEXT           NULL (JSON string)
  response_payload    TEXT           NULL (JSON string)
  created_at          TEXT           NOT NULL DEFAULT (aktualna data ISO 8601)

backups

  Kolumna       Typ            Ograniczenia
  ------------- -------------- ----------------------------------------
  id            VARCHAR(36)    PRIMARY KEY
  backup_path   TEXT           NOT NULL
  size_bytes    INTEGER        NOT NULL
  created_at    TEXT           NOT NULL DEFAULT (aktualna data ISO 8601)
  expires_at    TEXT           NOT NULL

diagnostic_logs

  Kolumna         Typ            Ograniczenia
  --------------- -------------- ----------------------------------------
  id              VARCHAR(36)    PRIMARY KEY
  level           VARCHAR(20)    NOT NULL
  message         TEXT           NOT NULL
  metadata_json   TEXT           NULL (JSON string)
  created_at      TEXT           NOT NULL DEFAULT (aktualna data ISO 8601)

2. Relacje miedzy tabelami

Jeden-do-wielu

-   users -> sessions
-   users -> settings
-   subjects -> source_files
-   subjects -> generations
-   generations -> prototypes
-   generations -> documents
-   generations -> ai_requests

Wiele-do-wielu

-   generations <-> source_files (generation_source_files)

Bez relacji do innych tabel

-   file_content_cache (cache globalny powiazany z source_files przez file_hash)

3. Indeksy

CREATE INDEX idx_source_files_subject ON source_files(subject_id);
CREATE INDEX idx_source_files_created_at ON source_files(created_at);
CREATE INDEX idx_source_files_file_hash ON source_files(file_hash);

CREATE INDEX idx_generations_subject ON generations(subject_id);
CREATE INDEX idx_generations_created_at ON generations(created_at);
CREATE INDEX idx_generations_status ON generations(status);

CREATE INDEX idx_documents_generation ON documents(generation_id);
CREATE INDEX idx_documents_created_at ON documents(created_at);

CREATE INDEX idx_ai_requests_generation ON ai_requests(generation_id);
CREATE INDEX idx_ai_requests_created_at ON ai_requests(created_at);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expiration ON sessions(expires_at);

CREATE INDEX idx_backups_expiration ON backups(expires_at);

CREATE INDEX idx_diagnostic_logs_created_at ON diagnostic_logs(created_at);

4. Uwagi projektowe

-   Schemat zgodny z 3NF.
-   Silnik bazy danych: SQLite z PRAGMA foreign_keys=ON, journal_mode=WAL, synchronous=NORMAL.
-   Typy danych SQLite: daty jako TEXT ISO 8601, UUID jako VARCHAR(36), bool jako INTEGER (0/1), JSON jako TEXT.
-   Oddzielone logi AI od domeny biznesowej.
-   Soft delete dla plikow (source_files.deleted_at) i dokumentow (documents.deleted_at).
-   Deduplikacja plikow przez file_content_cache (klucz: SHA-256 hash pliku).
-   Klucz OpenAI API szyfrowany AES w polu settings.openai_api_key_encrypted.
-   Sesje zarzadzane po stronie backendu (tabela sessions) z mechanizmem rolling expiration.
-   Migracje schematu zarzadzane przez Alembic.