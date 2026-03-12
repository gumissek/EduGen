# EduGen Local - Implementation Plan

This document serves as the comprehensive implementation blueprint for EduGen Local, a desktop application for teachers to generate educational materials using AI. It is designed for senior frontend and backend engineers to begin execution.

---

# 1. SYSTEM ARCHITECTURE OVERVIEW

**Overall System Architecture:**  
EduGen Local is designed as a locally deployed, privacy-first web application running via Docker Compose. While architected as a standard client-server web app, it is strictly bound to `localhost` (127.0.0.1) to serve as a local desktop tool. The workflow starts with file uploads and test configuration, moves linearly to AI processing (via background tasks), proceeds to a human-in-the-loop review in a WYSIWYG editor, and ends with DOCX generation.

**Frontend Architecture:**  
- **Framework:** Next.js 16+ (App Router) using TypeScript.
- **UI:** Material UI (MUI) for professional, responsive components with Dark/Light mode support.
- **State & Data Fetching:** TanStack Query for caching and asynchronous data synchronization. LocalStorage for persisting form states (e.g., test configuration).
- **Editor:** TipTap or Quill for lightweight WYSIWYG editing, capable of HTML to DOCX mapping.

**Backend Architecture:**  
- **Framework:** FastAPI for high-performance, asynchronous endpoints.
- **Task Processing:** FastAPI `BackgroundTasks` for asynchronous orchestration of OpenAI API calls (Vision and Text models) to avoid HTTP timeouts.
- **File Processing:** `pypdf`/`PyMuPDF` for PDF extraction, `python-docx` for Word documents, and `python-magic` for MIME type validation.

**Database Role:**  
- **Engine:** SQLite, ensuring zero-configuration local deployments. The schema is designed in 3NF and is compatible with PostgreSQL for future scalability.
- **Scope:** Stores user credentials, session state, AI logs/telemetry, file metadata, and generations history.

**Communication Patterns:**  
- RESTful JSON API using FastAPI route decorators. 
- Polling via TanStack Query (or WebSockets/SSE if needed) to track long-running `BackgroundTasks` generating AI prototypes.

**Authentication Flow:**  
- Single-user system protected by a static password. 
- Backend issues a session token on login, stored in Secure/HttpOnly cookies or memory.
- Sessions automatically perish after 15 minutes of inactivity (absolute or rolling expiration per DB).

**Key Design Decisions & Security:**  
- **Privacy Core:** Files and logs never leave the machine except when sent to OpenAI's API. 
- **Encryption:** The OpenAI API key is encrypted at rest in the SQLite database (`settings.openai_api_key_encrypted`).
- **Resilience:** Lack of resume mechanic for failed generations requires rapid-failure detection and clear frontend error messaging. 

---

# 2. FEATURE BREAKDOWN

**1. Authentication & Security Module**
- **Purpose:** Protect the local instance from unauthorized physical/network access. 
- **Components:** Login screen, Session validator middleware, Auto-logout timer.
- **Dependencies:** `passlib` - 'bcrypt', DB (`users`, `sessions`).

**2. Core Settings & Diagnostics**
- **Purpose:** Manage the OpenAI API key, active model selection, and view system health.
- **Components:** Settings panel, API key validation endpoint, diagnostic logs viewer, manual/auto backup triggers.
- **Dependencies:** SQLite generic operations, encryption module, file system (backups).

**3. Subject & File Repository**
- **Purpose:** Centralized management of PDFs, Docs, and Images organized by academic subject.
- **Components:** Subject CRUD, Multi-format file uploader (<= 10MB), OCR pipeline (OpenAI Vision), Text summarizer.
- **Dependencies:** OpenAI Vision, `PyMuPDF`, `python-docx`.

**4. Generation Configuration Engine**
- **Purpose:** Define parameters for the AI generation (difficulty, class, format, source material).
- **Components:** Form with LocalStorage persistence, multi-step validation.
- **Dependencies:** Subject & File metadata endpoints.

