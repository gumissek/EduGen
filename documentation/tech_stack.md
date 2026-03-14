# EDUGEN - TECHNICAL STACK DOCUMENTATION

## BACKEND ARCHITECTURE (Python 3.12+)
---
* Framework: FastAPI (Asynchronous REST API).
* ORM: SQLAlchemy using PostgreSQL 16 as the database engine.
* Database Migrations: Managed via Alembic (Current version: 007).
* Validation & Settings: Pydantic v2 and pydantic-settings.
* Background Tasks: APScheduler for daily backups and asynchronous AI generation.
* Document Processing:
    - File parsing: PyMuPDF (fitz) for PDF text extraction, python-docx for DOCX file reading.
    - Document export pipeline: HTML → BeautifulSoup (cleaning) → markdownify → Markdown → Pandoc (pypandoc) → DOCX / PDF.
    - System dependencies: pandoc, texlive-xetex (installed in Docker for PDF generation).
* Security:
    - Password Hashing: Bcrypt with failed login attempt tracking.
    - Key Encryption: AES encryption for external API keys (OpenRouter).
    - Authentication: Stateless JWT (JSON Web Tokens) with HS256 algorithm.

## FRONTEND ARCHITECTURE (TypeScript)
---
* Framework: Next.js (App Router) with React 19.
* State Management: TanStack React Query for server-state and caching.
* UI Library: Material UI (MUI) for components and layout.
* Rich Text Editor: Tiptap for the document prototype editor.
* Form Management: React Hook Form integrated with Zod for schema validation.
* HTTP Client: Axios with interceptors for JWT injection and 401 error handling.
* Auth Utilities: js-cookie for managing the "edugen-auth" JWT cookie.

## DATABASE & STORAGE (PostgreSQL 16)
---
* Key Strategy: UUIDs (VARCHAR(36)) used as primary keys.
* Time Storage: ISO 8601 strings stored as TEXT.
* Optimization: Unique and non-unique indexing on user_id, created_at, and status fields.
* File Management:
    - SHA-256 hashing for global file content deduplication (file_content_cache).
    - Soft delete implementation for source files and documents (deleted_at).
* Data Isolation: Multi-user isolation enforced via user_id foreign keys on all data tables.

## INFRASTRUCTURE & DEVOPS
--- 
* Containerization: Docker Compose with three distinct services (postgres, backend, frontend).
* Networking: Internal communication via 'backend_network'.
* Storage: Persistent volumes for PostgreSQL data and a host-mapped './data' directory for backups and documents.
* Environment Control: Configuration via .env files (based on .env.example).