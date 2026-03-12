# Implementation Plan for Authentication & Authorization

**IMPORTANT ARCHITECTURAL CHANGE:** From this point forward, the backend will exclusively use **PostgreSQL** instead of SQLite. All local `.db` files, SQLite configurations, and SQLite-specific dependencies must be completely removed from the project.

This plan covers the implementation of a full JWT-based authentication and authorization system, along with multi-user data isolation and the transition to a secure PostgreSQL Docker infrastructure.

---

## 1. Infrastructure Changes

### Docker Compose Database Setup
**Goal:** Introduce a dedicated PostgreSQL container to store the entire application database securely, replacing the previous SQLite implementation.

The database container must:
* Run in the same **internal Docker network** as the backend.
* **NOT expose ports publicly** to the host.
* Have its own **persistent Docker volume**.
* Only be accessible from the backend service.

#### [MODIFY] `docker-compose.yml`
Add a new PostgreSQL service and a dedicated network. 

yaml

services:
  postgres:
    image: postgres:16
    container_name: edugen-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: edugen
      POSTGRES_USER: edugen_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - edugen_postgres_data:/var/lib/postgresql/data
    networks:
      - backend_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U edugen_user -d edugen"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: edugen-backend
    ports:
      - "127.0.0.1:8000:8000"
    volumes:
      - edugen_data:/app/data
      - ./common_filles:/app/common_filles
    env_file:
      - ./backend/.env
    environment:
      - UV_PROJECT_ENVIRONMENT=/app/.venv
      - DATABASE_URL=postgresql+psycopg://edugen_user:${POSTGRES_PASSWORD}@postgres:5432/edugen
    command: ["uv", "run", "sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2"]
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - backend_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - BACKEND_URL=http://backend:8000
    container_name: edugen-frontend
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped

volumes:
  edugen_data:
    driver: local
  edugen_postgres_data:
    driver: local

networks:
  backend_network:
    driver: bridge


#### Backend Database Configuration
* **[MODIFY] `backend/app/core/config.py`**: Add support for the `DATABASE_URL` environment variable.
* **[MODIFY] `backend/app/db/session.py`**: Update the SQLAlchemy engine configuration to use PostgreSQL instead of SQLite (e.g., `engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)`).
* **[REMOVE] SQLite Usage**: 
  - Delete all local `*.db` files.
  - Remove SQLite engine configurations.
  - Delete any SQLite-specific Alembic migrations that are no longer relevant.

---

## 2. Database Changes

#### [MODIFY] `backend/app/models/user.py`
Add the following fields to the `User` model:
* `first_name` (String)
* `last_name` (String)
* `email` (String, unique=True)
* `password_hash` (String)
* `is_active` (Boolean, default=True)
* `is_superuser` (Boolean, default=False)
* `created_at` (DateTime)
* `updated_at` (DateTime)
* `last_login` (DateTime, nullable=True)
* `premium_level` (Integer, default=0)
* `api_quota` (Integer, default=1000)
* `api_quota_reset` (DateTime, default=now + 30 days)
* `is_email_verified` (Boolean, default=False)
* `reset_password_token` (String, nullable=True)
* `reset_password_token_expiry` (DateTime, nullable=True)
* `email_verification_token` (String, nullable=True)
* `email_verification_token_expiry` (DateTime, nullable=True)
* `last_password_change` (DateTime, default=now)
* `failed_login_attempts` (Integer, default=0)

#### [NEW] `backend/app/models/secret_key.py`
Create a new `SecretKey` model to store external API keys securely:
* `id`
* `user_id` (Foreign Key → `users.id`)
* `platform` (String, e.g., 'openai')
* `key_name` (String, e.g., 'My OpenAI Key')
* `secret_key_hash` (String)
* `is_active` (Boolean, default=True)
* `last_used_at` (DateTime, nullable=True)
* `created_at` (DateTime)

#### [MODIFY] Shared Models
Add a `user_id` foreign key (referencing `users.id`) to establish ownership on the following models:
* `subject`
* `source_file`
* `generation`
* `prototype`
* `document`
* `ai_request` (optional, but recommended for quota tracking)