**5. AI Prototyping Engine**
- **Purpose:** The core intelligence layer transforming parameters and source texts into structured output.
- **Components:** Prompt builder, Token counter (`ai_requests` logger), OpenAI SDK integration.
- **Dependencies:** `source_files`, `settings` (Active Key/Model).

**6. Interactive Refinement (WYSIWYG)**
- **Purpose:** Human-in-the-loop verification of AI output before finalization.
- **Components:** Rich text editor, "Reprompt AI" functionality, "Restore Original" logic.
- **Dependencies:** `prototypes` table, OpenAI SDK (re-prompting).

**7. Finalization & DOCX Export**
- **Purpose:** Compiling the prototype into a print-ready Word document with randomized groups.
- **Components:** Question mixing algorithm (for Groups A/B/etc.), Python-docx writer, pagination handler.
- **Dependencies:** `python-docx`, `prototypes` parsing logic.

**8. Dashboard & Archiving**
- **Purpose:** Historical view and retrieval of generated documents.
- **Components:** Paginated data grid, Bulk ZIP downloader, Soft-delete mechanism.
- **Dependencies:** File system ZIP creation, pagination endpoints.

---

# 3. DEVELOPMENT ROADMAP (IMPLEMENTATION ORDER)

**Phase 1 — Infrastructure & DB**  
*Setup Docker, FastAPI, Next.js, and SQLite with SQLAlchemy/Alembic integrations.* This serves as the immovable bedrock for the rest of the application.

**Phase 2 — Core Backend & Validation**  
*Implement Auth, Settings, Subjects, and File Uploads.* Ensures we can securely ingest data and store user preferences before AI logic begins.

**Phase 3 — AI Integration & Prototyping**  
*Build the connection to OpenAI, file text extraction (OCR/PDF text), summarization, and prototype generation.* The most AI-heavy phase.

**Phase 4 — Frontend Generation Flow & Editor**  
*Develop the Wizard/Forms, integrate TanStack Query for polling AI status, and implement TipTap/Quill Editor.* Translates the backend capabilities into the user interface.

**Phase 5 — Finalization & DOCX Generation**  
*Implement the algorithm to shuffle groups and write to DOCX using `python-docx`.* The critical final step for the teacher payload.

**Phase 6 — History, Backups, & Polish (Week 4)**  
*Dashboard grids, ZIP zipping logic, daily background SQLite backups, and diagnostic logs export.* Hardens the product into a production-ready state.

*Why this order?* It strictly follows data dependency: Infra -> Auth -> Ingestion -> Processing -> UI -> Export -> Archiving. You cannot build the editor without the prototype endpoint, and you cannot build the prototype without file ingestion.

---

# 4. BACKEND TASK LIST (VERY DETAILED)

### Task Name: Project Setup & Database Configuration
### Description:
Initialize FastAPI, `uv` package manager, and SQLAlchemy with Alembic for SQLite.
### Technical Requirements:
Python 3.11+, SQLAlchemy 2.0, Alembic, FastAPI. Create all tables as defined in `database_structure.md`.
### Implementation Steps:
1. Initialize `uv` project.
2. Define SQLAlchemy declarative base and models matching the PostgreSQL schema but utilizing SQLite compatible constructs (e.g. standard ISO-8601 strings for `TIMESTAMP`, integers for boolean).
3. Create Alembic migration script for initial schema.
4. Implement dependency injection for DB sessions (`get_db`).
### Database Tables Used:
All tables defined in the schema.
### Edge Cases:
Ensure relationships and cascading deletes work gracefully in SQLite `PRAGMA foreign_keys=ON`.
### Security Considerations:
Restrict file permissions on `.sqlite` database.
### Acceptance Criteria:
`uv run alembic upgrade head` successfully creates a `.sqlite` file with the full schema.
### Definition of Done:
Database is mountable, schemas are fully reflected in ORM, and foreign keys are enforced.

