Schemat bazy danych – EduGen Local (PostgreSQL)

1. Lista tabel z kolumnami, typami danych i ograniczeniami

users

Tabela przechowująca dane uwierzytelniania użytkownika aplikacji.

  Kolumna         Typ                        Ograniczenia
  --------------- -------------------------- ------------------------
  id              UUID                       PRIMARY KEY
  password_hash   TEXT                       NOT NULL
  created_at      TIMESTAMP WITH TIME ZONE   NOT NULL DEFAULT now()
  updated_at      TIMESTAMP WITH TIME ZONE   NOT NULL DEFAULT now()
  last_login_at   TIMESTAMP WITH TIME ZONE   NULL

sessions

Tabela sesji użytkownika (wymagane dla auto-logout po 15 minutach).

  Kolumna            Typ                        Ograniczenia
  ------------------ -------------------------- -------------------------------------------------
  id                 UUID                       PRIMARY KEY
  user_id            UUID                       NOT NULL REFERENCES users(id) ON DELETE CASCADE
  token              TEXT                       NOT NULL UNIQUE
  created_at         TIMESTAMP WITH TIME ZONE   NOT NULL DEFAULT now()
  expires_at         TIMESTAMP WITH TIME ZONE   NOT NULL
  last_activity_at   TIMESTAMP WITH TIME ZONE   NOT NULL

settings

Ustawienia aplikacji (API key, model AI).

  Kolumna                    Typ                        Ograniczenia
  -------------------------- -------------------------- -------------------------------------------------
  id                         UUID                       PRIMARY KEY
  user_id                    UUID                       NOT NULL REFERENCES users(id) ON DELETE CASCADE
  openai_api_key_encrypted   TEXT                       NOT NULL
  default_model              VARCHAR(100)               NOT NULL
  created_at                 TIMESTAMP WITH TIME ZONE   NOT NULL DEFAULT now()
  updated_at                 TIMESTAMP WITH TIME ZONE   NOT NULL DEFAULT now()

subjects

Lista przedmiotów (predefiniowane + własne).

  Kolumna      Typ                        Ograniczenia
  ------------ -------------------------- ------------------------
  id           UUID                       PRIMARY KEY
  name         VARCHAR(255)               NOT NULL
  is_custom    BOOLEAN                    NOT NULL DEFAULT false
  created_at   TIMESTAMP WITH TIME ZONE   NOT NULL DEFAULT now()

source_files

Pliki źródłowe (PDF, DOCX, IMG).

  -----------------------------------------------------------------------
  Kolumna                 Typ                     Ograniczenia
  ----------------------- ----------------------- -----------------------
  id                      UUID                    PRIMARY KEY

  subject_id              UUID                    NOT NULL REFERENCES
                                                  subjects(id) ON DELETE
                                                  CASCADE

  filename                TEXT                    NOT NULL

  original_path           TEXT                    NOT NULL

  file_type               VARCHAR(20)             NOT NULL

  file_size               INTEGER                 NOT NULL CHECK
                                                  (file_size <= 10485760)

  extracted_text          TEXT                    NULL

  summary                 TEXT                    NULL

  page_count              INTEGER                 NULL

  created_at              TIMESTAMP WITH TIME     NOT NULL DEFAULT now()
                          ZONE                    

  deleted_at              TIMESTAMP WITH TIME     NULL
                          ZONE                    
  -----------------------------------------------------------------------

generations

Reprezentuje proces generowania materiału dydaktycznego.

  Kolumna            Typ                        Ograniczenia
  ------------------ -------------------------- ---------------------------------------------
  id                 UUID                       PRIMARY KEY
  subject_id         UUID                       NOT NULL REFERENCES subjects(id)
  content_type       VARCHAR(50)                NOT NULL
  education_level    VARCHAR(20)                NOT NULL
  class_level        INTEGER                    NOT NULL
  language_level     VARCHAR(10)                NULL
  topic              TEXT                       NOT NULL
  instructions       TEXT                       NULL
  difficulty         INTEGER                    NOT NULL CHECK (difficulty BETWEEN 1 AND 4)
  total_questions    INTEGER                    NOT NULL
  open_questions     INTEGER                    NOT NULL
  closed_questions   INTEGER                    NOT NULL
  variants_count     INTEGER                    NOT NULL DEFAULT 1
  created_at         TIMESTAMP WITH TIME ZONE   NOT NULL DEFAULT now()
  updated_at         TIMESTAMP WITH TIME ZONE   NOT NULL DEFAULT now()
  status             VARCHAR(20)                NOT NULL DEFAULT ‘draft’

generation_source_files

Tabela łącząca materiały źródłowe z generowaniem (relacja many-to-many).

  -----------------------------------------------------------------------
  Kolumna                 Typ                     Ograniczenia
  ----------------------- ----------------------- -----------------------
  generation_id           UUID                    NOT NULL REFERENCES
                                                  generations(id) ON
                                                  DELETE CASCADE

  source_file_id          UUID                    NOT NULL REFERENCES
                                                  source_files(id) ON
                                                  DELETE CASCADE

  PRIMARY KEY             (generation_id,         
                          source_file_id)         
  -----------------------------------------------------------------------

