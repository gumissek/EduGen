# EduGen - Developer Documentation

**EduGen Local** is an advanced desktop application designed to run locally, assisting teachers in generating educational materials such as worksheets, quizzes, and tests. It leverages OpenAI models (GPT-5 Vision, GPT-5-mini) to create personalized content based on user guidelines and extracted source materials.

This application emphasizes privacy and data control by using local SQLite storage and local file structures via a Docker Compose deployment model. Development is focused on a two-step creation process: an interactive editor prototype, followed by a final DOCX export with varied groups (A/B) and answer keys.

---

## � Key Features

- **AI Orchestration**: Integration with OpenAI SDK (GPT-5 for Vision OCR, GPT-5-mini for text) for generating content.
- **Source File Processing**: OCR capabilities for images/scans using Vision, text extraction from PDF (via PyMuPDF) and DOCX (via python-docx).
- **Drafting & Finalization**: WYSIWYG Editor (TipTap/Quill) to review/edit AI prototypes, followed by DOCX generation with shuffled questions for multiple test variants.
- **Privacy & Security**: Entirely local environment (`localhost` only, no LAN access), local SQLite DB, AES encrypted API keys, and automatic everyday database backups.
- **Background Processing**: FastAPI BackgroundTasks for async AI generation and document processing.

---

## 🛠 Tech Stack

**Frontend**
- **Framework**: Next.js 16+ (App Router)
- **Language**: TypeScript
- **UI Library**: Material UI (MUI) with Dark/Light mode support
- **State Management**: TanStack Query (React Query)
- **Editor**: TipTap / Quill

**Backend**
- **Framework**: FastAPI (Asynchronous, High Performance)
- **Package Manager**: `uv` (Fast package manager replacing pip/poetry)
- **Database**: SQLite (SQLAlchemy + Alembic for migrations)
- **Document Tooling**: `python-docx` (DOCX), `PyMuPDF` (PDF extraction), `python-magic` (MIME detection)
- **Orchestration**: Docker Compose for hybrid startup

---

##  Setup & Quick Start

EduGen is designed for hybrid or fully containerized local execution.

**Option 1: Automated Startup (Recommended for Full Stack)**
The application provides automated scripts that start the database, backend, and frontend containers automatically:
- **Windows**: Run `start_windows.bat`
- **macOS / Linux**: Run `bash start_mac_linux.sh`
- **macOS (Finder)**: You can also double click on `Uruchom_Mac.command` to run the project via UI.

> App runs at `http://localhost:3000` (Frontend) and `http://localhost:8000` (Backend).

**Option 2: Local Development (Manual)**

**Backend:**
Ensure Python 3.12+ and `uv` are installed.
```bash
cd backend
uv venv
source .venv/bin/activate  # Or .venv\Scripts\activate on Windows
uv pip install -r requirements.txt
fastapi dev app/main.py
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## 📚 Technical Scopes & Limits

- The system does not support LAN exposure (bound to `127.0.0.1`).
- No native LaTeX support (mathematical formulas rely on linear/Unicode formatting).
- Terminated AI generation tasks cannot be resumed; they must be restarted.
- OCR scanning for PDFs is optimally limited to ranges of max 5 pages at once.

For deeply detailed insights, visit the components documentation:
- **[Backend Architecture & Models](documentation/backend_documentation.md)**
- **[Frontend Architecture & Hooks](documentation/frontend_documentation.md)**