### Task Name: Implement Authentication System
### Description:
Build login endpoint, session validation, and 15-minute timeout logic.
### Technical Requirements:
Passwords hashed with `passlib` (bcrypt). Sessions persisted in `sessions` table.
### Implementation Steps:
1. Create `/api/auth/login` accepting static password.
2. Gen UUID token, set `expires_at` to `now() + 15 mins`.
3. Create FastAPI Middleware / Dependency `get_current_user` to check token.
4. Update `last_activity_at` on every authenticated request.
### Example Code / API Contract:
`POST /api/auth/login` receives password, returns `{"token": "uuid", "expires_at": "..."}`.
### Database Tables Used:
`users`, `sessions`.
### Edge Cases:
Concurrent requests extending a dying session.
### Security Considerations:
Protect against brute force. Hardcode initial password hash in `.env` for first boot, require DB update.
### Acceptance Criteria:
Expired tokens yield `401 Unauthorized`. Valid requests extend session to 15m.
### Definition of Done:
Complete JWT/Token auth flow successfully guards all endpoints.

### Task Name: Implement File Ingestion & OCR Service
### Description:
Handle multi-part uploads, validate MIME types, extract text from PDFs, and invoke OpenAI Vision for images.
### Technical Requirements:
`python-magic`, `PyMuPDF` (fitz), `BackgroundTasks`. 10MB limit.
### Implementation Steps:
1. Create `POST /api/files` endpoint. Assert 10MB limit.
2. Save file to local `./data/subjects/{id}` folder.
3. If PDF/DOCX: run `fitz`/`docx` to extract text. If Image or vectorless PDF: send base64 to OpenAI Vision API for extraction (up to 5 pages).
4. Extract 1-sentence summary via generic LLM call.
5. Save `extracted_text` and metadata to `source_files`.
### Database Tables Used:
`source_files`.
### Edge Cases:
Scanned PDFs without text layer -> must intelligently detect this and use Vision API. >5 Page scans must be rejected or truncated.
### Security Considerations:
Mitigate Path Traversal by utilizing UUID-based file storage (e.g., `./data/subjects/<uuid>/<uuid>.pdf`). Reject executables.
### Acceptance Criteria:
Valid files are saved, text is accurately extracted and saved to DB.
### Definition of Done:
Files up to 10MB can be universally ingested, OCR'd, and queried.

### Task Name: Implement AI Prototyping Pipeline
### Description:
The core prompt generation and OpenAPI call for a test/worksheet wrapper.
### Technical Requirements:
`openai` python SDK, `pydantic` for structured outputs (JSON formatting).
### Implementation Steps:
1. Formulate master prompt using generation configuration (difficulty, count of questions).
2. Inject `extracted_text` from selected `source_files`.
3. Call `gpt-5-mini` asynchronously via FastAPI BackgroundTasks.
4. Log token usage to `ai_requests` table.
5. Decode JSON output.
6. Store output as `original_content` and `answer_key` locally in `prototypes` table. Update `generations` status from `draft` to `ready`.
### Example Code / API Contract:
AI must return JSON matching Pydantic schema: `{"title": "...", "questions": [...], "answer_key": {...}}`.
### Database Tables Used:
`generations`, `prototypes`, `ai_requests`, `settings` (for API key).
### Edge Cases:
OpenAI timeout, malformed JSON response, hallucinated question counts.
### Security Considerations:
Strictly decrypt API key before usage, clear from memory.
### Acceptance Criteria:
A valid prototype record is created with successfully mapped questions and answers adhering to bounds.
### Definition of Done:
Background task reliably communicates with OpenAI and commits the output to the DB.

