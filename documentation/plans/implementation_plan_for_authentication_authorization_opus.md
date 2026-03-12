# Implementation Plan: Authentication & Authorization System

Migrate EduGen from single-user SQLite session-based auth to multi-user PostgreSQL JWT-based auth with full data isolation.

> [!IMPORTANT]
> **Breaking change**: All existing SQLite data will need to be migrated or recreated. The session model is being removed entirely in favor of stateless JWT tokens. The Alembic migration will create a default admin user to preserve backward compatibility.

## User Review Required

> [!WARNING]
> **PostgreSQL password**: The `POSTGRES_PASSWORD` will be loaded from a `.env` file at the project root. You will need to create this file with a secure password before running `docker compose up`.

> [!IMPORTANT]
> **JWT Secret Key**: A `JWT_SECRET_KEY` environment variable must be added to `backend/.env`. If not set, the system will auto-generate one — but this means sessions won't persist across container restarts.

---

## Proposed Changes

### Phase 1: Infrastructure — Docker + PostgreSQL

#### [MODIFY] [docker-compose.yml](file:///c:/Users/bilin/Desktop/EduGen/docker-compose.yml)
- Add `postgres` service (postgres:16) with health check, volume, and internal network
- Add `backend_network` (bridge driver) — postgres + backend only
- Add `edugen_postgres_data` volume
- Update [backend](file:///c:/Users/bilin/Desktop/EduGen/.config_backend) service: add `DATABASE_URL` env var, `depends_on: postgres`, join `backend_network`
- Frontend stays outside `backend_network` (communicates via published port)

---

#### [MODIFY] [config.py](file:///c:/Users/bilin/Desktop/EduGen/backend/app/config.py)
- Change `DATABASE_URL` default from SQLite to PostgreSQL local dev URL
- Add `JWT_SECRET_KEY`, `JWT_ALGORITHM` (default `HS256`), `JWT_EXPIRATION_MINUTES` (default `30`)

#### [MODIFY] [database.py](file:///c:/Users/bilin/Desktop/EduGen/backend/app/database.py)
- Remove SQLite-specific `connect_args={"check_same_thread": False}`
- Remove [_set_sqlite_pragmas](file:///c:/Users/bilin/Desktop/EduGen/backend/app/database.py#17-24) event listener
- Add `pool_pre_ping=True` for PostgreSQL connection resilience

#### [MODIFY] [alembic.ini](file:///c:/Users/bilin/Desktop/EduGen/backend/alembic.ini)
- Change `sqlalchemy.url` to a placeholder; actual URL will be injected via [env.py](file:///c:/Users/bilin/Desktop/EduGen/backend/alembic/env.py)

#### [MODIFY] [env.py](file:///c:/Users/bilin/Desktop/EduGen/backend/alembic/env.py)
- Read `DATABASE_URL` from `app.config.settings` and override `config.set_main_option`
- Remove `render_as_batch=True` (not needed for PostgreSQL)

#### [MODIFY] [pyproject.toml](file:///c:/Users/bilin/Desktop/EduGen/backend/pyproject.toml)
- Add `psycopg[binary]>=3.1.0` (PostgreSQL async driver)
- Add `pyjwt>=2.8.0` (JWT token handling)

---

### Phase 2: Database Schema Changes

#### [MODIFY] [user.py](file:///c:/Users/bilin/Desktop/EduGen/backend/app/models/user.py)
Add multi-user fields per the implementation plan:
- `email` (String, unique, indexed, NOT NULL)
- `first_name`, `last_name` (String, nullable)
- `is_active` (Boolean, default=True)
- `is_superuser` (Boolean, default=False)
- `premium_level` (Integer, default=0)
- Remove `must_change_password` field entirely (no more forced password change flow)
- `api_quota` (Integer, default=1000)
- `api_quota_reset` (DateTime)
- `is_email_verified` (Boolean, default=False)
- `reset_password_token`, `reset_password_token_expiry` (nullable)
- `email_verification_token`, `email_verification_token_expiry` (nullable)
- `last_password_change` (DateTime)
- `failed_login_attempts` (Integer, default=0)
- Remove `sessions` relationship (Session model is being deleted)

#### [NEW] [secret_key.py](file:///c:/Users/bilin/Desktop/EduGen/backend/app/models/secret_key.py)
New `SecretKey` model for storing external API keys:
- [id](file:///c:/Users/bilin/Desktop/EduGen/backend/app/routers/settings.py#78-100), `user_id` (FK → users.id), `platform`, `key_name`, `secret_key_hash`, `is_active`, `last_used_at`, `created_at`
- Relationship back to User

#### [MODIFY] [subject.py](file:///c:/Users/bilin/Desktop/EduGen/backend/app/models/subject.py)
- Add `user_id: Mapped[str]` FK → `users.id`, nullable (predefined subjects have no owner)
- Add relationship back to User

#### [MODIFY] [generation.py](file:///c:/Users/bilin/Desktop/EduGen/backend/app/models/generation.py)
- Add `user_id: Mapped[str]` FK → `users.id`, NOT NULL, indexed

#### [MODIFY] [source_file.py](file:///c:/Users/bilin/Desktop/EduGen/backend/app/models/source_file.py)
- Add `user_id: Mapped[str]` FK → `users.id`, NOT NULL, indexed

#### [MODIFY] [document.py](file:///c:/Users/bilin/Desktop/EduGen/backend/app/models/document.py)
- Add `user_id: Mapped[str]` FK → `users.id`, NOT NULL, indexed

#### [MODIFY] [prototype.py](file:///c:/Users/bilin/Desktop/EduGen/backend/app/models/prototype.py)
- Add `user_id: Mapped[str]` FK → `users.id`, NOT NULL

#### [MODIFY] [ai_request.py](file:///c:/Users/bilin/Desktop/EduGen/backend/app/models/ai_request.py)
- Add `user_id: Mapped[str | None]` FK → `users.id`, nullable, indexed

#### [DELETE] [session.py](file:///c:/Users/bilin/Desktop/EduGen/backend/app/models/session.py)
- JWT replaces server-side sessions entirely

#### [MODIFY] [__init__.py](file:///c:/Users/bilin/Desktop/EduGen/backend/app/models/__init__.py)
- Add `SecretKey` import
- Remove [Session](file:///c:/Users/bilin/Desktop/EduGen/backend/app/models/session.py#14-26) import

#### [NEW] [007_multi_user_and_postgres.py](file:///c:/Users/bilin/Desktop/EduGen/backend/alembic/versions/007_multi_user_and_postgres.py)
Alembic migration:
- Add new columns to `users` table (email, first_name, etc.)
- Create `secret_keys` table
- Add `user_id` columns to [subjects](file:///c:/Users/bilin/Desktop/EduGen/backend/app/routers/subjects.py#19-27), `source_files`, [generations](file:///c:/Users/bilin/Desktop/EduGen/backend/app/routers/generations.py#84-114), [documents](file:///c:/Users/bilin/Desktop/EduGen/backend/app/routers/documents.py#209-245), `prototypes`, `ai_requests`
- Drop `sessions` table
- Drop `must_change_password` from users
- Create a default admin user for existing data migration

---

### Phase 3: Backend Auth & Authorization (JWT)

#### [MODIFY] [auth.py (schemas)](file:///c:/Users/bilin/Desktop/EduGen/backend/app/schemas/auth.py)
- Add `RegisterRequest` (email, password, first_name, last_name)
- Update [LoginRequest](file:///c:/Users/bilin/Desktop/EduGen/backend/app/schemas/auth.py#8-10) to include `email` alongside [password](file:///c:/Users/bilin/Desktop/EduGen/backend/app/services/auth_service.py#21-24)
- Update [LoginResponse](file:///c:/Users/bilin/Desktop/EduGen/backend/app/schemas/auth.py#12-16) to return JWT `access_token` and `token_type`
- Add `UserResponse` schema (id, email, first_name, last_name, is_active)
- Remove [ChangePasswordRequest](file:///c:/Users/bilin/Desktop/EduGen/frontend/src/schemas/auth.ts#27-28) / [ChangePasswordResponse](file:///c:/Users/bilin/Desktop/EduGen/backend/app/schemas/auth.py#29-31) (no more forced password change)

#### [MODIFY] [auth_service.py](file:///c:/Users/bilin/Desktop/EduGen/backend/app/services/auth_service.py)
- Keep [hash_password](file:///c:/Users/bilin/Desktop/EduGen/backend/app/services/auth_service.py#21-24) and [verify_password](file:///c:/Users/bilin/Desktop/EduGen/backend/app/services/auth_service.py#16-19) (bcrypt)
- Add `create_access_token(user_id, email)` → JWT with [exp](file:///c:/Users/bilin/Desktop/EduGen/backend/app/routers/documents.py#176-207) claim
- Add `verify_access_token(token)` → decode and validate
- Rewrite [authenticate_user(db, email, password)](file:///c:/Users/bilin/Desktop/EduGen/backend/app/services/auth_service.py#26-34) → email-based lookup
- Add `register_user(db, email, password, first_name, last_name)` → create user + settings
- Remove [create_session](file:///c:/Users/bilin/Desktop/EduGen/backend/app/services/auth_service.py#36-54), [invalidate_session](file:///c:/Users/bilin/Desktop/EduGen/backend/app/services/auth_service.py#56-64), and all session logic

#### [MODIFY] [dependencies.py](file:///c:/Users/bilin/Desktop/EduGen/backend/app/dependencies.py)
- Replace session-based auth with JWT validation
- Parse `Authorization: Bearer <JWT>` header or `edugen-auth` cookie
- Decode JWT, extract `user_id`, query user, verify `is_active`
- Remove rolling expiration (JWT is stateless)
- Remove Session model import

#### [MODIFY] [auth.py (router)](file:///c:/Users/bilin/Desktop/EduGen/backend/app/routers/auth.py)
- Add `POST /api/auth/register` endpoint
- Update `POST /api/auth/login` — accept email+password, return JWT
- Update `POST /api/auth/logout` — clear cookies (JWT is stateless, no server action needed)
- Add `GET /api/auth/me` — return current user profile
- Remove `POST /api/auth/change-password` (no more forced password change flow)

#### [MODIFY] [main.py](file:///c:/Users/bilin/Desktop/EduGen/backend/app/main.py)
- **Delete [_seed_database()](file:///c:/Users/bilin/Desktop/EduGen/backend/app/main.py#31-49) entirely** — no more default/starter user; users must register
- Remove [_run_migrations()](file:///c:/Users/bilin/Desktop/EduGen/backend/app/main.py#75-106) manual SQLite column-add logic (Alembic handles everything)
- Keep backup scheduler (but backup_service will need PostgreSQL dump instead of SQLite)

---

### Phase 4: Backend User Data Isolation

Every query must scope to `current_user.id`:

#### [MODIFY] [subjects.py](file:///c:/Users/bilin/Desktop/EduGen/backend/app/routers/subjects.py)
- [list_subjects](file:///c:/Users/bilin/Desktop/EduGen/backend/app/routers/subjects.py#19-27): filter by `user_id == current_user.id` OR `user_id IS NULL` (predefined)
- [create_subject](file:///c:/Users/bilin/Desktop/EduGen/backend/app/routers/subjects.py#29-49): set `user_id = current_user.id`
- [delete_subject](file:///c:/Users/bilin/Desktop/EduGen/backend/app/routers/subjects.py#51-70): verify `user_id == current_user.id`

#### [MODIFY] [files.py](file:///c:/Users/bilin/Desktop/EduGen/backend/app/routers/files.py)
- [upload_file](file:///c:/Users/bilin/Desktop/EduGen/backend/app/routers/files.py#47-100): set `user_id = current_user.id` on [SourceFile](file:///c:/Users/bilin/Desktop/EduGen/backend/app/models/source_file.py#14-33)
- [list_files](file:///c:/Users/bilin/Desktop/EduGen/backend/app/routers/files.py#102-118): filter by `user_id == current_user.id`
- [delete_file](file:///c:/Users/bilin/Desktop/EduGen/backend/app/routers/files.py#120-133): verify ownership

#### [MODIFY] [generations.py](file:///c:/Users/bilin/Desktop/EduGen/backend/app/routers/generations.py)
- [create_generation](file:///c:/Users/bilin/Desktop/EduGen/backend/app/routers/generations.py#22-68): set `user_id = current_user.id`
- [get_generation](file:///c:/Users/bilin/Desktop/EduGen/backend/app/routers/generations.py#70-82) / [list_generations](file:///c:/Users/bilin/Desktop/EduGen/backend/app/routers/generations.py#84-114): filter by `user_id`

#### [MODIFY] [prototypes.py](file:///c:/Users/bilin/Desktop/EduGen/backend/app/routers/prototypes.py)
- All endpoints: join through [Generation](file:///c:/Users/bilin/Desktop/EduGen/backend/app/models/generation.py#14-42) and verify `Generation.user_id == current_user.id`

#### [MODIFY] [documents.py](file:///c:/Users/bilin/Desktop/EduGen/backend/app/routers/documents.py)
- All endpoints: filter `Document.user_id == current_user.id`
- Bulk download: scope to owned documents only

#### [MODIFY] [generation_service.py](file:///c:/Users/bilin/Desktop/EduGen/backend/app/services/generation_service.py)
- Fix bug at line 87: change `db.query(UserSettings).first()` → filter by `generation.user_id`

---

### Phase 5: Frontend Auth Implementation

#### [MODIFY] [auth.ts (schema)](file:///c:/Users/bilin/Desktop/EduGen/frontend/src/schemas/auth.ts)
- Update `LoginRequestSchema` to include `email` field
- Add `RegisterRequestSchema` (email, password, confirm_password, first_name, last_name)
- Update `LoginResponseSchema` — change `token` from UUID to JWT string

#### [MODIFY] [useAuth.ts](file:///c:/Users/bilin/Desktop/EduGen/frontend/src/hooks/useAuth.ts)
- Add `register()` method calling `POST /api/auth/register`
- Update [login()](file:///c:/Users/bilin/Desktop/EduGen/frontend/src/hooks/useAuth.ts#41-66) — send `{email, password}`, store JWT from `access_token`
- Keep [logout()](file:///c:/Users/bilin/Desktop/EduGen/frontend/src/hooks/useAuth.ts#78-86), [isAuthenticated()](file:///c:/Users/bilin/Desktop/EduGen/frontend/src/hooks/useAuth.ts#87-91)
- Remove [changePassword()](file:///c:/Users/bilin/Desktop/EduGen/frontend/src/hooks/useAuth.ts#67-72), [mustChangePassword()](file:///c:/Users/bilin/Desktop/EduGen/frontend/src/hooks/useAuth.ts#73-77), and `MUST_CHANGE_PASSWORD_KEY` logic entirely

#### [MODIFY] [api.ts](file:///c:/Users/bilin/Desktop/EduGen/frontend/src/lib/api.ts)
- Minor: interceptor already reads JWT from cookie and adds `Authorization: Bearer` — works as-is
- Keep 401 redirect logic

#### [NEW] [register/page.tsx](file:///c:/Users/bilin/Desktop/EduGen/frontend/src/app/register/page.tsx)
- Registration page matching the login page design system (gradient bg, Paper card)
- Link to `/login` for existing users

#### [NEW] [RegisterForm.tsx](file:///c:/Users/bilin/Desktop/EduGen/frontend/src/components/auth/RegisterForm.tsx)
- Email, first name, last name, password, confirm password fields
- Zod validation via `react-hook-form`
- Calls `register()` from [useAuth](file:///c:/Users/bilin/Desktop/EduGen/frontend/src/hooks/useAuth.ts#35-102)

#### [MODIFY] [login/page.tsx](file:///c:/Users/bilin/Desktop/EduGen/frontend/src/app/login/page.tsx)
- Add email field
- Add "Don't have an account? Register" link
- Update descriptions

#### [MODIFY] [LoginForm.tsx](file:///c:/Users/bilin/Desktop/EduGen/frontend/src/components/auth/LoginForm.tsx)
- Add email field (TextField for email)
- Send `{email, password}` to login
- Remove all references to `must_change_password`

#### [MODIFY] [AuthGuard.tsx](file:///c:/Users/bilin/Desktop/EduGen/frontend/src/components/auth/AuthGuard.tsx)
- Remove [mustChangePassword](file:///c:/Users/bilin/Desktop/EduGen/frontend/src/hooks/useAuth.ts#73-77) check and related redirect to `/change-password`
- Simplify to only check [isAuthenticated()](file:///c:/Users/bilin/Desktop/EduGen/frontend/src/hooks/useAuth.ts#87-91) → redirect to `/login` if not

#### [DELETE] [ChangePasswordForm.tsx](file:///c:/Users/bilin/Desktop/EduGen/frontend/src/components/auth/ChangePasswordForm.tsx)
- No longer needed — forced password change flow is removed

#### [DELETE] [change-password/](file:///c:/Users/bilin/Desktop/EduGen/frontend/src/app/(authenticated)/change-password)
- Remove the entire change-password route

---

### Phase 6: Documentation

#### [MODIFY] [backend_documentation.md](file:///c:/Users/bilin/Desktop/EduGen/documentation/backend_documentation.md)
- Document JWT auth flow, PostgreSQL setup, SecretKey model, user data isolation

#### [MODIFY] [frontend_documentation.md](file:///c:/Users/bilin/Desktop/EduGen/documentation/frontend_documentation.md)
- Document register page, protected routes, JWT storage

#### [MODIFY] [database_structure.md](file:///c:/Users/bilin/Desktop/EduGen/documentation/database_structure.md)
- Update all table schemas for PostgreSQL types
- Add `users` expanded schema, `secret_keys` table, `user_id` FK columns

---

## Verification Plan

### Automated Checks

Since there are no existing tests in the backend, verification will be done via:

1. **Docker infrastructure boot**:
   ```bash
   docker compose up -d
   docker compose ps   # verify all 3 services healthy
   docker compose logs postgres  # verify PostgreSQL ready
   ```

2. **Alembic migration check**:
   ```bash
   docker compose exec backend alembic upgrade head
   docker compose exec backend alembic current  # verify at head
   ```

3. **Health check**:
   ```bash
   curl http://localhost:8000/api/health  # expect {"status": "ok"}
   ```

### Manual Verification (Browser)

1. **Registration flow**:
   - Navigate to `http://localhost:3000/register`
   - Fill in email, name, password and submit
   - Verify redirect to `/dashboard`
   - Verify user record in PostgreSQL: `docker compose exec postgres psql -U edugen_user -d edugen -c "SELECT id, email FROM users;"`

2. **Login flow**:
   - Navigate to `http://localhost:3000/login`
   - Enter email + password
   - Verify redirect to `/dashboard`
   - Check browser cookie `edugen-auth` contains a JWT (three base64 segments separated by dots)

3. **Data isolation**:
   - As User A: create a subject & generation
   - Register as User B, log in
   - Verify User B sees zero subjects/generations (the data is isolated)

4. **JWT expiration**:
   - Log in, note the token
   - Wait 30 minutes (or manually create an expired token)
   - Verify the app redirects to `/login`

5. **Logout**:
   - Click logout
   - Verify redirect to `/login`
   - Verify the `edugen-auth` cookie is cleared