prototypes

Wersja prototypowa dokumentu do edycji w WYSIWYG.

  -----------------------------------------------------------------------
  Kolumna                 Typ                     Ograniczenia
  ----------------------- ----------------------- -----------------------
  id                      UUID                    PRIMARY KEY

  generation_id           UUID                    NOT NULL UNIQUE
                                                  REFERENCES
                                                  generations(id) ON
                                                  DELETE CASCADE

  original_content        TEXT                    NOT NULL

  edited_content          TEXT                    NULL

  answer_key              TEXT                    NOT NULL

  created_at              TIMESTAMP WITH TIME     NOT NULL DEFAULT now()
                          ZONE                    

  updated_at              TIMESTAMP WITH TIME     NOT NULL DEFAULT now()
                          ZONE                    
  -----------------------------------------------------------------------

documents

Finalne wygenerowane pliki DOCX.

  -----------------------------------------------------------------------
  Kolumna                 Typ                     Ograniczenia
  ----------------------- ----------------------- -----------------------
  id                      UUID                    PRIMARY KEY

  generation_id           UUID                    NOT NULL REFERENCES
                                                  generations(id) ON
                                                  DELETE CASCADE

  filename                TEXT                    NOT NULL

  file_path               TEXT                    NOT NULL

  variants_count          INTEGER                 NOT NULL

  created_at              TIMESTAMP WITH TIME     NOT NULL DEFAULT now()
                          ZONE                    

  deleted_at              TIMESTAMP WITH TIME     NULL
                          ZONE                    
  -----------------------------------------------------------------------

ai_requests

Logi zapytań do modeli OpenAI.

  -----------------------------------------------------------------------
  Kolumna                 Typ                     Ograniczenia
  ----------------------- ----------------------- -----------------------
  id                      UUID                    PRIMARY KEY

  generation_id           UUID                    NULL REFERENCES
                                                  generations(id) ON
                                                  DELETE SET NULL

  model_name              VARCHAR(100)            NOT NULL

  prompt_tokens           INTEGER                 NULL

  completion_tokens       INTEGER                 NULL

  total_tokens            INTEGER                 NULL

  request_type            VARCHAR(50)             NOT NULL

  request_payload         JSONB                   NULL

  response_payload        JSONB                   NULL

  created_at              TIMESTAMP WITH TIME     NOT NULL DEFAULT now()
                          ZONE                    
  -----------------------------------------------------------------------

backups

  Kolumna       Typ                        Ograniczenia
  ------------- -------------------------- ------------------------
  id            UUID                       PRIMARY KEY
  backup_path   TEXT                       NOT NULL
  size_bytes    BIGINT                     NOT NULL
  created_at    TIMESTAMP WITH TIME ZONE   NOT NULL DEFAULT now()
  expires_at    TIMESTAMP WITH TIME ZONE   NOT NULL

diagnostic_logs

  Kolumna      Typ                        Ograniczenia
  ------------ -------------------------- ------------------------
  id           UUID                       PRIMARY KEY
  level        VARCHAR(20)                NOT NULL
  message      TEXT                       NOT NULL
  metadata     JSONB                      NULL
  created_at   TIMESTAMP WITH TIME ZONE   NOT NULL DEFAULT now()

2. Relacje między tabelami

Jeden-do-wielu

-   users → sessions
-   users → settings
-   subjects → source_files
-   subjects → generations
-   generations → prototypes
-   generations → documents
-   generations → ai_requests

Wiele-do-wielu

-   generations ↔ source_files (generation_source_files)

3. Indeksy

CREATE INDEX idx_source_files_subject ON source_files(subject_id);
CREATE INDEX idx_source_files_created_at ON source_files(created_at);

CREATE INDEX idx_generations_subject ON generations(subject_id); CREATE
INDEX idx_generations_created_at ON generations(created_at); CREATE
INDEX idx_generations_status ON generations(status);

CREATE INDEX idx_documents_generation ON documents(generation_id);
CREATE INDEX idx_documents_created_at ON documents(created_at);

CREATE INDEX idx_ai_requests_generation ON ai_requests(generation_id);
CREATE INDEX idx_ai_requests_created_at ON ai_requests(created_at);

CREATE INDEX idx_sessions_user ON sessions(user_id); CREATE INDEX
idx_sessions_expiration ON sessions(expires_at);

CREATE INDEX idx_backups_expiration ON backups(expires_at);

CREATE INDEX idx_diagnostic_logs_created_at ON
diagnostic_logs(created_at);

4. Row Level Security

ALTER TABLE users ENABLE ROW LEVEL SECURITY; ALTER TABLE sessions ENABLE
ROW LEVEL SECURITY; ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

5. Uwagi projektowe

-   Schemat zgodny z 3NF.
-   Oddzielone logi AI od domeny biznesowej.
-   Soft delete dla plików i dokumentów.
-   Gotowy do migracji SQLite → PostgreSQL.
