# EduGen - Developer Documentation

**EduGen Local** is an advanced desktop application designed to run locally, assisting teachers in generating educational materials such as worksheets, quizzes, and tests. It leverages AI models via **OpenRouter** to create personalized content based on user guidelines and extracted source materials.

This application emphasizes privacy and data control by running entirely on `localhost` via a Docker Compose deployment model. It supports multiple user accounts with JWT-based authentication. Development is focused on a two-step creation process: an interactive editor prototype, followed by a final DOCX export with varied groups (A/B) and answer keys.

---

## 🚀 Key Features

- **Multi-user Support**: JWT-based authentication system with individual accounts — each user's data is fully isolated.
- **AI Orchestration**: Integration with **OpenRouter** (`https://openrouter.ai`) for flexible model selection across providers. Users manage their own model list (`user_ai_models`) and select their preferred model in the Settings panel. API keys are stored encrypted in the `secret_keys` table.
- **Source File Processing**: OCR capabilities for images/scans using Vision, text extraction from PDF (via PyMuPDF) and DOCX (via python-docx).
- **Drafting & Finalization**: WYSIWYG Editor (TipTap) to review/edit AI prototypes, followed by DOCX generation with shuffled questions for multiple test variants.
- **Privacy & Security**: Entirely local environment (`localhost` only, no LAN access), AES-encrypted API keys stored in `secret_keys` table, bcrypt-hashed passwords, and automatic daily database backups.
- **Secure Key Handling**: OpenRouter API keys are managed only through backend endpoints and encrypted storage (not persisted in browser `localStorage`).
- **Background Processing**: FastAPI BackgroundTasks for async AI generation and document processing.
- **Unified UX Shell**: Separate topbars for authenticated vs public routes, plus a global footer (logo + contact) visible across the app.

---

## 🛠 Tech Stack

**Frontend**
- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript
- **UI Library**: Material UI (MUI) with Dark/Light mode support
- **State Management**: TanStack Query (React Query)
- **Auth**: JWT tokens via `js-cookie` + `Axios` interceptors
- **Editor**: TipTap (WYSIWYG)

**Backend**
- **Framework**: FastAPI (Asynchronous, High Performance)
- **Package Manager**: `uv` (fast package manager replacing pip/poetry)
- **Database**: PostgreSQL 16 (SQLAlchemy ORM + `psycopg` driver + Alembic for migrations)
- **Auth**: JWT (`python-jose`/`PyJWT`), bcrypt password hashing
- **AI Integration**: OpenRouter REST API (via `requests`); model preference stored per-user in `users.default_model`, available models managed in `user_ai_models` table, API keys in `secret_keys` table
- **Document Tooling**: `python-docx` (DOCX), `PyMuPDF` (PDF extraction)
- **Orchestration**: Docker Compose (3 services: `postgres`, `backend`, `frontend`)

---

## 🏁 Setup & Quick Start

EduGen is designed for fully containerized local execution via Docker Compose.

**Option 1: Automated Startup (Recommended)**

The startup scripts handle Docker checks, automatic `.env` creation from `.config_backend`, update checks via `check_update.bat` / `check_update.sh`, and automatic browser launch (~15 s after start):

| Platform | Script | How to run |
|---|---|---|
| **Windows** | `start_windows.bat` | Double-click the file |
| **macOS** | `Uruchom_Mac.command` | Double-click (Finder) — calls `start_mac_linux.sh` internally |
| **macOS / Linux** | `start_mac_linux.sh` | `bash start_mac_linux.sh` in Terminal |

> **macOS / Linux permissions:** Before first run, grant execute rights to the scripts:
> ```bash
> chmod +x start_mac_linux.sh Uruchom_Mac.command
> ```

> If `backend/.env` is missing, the startup scripts automatically copy the bundled `.config_backend` template to `backend/.env`. Remember to add your own OpenRouter API Key in the Settings panel before generating materials.

> App runs at `http://localhost:3000` (Frontend) and `http://localhost:8000` (Backend).

### UI Notes (current behavior)

- Public routes (`/`, `/about`, `/login`, `/register`) use a dedicated topbar with `Login`, `Register`, theme toggle, and public navigation.
- Authenticated routes keep a separate topbar with user profile/actions and use the sidebar layout.
- Dashboard and Subjects views include a manual **"Odśwież stronę"** action in page headers.
- Global footer includes project logo (`frontend/public/logo.png`) and contact actions.

**Stopping the application:**
- **Windows:** Press `CTRL + C` in the console window, then confirm with `T` or `Y` + `Enter`.
- **macOS / Linux:** Press `CTRL + C` in the Terminal — the `trap` handler automatically calls `docker compose down`.

**Option 2: Local Development (Manual)**

For Windows development mode, you can also use the automation script from the repository root:

```bat
dev_windows.bat
```

This script prepares backend/frontend dependencies, starts PostgreSQL (when Docker is available), and opens separate terminal windows for backend and frontend dev servers.

**Backend:**
Ensure Python 3.12+ and `uv` are installed.
```bash
cd backend
uv venv
source .venv/bin/activate  # Or .venv\Scripts\activate on Windows
uv sync
fastapi dev app/main.py
```

**Frontend:**
```bash
cd frontend
npm install
# Copy the public env template (needed for NEXT_PUBLIC_APP_* variables at dev/build time)
cp .env.local.example .env.local  # or manually create frontend/.env.local
npm run dev
```

> `frontend/.env.local` should contain:
> ```
> NEXT_PUBLIC_APP_NAME=EduGen
> NEXT_PUBLIC_APP_VERSION=1.0.1
> NEXT_PUBLIC_APP_RELEASE_DATE=2026-03-11
> ```
> In Docker these are injected automatically as build args from the root `.env`.

---

## 📚 Technical Scopes & Limits

- The system does not support LAN exposure (bound to `127.0.0.1`).
- No native LaTeX support (mathematical formulas rely on linear/Unicode formatting).
- Terminated AI generation tasks cannot be resumed; they must be restarted.
- OCR scanning for PDFs is optimally limited to ranges of max 5 pages at once.

For deeply detailed insights, visit the components documentation:
- **[Backend Architecture & Models](documentation/backend_documentation.md)**
- **[Frontend Architecture & Hooks](documentation/frontend_documentation.md)**
- **[Database Schema & Relations](documentation/database_documentation.md)**