### Task Name: Implement DOCX Export & Variant Generation
### Description:
Take the finalized prototype, split it into groups (A, B, etc.), randomize, and write DOCX.
### Technical Requirements:
`python-docx` for formatting (headings, lists, bolding, pagination).
### Implementation Steps:
1. Parse the localized HTML/JSON prototype layout.
2. If `variants_count > 1`, randomly shuffle closed questions and their answers, and shuffle open questions to create variants.
3. Generate `python-docx` document with page breaks per group (`document.add_page_break()`).
4. Append Answer Key for all groups at the absolute end.
5. Save to disk and write to `documents` table.
### Database Tables Used:
`prototypes`, `documents`.
### Edge Cases:
Math/Unicode elements missing from standard fonts.
### Acceptance Criteria:
Valid DOCX generated, formatting preserved, variants distinct.
### Definition of Done:
DOCX is properly generated and available for download.

### Task Name: Backup & Diagnostic Service
### Description:
Nightly SQLite backups and diagnostic log exports.
### Technical Requirements:
Python `schedule` or APScheduler, `shutil`.
### Implementation Steps:
1. Implement FastAPI background scheduler utilizing standard library `shutil` or SQLite backup API to copy the DB.
2. Zip the copied DB. Keep 7 rolling days.
3. Expose endpoint to trigger manual backup.
4. Log major events (Exceptions, Logins, OpenAI errors) to `diagnostic_logs`.
### Database Tables Used:
`backups`, `diagnostic_logs`.
### Acceptance Criteria:
Daily zip exists with 7-day retention. Error logs accurately track failures.

---

# 5. FRONTEND TASK LIST (VERY DETAILED)

### Task Name: Next.js Layout & Routing Setup
### Description:
Establish App Router scaffolding, MUI Theme Provider, and responsive Sidebar.
### UI Components:
`Sidebar`, `TopBar`, `MainLayout`. Theme toggle (Dark/Light).
### State Management:
MUI `ThemeProvider`, no complex state yet.
### Edge Cases:
Mobile vs desktop layouts for the sidebar (drawer vs persistent).
### Acceptance Criteria:
App runs on `localhost:3000` with persistent sidebar.
### Definition of Done:
Basic routing scaffold exists.

### Task Name: Auth UI & Idle Timer
### Description:
Login screen and global idle timeout monitor.
### UI Components:
`LoginForm` (Password input), `SessionTimeoutModal`.
### State Management:
Zustand/Context for User Auth State.
### Implementation Steps:
1. Form for password entry.
2. Integrate `axios` interceptor to catch 401s and redirect to login.
3. Implement window event listeners (`mousemove`, `keydown`) to reset a 15 min JS timer. If timer hits, call `/api/auth/logout`, clear local state, redirect.
### API Endpoints Used:
`POST /api/auth/login`, `POST /api/auth/logout`.
### Security Considerations:
Never store password text. Auth token must be HttpOnly or strictly protected.
### Acceptance Criteria:
Idling 15 minutes drops session locally. Unauthenticated state blocks routing.

### Task Name: Generation Configuration Wizard
### Description:
Multi-step form to configure output type, subject, difficulty, and source files.
### UI Components:
MUI `Stepper` or Long scrolling `Paper`. Dropdowns for Subject. Sliders for difficulty. Step 1: Selection. Step 2: Settings. Step 3: Files.
### State Management:
`react-hook-form` + `zod` for validation. Persist to `localStorage` `onBlur`.
### Error Handling:
Show inline form helpers (e.g. "Total questions must equal open + closed").
### Edge Cases:
Restoring local state after browser refresh.
### API Endpoints Used:
`GET /api/subjects`, `GET /api/files`.
### Acceptance Criteria:
Generates a massive, validated JSON struct for the generation endpoint.
### Definition of Done:
Multi-step form completes generation and redirects to loading/status screen.

### Task Name: Editor / Refinement View
### Description:
WYSIWYG editor loaded with the generated Prototype. 
### UI Components:
`TipTap` or `Quill` Editor. "Restore Original" button. "Reprompt AI" text area + submit button. Answer Key accordion (readonly) below editor.
### State Management:
Hold editor HTML state. Dirty-state tracking.
### API Endpoints Used:
`GET /api/prototypes/{id}`, `PUT /api/prototypes/{id}`, `POST /api/prototypes/{id}/reprompt`.
### Error Handling:
Graceful handling if Reprompt times out.
### Edge Cases:
Pasting rich-text from other programs crashing the TipTap formatting.
### Acceptance Criteria:
Edits save. Reprompt updates editor with new AI output.
### Definition of Done:
Teacher can polish document, interact with AI, and hit "Finalize (DOCX)".