#### [NEW] Alembic Migration
* Create `backend/alembic/versions/*_multi_user_and_postgres.py`.
* **Actions:** Create `users` and `secret_keys` tables, add `user_id` columns to existing tables, and handle potential data loss by migrating existing records to a default user.

---

## 3. Backend Authentication & Authorization

#### [MODIFY] `backend/app/routers/auth.py`
Add and update endpoints using libraries like `passlib`, `bcrypt`, `pyjwt`, or `python-jose`:
* `POST /api/auth/register`: Handles user registration and password hashing.
* `POST /api/auth/login`: Authenticates credentials and returns a short-lived (30 minutes) JWT token containing `{user_id, email, exp}`.
* `POST /api/auth/logout`: Invalidates the current session.

#### [MODIFY] `backend/app/services/auth_service.py`
Update or implement the core login, registration, and JWT creation/validation business logic here.

#### [MODIFY] `backend/app/dependencies.py`
Update the `get_current_user()` middleware:
* Parse the `Authorization: Bearer <token>` header (or `httpOnly` cookie).
* Validate the JWT payload and signature.
* Reject expired tokens automatically.
* Return the active `User` object.

---

## 4. Backend User Data Isolation

All application queries must be scoped to the authenticated user to prevent data leakage. 
**Rule:** Filter all queries by `Model.user_id == current_user.id`.

Ensure the `Depends(get_current_user)` dependency is injected, and the isolation rule is applied to all endpoints in the following routers:
* **[MODIFY]** `backend/app/routers/subjects.py`
* **[MODIFY]** `backend/app/routers/files.py`
* **[MODIFY]** `backend/app/routers/generations.py`
* **[MODIFY]** `backend/app/routers/prototypes.py`
* **[MODIFY]** `backend/app/routers/documents.py`

---

## 5. Frontend Auth Implementation

#### [MODIFY] `src/lib/api.ts`
* Add an Axios request interceptor to automatically attach the JWT token (from localStorage or cookie) to all outgoing requests.
* Add a global response handler for `401 Unauthorized` errors to force a redirect to the `/login` page.

#### [MODIFY] `src/hooks/useAuth.ts`
Implement authentication methods to interface with the backend:
* `register()`
* `login()` (parse new token response and store state)
* `logout()`

#### Frontend Views & Routing
* **[NEW] `src/app/register/page.tsx`**: Create the user registration UI matching the application's design system.
* **[MODIFY] `src/app/login/page.tsx`**: Adapt the existing login page to utilize the new API endpoints and JWT flow.
* **[MODIFY] `src/app/(authenticated)/layout.tsx`**: Protect internal routes by verifying the authentication state before rendering children.

---

## 6. Documentation Updates

* **[MODIFY] `documentation/backend_documentation.md`**: Detail the JWT authentication flow, PostgreSQL setup, Secret keys storage, and multi-user data isolation mechanisms.
* **[MODIFY] `documentation/frontend_documentation.md`**: Document the protected routes mechanism and Axios interceptor setup.
* **[MODIFY] `documentation/database_structure.md`**: Update the schema to reflect the new `users` table, `secret_keys` table, and all `user_id` foreign key relationships.

---

## 7. Verification Plan

### Automated Checks
1. Boot the new infrastructure: `docker compose up -d`
2. Run migrations: `alembic upgrade head`
3. Verify that the `postgres` container is healthy and the backend connects successfully.
4. Run backend tests (e.g., `pytest backend/tests/`) if available.

### Manual Verification
1. Start the complete system (`docker compose up` or run frontend/backend manually).
2. Open the browser and execute the `/register` flow. Verify the record appears in the database.
3. Execute the `/login` flow. Check that a valid JWT token is returned and stored securely.
4. Create a new subject or generation via the UI. Verify in PostgreSQL that the `user_id` is assigned correctly.
5. Register and log in as a *second* user. Verify that the second user cannot see or access data (e.g., generations) belonging to the first user.
6. Wait 30 minutes (or manually edit the token expiry) to verify the session correctly expires and forces a redirect to `/login`.