### Task Name: History Dashboard & Settings
### Description:
Data grid showing past generations and settings page.
### UI Components:
MUI `DataGrid` (Pagination, Sorting). Global Settings form for OpenAI Key.
### API Endpoints Used:
`GET /api/generations`, `GET /api/documents`, `GET /api/settings`, `POST /api/settings`.
### Loading States:
Skeleton loaders for DataGrids.
### Acceptance Criteria:
Can paginate through history, trigger bulk ZIP downloads, securely manage model preferences.

---

# 6. API SPECIFICATION TASKS

*Implement all specified endpoints with strictly validated schemas:*

**1. Auth**
- `POST /api/auth/login` - `{"password": "str"}` -> `{"token": "uuid", "expires_at": "ISO"}`
- `POST /api/auth/logout` -> `200 OK`

**2. Settings**
- `GET /api/settings` -> `{"default_model": "str", "has_api_key": bool}`
- `PUT /api/settings` - `{"openai_api_key": "str", "default_model": "str"}` -> `200 OK`

**3. Subjects**
- `GET /api/subjects` -> `[{"id": "uuid", "name": "str", "is_custom": bool}]`
- `POST /api/subjects` - `{"name": "str"}` -> `{"id": "uuid", "name": "str"}`

**4. Files**
- `POST /api/files` (Multipart/form-data) -> `{"id": "uuid", "filename": "str"}`
- `GET /api/files` -> `[{"id": "uuid", "filename": "str", "summary": "str", "file_type": "str"}]`

**5. Generations & Prototypes**
- `POST /api/generations` - (Full GenerationParams mapping) -> `{"id": "uuid", "status": "draft|processing"}`
- `GET /api/generations/{id}` -> Status polling endpoint
- `GET /api/prototypes/{generation_id}` -> `{"original_content": "html", "edited_content": "html|null", "answer_key": "html"}`
- `PUT /api/prototypes/{generation_id}` - `{"edited_content": "html"}`
- `POST /api/prototypes/{generation_id}/reprompt` - `{"prompt": "str"}`

**6. Finalization & Download**
- `POST /api/generations/{id}/finalize` -> Triggers DOCX build, returns `{"status": "processing"}`
- `GET /api/documents/{id}/download` -> Returns FileStream `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `POST /api/documents/bulk-download` - `{"document_ids": ["uuid"]}` -> Returns FileStream `application/zip`

**7. Diagnostics**
- `POST /api/backups` -> Triggers manual backup
- `GET /api/backups` -> Lists backups
- `POST /api/backups/restore` -> Triggers restore from `{backup_id}`

---

# 7. DATABASE IMPLEMENTATION TASKS

- **Migrations:** Baseline alembic migration reflecting the exact schema listed in `database_structure.md`. Convert PostgreSQL `TIMESTAMP WITH TIME ZONE` to standard SQLite behaviors. 
- **Indexes:** 
  - `idx_source_files_subject`, `idx_generations_created_at`, `idx_documents_generation` to optimize primary query paths.
- **Constraints:** Enforce `difficulty BETWEEN 1 AND 4`, `variants_count >= 1`, file size checks.
- **Seed Data:** Math, Physics, Polish, History subjects seeded on `alembic upgrade`.
- **Performance Optimizations:** Ensure `PRAGMA journal_mode=WAL;` and `PRAGMA synchronous=NORMAL;` are configured in SQLAlchemy to greatly improve concurrency handling inside SQLite during BackgroundTask writing.

---

# 8. AI / RAG / LLM TASKS

- **Document Ingestion Pipeline:** 
  - PyMuPDF (fitz) extracts raw text from PDF.
  - Text is chunked (via recursive character splitting if > context window).
  - Summarization Prompt: "Provide a 1-sentence descriptive summary of this educational material."
- **Image/Vision Ingestion:**
  - Base64 encode PNG/JPG. Send array with `image_url` object type to `gpt-5-vision`.
  - Prompt: "Transcribe all textual, structural, and mathematical components from this image exactly."
- **Generation Logic / Prompt Templates:**
  - Inject System Message defining role ("Expert Polish Teacher").
  - Inject User Params (Class, Level, Difficulty).
  - Inject Material Context.
  - Require structured output: 
  ```python
  class QuizItem(BaseModel):
      id: int
      type: Literal["open", "closed"]
      content: str
      options: Optional[List[str]]
      correct_answer: str

  class Quiz(BaseModel):
      title: str
      items: List[QuizItem]
  ```

---

# 9. TESTING TASKS

- **Unit Tests (`pytest`):**
  - Extract text accurately from a dummy 2-page PDF.
  - DOCX generation pipeline assertions (test randomization shuffles closed options differently for Variant A vs B).
- **Integration Tests:**
  - Mock `openai.AsyncClient`. Assert the prototype flow properly catches JSON and dumps to DB.
- **Frontend / E2E:**
  - Form validation testing (`vitest` on `react-hook-form` logic).
  - Playwright E2E: User logs in -> selects subject -> uploads file -> fills wizard -> views TipTap editor.

---

# 10. DEVOPS / INFRASTRUCTURE TASKS

- **Docker:**
  - `backend.Dockerfile` (`python 3.12-slim`, `uv`, install `poppler-utils` if needed for fitz/pdf).
  - `frontend.Dockerfile` (`node 20-alpine`, `npm run build`).
- **Docker Compose:**
  - `frontend` bound strictly to `127.0.0.1:3000:3000`.
  - `backend` bound strictly to `127.0.0.1:8000:8000`.
  - Storage mapping: `./edugen_data:/app/data` (for DB and files).
- **Secrets:** Hardcode default initial password hash. Provide `.env.example` defining where the backend reads its environment variables.

---

# 11. SECURITY TASKS

- **Authentication Hardening:** Implement Bcrypt for password mapping. Generate strong UUID session tokens.
- **Data Encryption:** 
  - Utilize symmetric encryption (`cryptography` library) for the structural `openai_api_key_encrypted` row. Generate fernet key dynamically into local file if absent, ensuring the SQLite DB cannot leak the AI key even if stolen off-machine (assuming fernet key file isn't taken alongside it).
- **Input Validation:** Use Pydantic to strictly reject path-traversal inputs for `subject_id` strings (`/api/subjects/../users/`).

---

# 12. PERFORMANCE OPTIMIZATION TASKS

- **Database:** Paginating historical views (`limit`/`offset`).
- **Lazy Loading (React):** Use Next.js `next/dynamic` to load TipTap and heavy layout components out of the initial critical render path.
- **Batching:** `POST /documents/bulk-download` should yield a streamed ZIP rather than accumulating everything in memory and terminating the FastAPI worker limit.
- **SQLite Concurrency:** As mentioned, `WAL` mode is mandatory since OpenAI async backgrounds will write simultaneously with frontend polling reads.

---

# 13. PRODUCTION READINESS CHECKLIST

- [ ] Monitoring: `diagnostic_logs` properly trap exceptions and print actionable messages to the frontend settings page.
- [ ] Fallbacks: Handled case where OpenAI models are down (return clear 502/503 wrapped message).
- [ ] Database Startup: Confirm `./edugen_data` creates itself implicitly if missing.
- [ ] UI Cues: Confirm 15-minute logout countdown triggers a warning modal at 14 minutes.
- [ ] Export Verification: Print-preview DOCX in Word natively handling page breaks perfectly.
- [ ] Migrations: `alembic` configured to safely add/drop columns without dropping whole tables.
