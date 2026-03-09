# Plan: Wdrożenie kompletnego frontendu EduGen Local

**TL;DR** — Budujemy frontend Next.js 16+ (App Router) z TypeScript od zera: inicjalizacja projektu, konfiguracja MUI z Dark/Light mode, system autentykacji z idle timer (15 min), panel ustawień (klucz API, model AI), repozytorium przedmiotów i plików z drag & drop uploaderem, wielokrokowy wizard konfiguracji generowania z persystencją w localStorage, polling statusu generowania via TanStack Query, edytor WYSIWYG (TipTap) z funkcją reprompt AI i przywracania oryginału, finalizacja DOCX z podglądem wariantów, dashboard historii z paginacją i bulk download ZIP, panel diagnostyczny i backup. Całość zapakowana w Docker.

---

## Struktura katalogów frontendu

```
frontend/
├── package.json
├── tsconfig.json
├── next.config.ts
├── .env.local.example
├── Dockerfile
├── public/
│   ├── favicon.ico
│   └── logo.svg
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout: MUI ThemeProvider, QueryClientProvider
│   │   ├── page.tsx                      # Redirect → /dashboard lub /login
│   │   ├── login/
│   │   │   └── page.tsx                  # Ekran logowania
│   │   ├── (authenticated)/
│   │   │   ├── layout.tsx                # AuthGuard + Sidebar + TopBar + IdleTimer
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx              # Historia wygenerowanych dokumentów
│   │   │   ├── generate/
│   │   │   │   ├── page.tsx              # Wizard konfiguracji generowania
│   │   │   │   └── [id]/
│   │   │   │       ├── status/
│   │   │   │       │   └── page.tsx      # Polling statusu generowania
│   │   │   │       ├── editor/
│   │   │   │       │   └── page.tsx      # Edytor WYSIWYG prototypu
│   │   │   │       └── finalize/
│   │   │   │           └── page.tsx      # Podgląd finalizacji + download DOCX
│   │   │   ├── subjects/
│   │   │   │   └── page.tsx              # Zarządzanie przedmiotami i plikami
│   │   │   ├── settings/
│   │   │   │   └── page.tsx              # Ustawienia: API key, model, backup
│   │   │   └── diagnostics/
│   │   │       └── page.tsx              # Logi diagnostyczne
│   │   └── not-found.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx               # Nawigacja boczna (drawer/persistent)
│   │   │   ├── TopBar.tsx                # Pasek górny: tytuł, theme toggle, user menu
│   │   │   └── MainLayout.tsx            # Wrapper: sidebar + content area
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx             # Formularz hasła
│   │   │   ├── AuthGuard.tsx             # Wrapper sprawdzający sesję
│   │   │   ├── IdleTimer.tsx             # Monitorowanie bezczynności (15 min)
│   │   │   └── SessionTimeoutModal.tsx   # Modal ostrzeżenia o wygaśnięciu
│   │   ├── subjects/
│   │   │   ├── SubjectList.tsx           # Lista przedmiotów z CRUD
│   │   │   ├── SubjectDialog.tsx         # Dialog dodawania/edycji przedmiotu
│   │   │   ├── FileUploader.tsx          # Drag & drop upload z walidacją
│   │   │   ├── FileList.tsx              # Lista plików w przedmiocie
│   │   │   └── FileCard.tsx              # Karta pliku: nazwa, typ, summary, status OCR
│   │   ├── generate/
│   │   │   ├── GenerationWizard.tsx      # Stepper/formularz wielokrokowy
│   │   │   ├── StepContentType.tsx       # Krok 1: Typ treści
│   │   │   ├── StepSubjectConfig.tsx     # Krok 2: Przedmiot, klasa, poziom
│   │   │   ├── StepQuestionConfig.tsx    # Krok 3: Pytania, trudność, warianty
│   │   │   ├── StepSourceFiles.tsx       # Krok 4: Wybór plików źródłowych
│   │   │   ├── StepReview.tsx            # Krok 5: Podsumowanie i start
│   │   │   └── GenerationStatusView.tsx  # Widok pollingu statusu
│   │   ├── editor/
│   │   │   ├── PrototypeEditor.tsx       # Wrapper TipTap z toolbar
│   │   │   ├── EditorToolbar.tsx         # Toolbar: bold, italic, listy, tabele
│   │   │   ├── RepromptPanel.tsx         # Pole tekstowe + przycisk "Popraw z AI"
│   │   │   ├── AnswerKeyPanel.tsx        # Accordion: klucz odpowiedzi (readonly)
│   │   │   └── RestoreOriginalButton.tsx # Przycisk przywracania oryginału
│   │   ├── documents/
│   │   │   ├── DocumentsDataGrid.tsx     # MUI DataGrid z paginacją i sortowaniem
│   │   │   ├── DocumentRow.tsx           # Wiersz: nazwa, data, przedmiot, akcje
│   │   │   ├── BulkDownloadButton.tsx    # Przycisk bulk download ZIP
│   │   │   └── DocumentFilters.tsx       # Filtry: przedmiot, data, typ
│   │   ├── settings/
│   │   │   ├── ApiKeyForm.tsx            # Formularz klucza API z walidacją
│   │   │   ├── ModelSelector.tsx         # Dropdown wyboru modelu AI
│   │   │   └── BackupPanel.tsx           # Lista backupów + trigger/restore
│   │   ├── diagnostics/
│   │   │   └── DiagnosticLogsTable.tsx   # Tabela logów z filtrowaniem
│   │   └── ui/
│   │       ├── LoadingSkeleton.tsx        # Skeleton loader dla DataGrid/kart
│   │       ├── EmptyState.tsx            # Komunikat o braku danych
│   │       ├── ErrorAlert.tsx            # Alert z komunikatem błędu
│   │       ├── ConfirmDialog.tsx         # Dialog potwierdzenia akcji
│   │       └── StatusChip.tsx            # Chip statusu: draft/processing/ready/error
│   ├── hooks/
│   │   ├── useAuth.ts                    # Hook logowania/wylogowania/sprawdzania sesji
│   │   ├── useIdleTimer.ts               # Hook monitorowania bezczynności
│   │   ├── useSubjects.ts               # TanStack Query: CRUD przedmiotów
│   │   ├── useFiles.ts                   # TanStack Query: upload/lista/usuwanie plików
│   │   ├── useGenerations.ts            # TanStack Query: tworzenie + polling statusu
│   │   ├── usePrototype.ts              # TanStack Query: pobieranie/edycja/reprompt
│   │   ├── useDocuments.ts              # TanStack Query: lista/download/bulk/delete
│   │   ├── useSettings.ts              # TanStack Query: get/update ustawień
│   │   ├── useBackups.ts               # TanStack Query: lista/trigger/restore
│   │   ├── useDiagnostics.ts           # TanStack Query: logi diagnostyczne
│   │   └── useLocalStorage.ts          # Hook persystencji formularza w localStorage
│   ├── lib/
│   │   ├── api.ts                        # Axios instance z interceptorami (baseURL, 401)
│   │   ├── queryClient.ts               # Konfiguracja TanStack QueryClient
│   │   └── constants.ts                  # Stałe: content types, education levels, difficulty
│   ├── schemas/
│   │   ├── auth.ts                       # Zod: LoginRequest, LoginResponse
│   │   ├── settings.ts                  # Zod: SettingsResponse, SettingsUpdate
│   │   ├── subject.ts                   # Zod: Subject, CreateSubject
│   │   ├── file.ts                      # Zod: SourceFile, UploadResponse
│   │   ├── generation.ts               # Zod: GenerationParams, GenerationStatus
│   │   ├── prototype.ts                # Zod: Prototype, RepromptRequest
│   │   ├── document.ts                 # Zod: Document, BulkDownloadRequest
│   │   └── backup.ts                   # Zod: Backup, RestoreRequest
│   ├── theme/
│   │   ├── theme.ts                      # MUI createTheme: paleta, typography, komponenty
│   │   ├── ThemeRegistry.tsx             # Next.js App Router MUI integration (Emotion cache)
│   │   └── ColorModeContext.tsx          # Context: toggle Dark/Light
│   └── types/
│       └── index.ts                      # Typy TypeScript współdzielone
```

---

## Faza 1 — Inicjalizacja projektu i infrastruktura

### 1. Inicjalizacja projektu Next.js
**Opis:** Utworzenie projektu Next.js 16+ z App Router i TypeScript.
**Kroki implementacji:**
1. `npx create-next-app@latest frontend --typescript --app --src-dir --tailwind=no --eslint`
2. Zainstalować zależności:
   - UI: `@mui/material @mui/icons-material @emotion/react @emotion/cache @emotion/styled`
   - Data fetching: `@tanstack/react-query @tanstack/react-query-devtools`
   - Formulary: `react-hook-form @hookform/resolvers zod`
   - HTTP: `axios`
   - Edytor: `@tiptap/react @tiptap/starter-kit @tiptap/extension-table @tiptap/extension-underline @tiptap/extension-text-align @tiptap/extension-placeholder`
   - Utility: `date-fns file-saver @types/file-saver`
3. Skonfigurować `next.config.ts` z `output: 'standalone'` (dla Docker), `rewrites` proxy do backendu (`/api/:path*` → `http://localhost:8000/api/:path*`) — tylko w development.
4. Utworzyć `.env.local.example` z `NEXT_PUBLIC_API_URL=http://localhost:8000`.

**Kluczowe decyzje:**
- Brak Tailwind CSS — MUI `sx` prop i `styled()` jako jedyny system stylowania
- `output: 'standalone'` dla optymalnego Docker image
- Proxy API w development eliminuje problemy CORS

**Kryteria akceptacji:**
- `npm run dev` uruchamia aplikację na `localhost:3000`
- Brak błędów kompilacji TypeScript

---

### 2. Konfiguracja MUI Theme i Dark/Light Mode
**Opis:** System motywów z przełącznikiem ciemny/jasny tryb.
**Kroki implementacji:**
1. Utworzyć `src/theme/theme.ts`:
   - `createTheme()` z dwoma paletami (light/dark)
   - Typography: `Roboto` (MUI default), headings sizes dopasowane do kontekstu edukacyjnego
   - Customizacja komponentów: `MuiButton`, `MuiPaper`, `MuiDataGrid` — zaokrąglone rogi, spójne paddingi
2. Utworzyć `src/theme/ThemeRegistry.tsx`:
   - `CacheProvider` z Emotion cache (key `mui`) dla Next.js App Router SSR compatibility
   - `ThemeProvider` opakowujący `CssBaseline`
3. Utworzyć `src/theme/ColorModeContext.tsx`:
   - React Context z `toggleColorMode()`
   - Persystencja preferencji w `localStorage` pod kluczem `edugen-theme-mode`
   - Domyślny tryb: `light`
4. W `src/app/layout.tsx`:
   - Wrap: `ThemeRegistry` → `ColorModeContext.Provider` → `QueryClientProvider` → `{children}`
   - Import `Roboto` font via `next/font/google`

**Komponenty:**
- `ThemeRegistry` — SSR-safe MUI provider
- `ColorModeContext` — toggle context

**Kryteria akceptacji:**
- Przełącznik w TopBar zmienia motyw natychmiast
- Odświeżenie strony zachowuje wybrany tryb
- Brak FOUC (Flash of Unstyled Content) przy SSR

---

### 3. Layout — Sidebar, TopBar, MainLayout
**Opis:** Responsywny layout z nawigacją boczną.
**Kroki implementacji:**
1. `MainLayout.tsx`:
   - Flexbox container: `Sidebar` (stałe 260px na desktop) + content area (`flex: 1`, `overflow-y: auto`)
   - Na mobile (breakpoint `md`): sidebar jako MUI `Drawer` (temporary), toggle via hamburger w TopBar
2. `Sidebar.tsx`:
   - Logo EduGen na górze
   - Nawigacja (`List` + `ListItemButton`):
     - **Generuj** → `/generate` (ikona `AddCircle`)
     - **Dashboard** → `/dashboard` (ikona `Dashboard`)
     - **Przedmioty i Pliki** → `/subjects` (ikona `FolderOpen`)
     - **Ustawienia** → `/settings` (ikona `Settings`)
     - **Diagnostyka** → `/diagnostics` (ikona `BugReport`)
   - Aktywna pozycja podświetlona (match `pathname` via `usePathname()`)
   - Na dole: wersja aplikacji
3. `TopBar.tsx`:
   - `AppBar` z:
     - Hamburger (mobile only)
     - Tytuł aktualnej strony (dynamiczny, oparty na route)
     - Przełącznik Dark/Light (`IconButton` z `Brightness4`/`Brightness7`)
     - Przycisk wylogowania (`Logout` icon)

**Routing (App Router):**
```
/login                        → publiczny
/(authenticated)/dashboard    → chroniony
/(authenticated)/generate     → chroniony
/(authenticated)/generate/[id]/status   → chroniony
/(authenticated)/generate/[id]/editor   → chroniony
/(authenticated)/generate/[id]/finalize → chroniony
/(authenticated)/subjects     → chroniony
/(authenticated)/settings     → chroniony
/(authenticated)/diagnostics  → chroniony
```

**Edge cases:**
- Na mobile sidebar zamyka się po kliknięciu linku nawigacyjnego
- Aktywny link aktualizuje się przy programowej nawigacji (`router.push`)

**Kryteria akceptacji:**
- Sidebar widoczny na desktop, drawer na mobile
- Nawigacja między stronami działa bez przeładowania
- TopBar wyświetla aktualną nazwę sekcji

---

### 4. Konfiguracja Axios i TanStack Query
**Opis:** Centralna warstwa komunikacji z backendem.
**Kroki implementacji:**
1. `src/lib/api.ts`:
   - `axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL || '' })`
   - Request interceptor: dodaje `Authorization: Bearer {token}` z cookie/memory
   - Response interceptor: na `401` → czyszczenie stanu auth, redirect do `/login`
   - Response interceptor: na `5xx` → globalny toast z komunikatem błędu
   - `withCredentials: true` (dla HttpOnly cookies)
2. `src/lib/queryClient.ts`:
   - `new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } } })`
   - Devtools w development mode (lazy import via `next/dynamic`)
3. W `src/app/layout.tsx`:
   - `QueryClientProvider` z instancją z `queryClient.ts`
   - `ReactQueryDevtools` (conditional, dev only)

**Kluczowe decyzje:**
- `staleTime: 30s` — dane nie są natychmiast refetched, ale dość często odświeżane dla jednoosobowej aplikacji
- `retry: 1` — jedna ponowna próba przy błędach sieci
- `refetchOnWindowFocus: false` — aplikacja lokalna, nie wymaga agresywnego odświeżania

**Kryteria akceptacji:**
- Zapytania do `/api/*` poprawnie routowane do backendu
- Błąd 401 automatycznie przekierowuje do logowania
- Błędy sieciowe wyświetlają toast

---

### 5. Stałe i typy współdzielone
**Opis:** Centralne definicje typów i stałych mapujących logikę biznesową.
**Kroki implementacji:**
1. `src/lib/constants.ts`:
   ```typescript
   export const CONTENT_TYPES = [
     { value: 'worksheet', label: 'Karta pracy' },
     { value: 'test', label: 'Sprawdzian' },
     { value: 'quiz', label uuids: 'Kartkówka' },
     { value: 'exam', label: 'Test' },
     { value: 'lesson_materials', label: 'Materiały na zajęcia' },
   ] as const;

   export const EDUCATION_LEVELS = [
     { value: 'primary', label: 'Szkoła podstawowa', classRange: [1, 8] },
     { value: 'secondary', label: 'Szkoła średnia', classRange: [1, 4] },
   ] as const;

   export const DIFFICULTY_LEVELS = [
     { value: 1, label: 'Łatwy' },
     { value: 2, label: 'Średni' },
     { value: 3, label: 'Trudny' },
     { value: 4, label: 'Bardzo trudny' },
   ] as const;

   export const LANGUAGE_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

   export const ALLOWED_FILE_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
   export const MAX_FILE_SIZE_MB = 10;
   export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
   export const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minut
   export const SESSION_WARNING_MS = 14 * 60 * 1000; // Ostrzeżenie na 1 min przed
   export const GENERATION_POLL_INTERVAL_MS = 3000; // Polling co 3 sekundy
   ```
2. `src/types/index.ts`:
   - Typy TypeScript mapujące odpowiedzi API (komplementarne do Zod schemas)
3. `src/schemas/*.ts`:
   - Zod schemas dla walidacji formularzy i odpowiedzi API (szczegóły w poszczególnych fazach)

**Kryteria akceptacji:**
- Wszystkie stałe importowane z jednego miejsca
- Typy zgodne ze schematem bazy danych z `database_structure.md`

---

### 6. Dockerfile frontendu
**Opis:** Multi-stage Docker build dla produkcyjnego obrazu Next.js.
**Kroki implementacji:**
1. Stage 1 (`deps`): `node:20-alpine`, `npm ci`
2. Stage 2 (`builder`): `npm run build` (output: standalone)
3. Stage 3 (`runner`): `node:20-alpine`, kopiowanie `.next/standalone` + `.next/static` + `public`
4. `EXPOSE 3000`, `CMD ["node", "server.js"]`
5. `.dockerignore`: `node_modules`, `.next`, `.env.local`

**Docker Compose (fragment):**
```yaml
frontend:
  build: ./frontend
  ports:
    - "127.0.0.1:3000:3000"
  environment:
    - NEXT_PUBLIC_API_URL=http://backend:8000
  depends_on:
    - backend
```

**Kryteria akceptacji:**
- `docker build` tworzy obraz < 200MB
- Aplikacja na `127.0.0.1:3000` poprawnie komunikuje się z backendem

---

## Faza 2 — Autentykacja i ustawienia

### 7. Ekran logowania (LoginForm)
**Opis:** Strona logowania z formularzem hasła — jedyny publiczny widok w aplikacji.
**Kroki implementacji:**
1. `src/app/login/page.tsx`:
   - Centrowany card (`Paper`) z logo EduGen, polem hasła i przyciskiem "Zaloguj"
   - Jeśli użytkownik jest już zalogowany (sprawdzenie sesji) → redirect do `/dashboard`
2. `src/components/auth/LoginForm.tsx`:
   - `react-hook-form` + `zod` schema:
     ```typescript
     const loginSchema = z.object({
       password: z.string().min(1, 'Hasło jest wymagane'),
     });
     ```
   - Submit: `POST /api/auth/login` via `useAuth` hook
   - Obsługa błędów: "Nieprawidłowe hasło" inline pod polem
   - Loading state: disabled button + spinner podczas weryfikacji
   - Po udanym logowaniu: redirect do `/dashboard` via `router.push`
3. `src/schemas/auth.ts`:
   ```typescript
   export const LoginRequestSchema = z.object({ password: z.string().min(1) });
   export const LoginResponseSchema = z.object({
     token: z.string().uuid(),
     expires_at: z.string().datetime(),
   });
   ```

**API endpoints:**
- `POST /api/auth/login` → `{ password: string }` → `{ token: string, expires_at: string }`

**UI details:**
- Klawisz Enter submit
- Autofocus na polu hasła
- Brak linku "Zapomniałem hasła" (single-user, reset via `.bat` script — informacja tekstowa)

**Edge cases:**
- Wielokrotne szybkie kliknięcia "Zaloguj" — debounce/disabled
- Backend niedostępny → komunikat "Nie można połączyć z serwerem"

**Kryteria akceptacji:**
- Poprawne hasło → redirect do dashboard
- Niepoprawne hasło → inline error, brak redirect
- Loading state widoczny podczas weryfikacji (US-001)

---

### 8. AuthGuard i zarządzanie sesją
**Opis:** Ochrona tras wymagających autentykacji + automatyczne wylogowanie.
**Kroki implementacji:**
1. `src/hooks/useAuth.ts`:
   - Stan: `isAuthenticated`, `isLoading`, `token`, `expiresAt`
   - Przechowywanie tokenu:
     - Opcja 1 (preferowana): HttpOnly cookie ustawiane przez backend — brak JS access
     - Opcja 2 (fallback): `sessionStorage` (czyszczony przy zamknięciu zakładki)
   - Funkcje: `login(password)`, `logout()`, `checkSession()`
   - `checkSession()`: wywołanie `GET /api/auth/me` lub sprawdzenie `expires_at` client-side
2. `src/components/auth/AuthGuard.tsx`:
   - Wrapper w `(authenticated)/layout.tsx`
   - Przy mount: `checkSession()` — jeśli brak/expired → redirect `/login`
   - Renderuje `<LoadingSkeleton />` do momentu weryfikacji sesji
   - Renderuje `{children}` gdy sesja aktywna
3. `src/hooks/useIdleTimer.ts`:
   - Event listeners: `mousemove`, `keydown`, `mousedown`, `scroll`, `touchstart`
   - Timer reset przy każdej aktywności
   - Po `SESSION_WARNING_MS` (14 min) → wyświetl `SessionTimeoutModal`
   - Po `SESSION_TIMEOUT_MS` (15 min) → wywołaj `logout()`, redirect `/login`
   - Cleanup listeners w `useEffect` return
4. `src/components/auth/SessionTimeoutModal.tsx`:
   - MUI `Dialog` z komunikatem "Sesja wygaśnie za 1 minutę"
   - Przycisk "Przedłuż sesję" → dowolny request API (rolling expiration w backend)
   - Przycisk "Wyloguj teraz"
   - Countdown timer (60s → 0) wyświetlany w modalu
5. `src/components/auth/IdleTimer.tsx`:
   - Komponent renderowany w `(authenticated)/layout.tsx`
   - Deleguje do `useIdleTimer` hook

**Axios interceptor (401 handling):**
```typescript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth state, redirect to /login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

**Edge cases:**
- Wiele zakładek: wylogowanie w jednej powinno wylogować w drugiej (sprawdzanie `storage` event lub polling)
- Request w tle (TanStack Query refetch) powinien resetować idle timer → **NIE** — tylko interakcja użytkownika
- Zamknięcie modalu timeout bez przedłużenia → kontynuacja odliczania

**Kryteria akceptacji:**
- Sesja wygasa po 15 minutach bezczynności (US-001)
- Modal ostrzeżenia pokazuje się na minutę przed wygaśnięciem
- 401 z backendu → automatyczny redirect do logowania
- Każda interakcja myszy/klawiatury resetuje timer

---

### 9. Panel ustawień — klucz API i model AI
**Opis:** Zarządzanie kluczem OpenAI API i wyborem domyślnego modelu (US-002).
**Kroki implementacji:**
1. `src/app/(authenticated)/settings/page.tsx`:
   - Sekcja 1: Klucz API OpenAI (`ApiKeyForm`)
   - Sekcja 2: Model AI (`ModelSelector`)
   - Sekcja 3: Kopie zapasowe (`BackupPanel`)
2. `src/components/settings/ApiKeyForm.tsx`:
   - Pole tekstowe typu `password` z przyciskiem "pokaż/ukryj"
   - Status bieżący: chip "Klucz skonfigurowany" (zielony) lub "Brak klucza" (czerwony) — na podstawie `GET /api/settings` → `has_api_key`
   - Przycisk "Zapisz klucz" → `PUT /api/settings` z `openai_api_key`
   - Przycisk "Waliduj klucz" → `POST /api/settings/validate-key` → sukces: wyświetl listę dostępnych modeli, chip zmienia się na zielony; błąd: inline alert "Klucz nieprawidłowy"
   - Po walidacji: automatycznie zasugeruj model do wyboru
3. `src/components/settings/ModelSelector.tsx`:
   - MUI `Select` z listą modeli
   - Lista zasilana z response `POST /api/settings/validate-key` → `models[]` lub predefiniowana lista fallback
   - Domyślnie wybrany: `default_model` z `GET /api/settings`
   - Zmiana → `PUT /api/settings` z `default_model`
4. `src/hooks/useSettings.ts`:
   ```typescript
   useQuery({ queryKey: ['settings'], queryFn: () => api.get('/api/settings') });
   useMutation({ mutationFn: (data) => api.put('/api/settings', data), onSuccess: () => queryClient.invalidateQueries(['settings']) });
   useMutation({ mutationFn: () => api.post('/api/settings/validate-key'), ... });
   ```
5. `src/schemas/settings.ts`:
   ```typescript
   export const SettingsResponseSchema = z.object({
     default_model: z.string(),
     has_api_key: z.boolean(),
   });
   export const SettingsUpdateSchema = z.object({
     openai_api_key: z.string().optional(),
     default_model: z.string().optional(),
   });
   ```

**API endpoints:**
- `GET /api/settings` → `{ default_model: string, has_api_key: boolean }`
- `PUT /api/settings` → `{ openai_api_key?: string, default_model?: string }`
- `POST /api/settings/validate-key` → `{ valid: boolean, models: string[] }`

**Edge cases:**
- Klucz API nigdy nie jest zwracany z backendu (bezpieczeństwo) — frontend nie wyświetla aktualnego klucza, jedynie status
- Brak klucza API → blokada generowania z odpowiednim komunikatem w wizardzie
- Walidacja klucza może trwać kilka sekund → loading spinner

**Kryteria akceptacji:**
- Użytkownik może zapisać klucz API (US-002)
- Walidacja klucza zwraca status połączenia (US-002)
- Dropdown modeli wyświetla dostępne modele (US-002)
- Klucz nigdy nie jest wyświetlany po zapisaniu

---

## Faza 3 — Przedmioty i pliki źródłowe

### 10. Zarządzanie przedmiotami (Subjects)
**Opis:** CRUD przedmiotów z podziałem na predefiniowane i własne.
**Kroki implementacji:**
1. `src/app/(authenticated)/subjects/page.tsx`:
   - Split layout: lewa kolumna — lista przedmiotów; prawa kolumna — pliki wybranego przedmiotu
   - Przycisk "Dodaj przedmiot" otwiera `SubjectDialog`
2. `src/components/subjects/SubjectList.tsx`:
   - MUI `List` z `ListItemButton`
   - Ikona przedmiotu (generyczne ikony wg nazwy lub default)
   - Badge z liczbą plików w przedmiocie
   - Predefiniowane przedmioty: Matematyka, Fizyka, Język Polski, Historia — nie można usunąć (ikona delete disabled/hidden)
   - Własne przedmioty: ikona usuwania z `ConfirmDialog`
   - Kliknięcie → załadowanie plików tego przedmiotu w prawej kolumnie
3. `src/components/subjects/SubjectDialog.tsx`:
   - MUI `Dialog` z polem nazwy
   - Walidacja Zod: `name.regex(/^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ0-9 -]+$/)` (polskie znaki dozwolone)
   - Submit → `POST /api/subjects`
   - Duplikat nazwy → inline error
4. `src/hooks/useSubjects.ts`:
   ```typescript
   useQuery({ queryKey: ['subjects'], queryFn: () => api.get('/api/subjects') });
   useMutation({ mutationFn: (name) => api.post('/api/subjects', { name }), onSuccess: () => queryClient.invalidateQueries(['subjects']) });
   useMutation({ mutationFn: (id) => api.delete(`/api/subjects/${id}`), ... });
   ```
5. `src/schemas/subject.ts`:
   ```typescript
   export const SubjectSchema = z.object({
     id: z.string().uuid(),
     name: z.string(),
     is_custom: z.boolean(),
     created_at: z.string().datetime(),
   });
   export const CreateSubjectSchema = z.object({
     name: z.string()
       .min(2, 'Minimum 2 znaki')
       .max(255)
       .regex(/^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ0-9 -]+$/, 'Dozwolone: litery, cyfry, spacje, myślniki'),
   });
   ```

**API endpoints:**
- `GET /api/subjects` → `Subject[]`
- `POST /api/subjects` → `{ name: string }` → `Subject`
- `DELETE /api/subjects/{id}` → `204`

**Edge cases:**
- Usunięcie przedmiotu z powiązanymi plikami → backend obsługuje cascade, frontend pokazuje warning w `ConfirmDialog`
- Pusta lista przedmiotów (niemożliwe przy seed data, ale obsługiwane `EmptyState`)

**Kryteria akceptacji:**
- Widoczna lista predefiniowanych i własnych przedmiotów (US-003)
- Możliwość dodawania własnych pozycji z walidacją polskich znaków (US-003)
- Usuwanie tylko własnych przedmiotów z potwierdzeniem

---

### 11. Upload i zarządzanie plikami źródłowymi
**Opis:** Drag & drop upload plików PDF/DOCX/IMG z walidacją, lista plików z metadanymi (US-004, US-005).
**Kroki implementacji:**
1. `src/components/subjects/FileUploader.tsx`:
   - Drag & drop zone (custom, MUI styled `Box` z `onDragOver`/`onDrop`)
   - Alternatywnie: przycisk "Wybierz plik" z `<input type="file" accept=".pdf,.docx,.jpg,.jpeg,.png" />`
   - Walidacja client-side PRZED uplodem:
     - Rozmiar: max `MAX_FILE_SIZE_BYTES` (10MB) → error "Plik przekracza limit 10MB"
     - Typ: sprawdzenie rozszerzenia + MIME type → error "Nieobsługiwany format pliku"
   - Progress bar (`LinearProgress`) podczas uploadu (axios `onUploadProgress`)
   - Po udanym uploadzie: invalidate query `['files', subjectId]`
   - Obsługa wielu plików jednocześnie (multiple upload z kolejkowym przetwarzaniem)
2. `src/components/subjects/FileList.tsx`:
   - Lista kart (`Grid` z `FileCard`) dla wybranego przedmiotu
   - Sortowanie: wg daty (domyślnie najnowsze)
   - `EmptyState` gdy brak plików
3. `src/components/subjects/FileCard.tsx`:
   - `Card` z:
     - Ikona typu pliku (PDF/DOCX/IMG — różne ikony `PictureAsPdf`, `Description`, `Image`)
     - Nazwa pliku (truncated jeśli za długa)
     - Rozmiar pliku (human readable: "2.4 MB")
     - Jednozdaniowe podsumowanie (`summary`) — jeśli dostępne
     - Status ekstrakcji tekstu: `StatusChip` (processing/ready/error)
     - Przycisk usuwania (soft delete z `ConfirmDialog`)
   - Skeleton loader gdy dane ładowane
4. `src/hooks/useFiles.ts`:
   ```typescript
   useQuery({
     queryKey: ['files', subjectId],
     queryFn: () => api.get(`/api/files?subject_id=${subjectId}`),
     enabled: !!subjectId,
   });
   useMutation({
     mutationFn: (formData: FormData) => api.post('/api/files', formData, {
       headers: { 'Content-Type': 'multipart/form-data' },
       onUploadProgress: (e) => setProgress(Math.round((e.loaded * 100) / e.total)),
     }),
   });
   useMutation({
     mutationFn: (id) => api.delete(`/api/files/${id}`),
     onSuccess: () => queryClient.invalidateQueries(['files', subjectId]),
   });
   ```
5. `src/schemas/file.ts`:
   ```typescript
   export const SourceFileSchema = z.object({
     id: z.string().uuid(),
     subject_id: z.string().uuid(),
     filename: z.string(),
     file_type: z.string(),
     file_size: z.number(),
     summary: z.string().nullable(),
     extracted_text: z.string().nullable(),
     page_count: z.number().nullable(),
     created_at: z.string().datetime(),
   });
   ```

**API endpoints:**
- `POST /api/files` (multipart + `subject_id`) → `{ id, filename }`
- `GET /api/files?subject_id=` → `SourceFile[]`
- `DELETE /api/files/{id}` → `204`

**Informacja o OCR (US-005):**
- Upload obrazu → karta wyświetla chip "OCR w trakcie..." → po zakończeniu: summary + extracted_text
- PDF bez warstwy tekstowej → analogicznie, informacja "Konwersja skanów (maks. 5 stron)"
- Polling statusu pliku co 5 sekund (`refetchInterval`) dokąd `extracted_text === null`

**Edge cases:**
- Upload tego samego pliku → backend obsługuje (UUID), frontend nie blokuje
- Plik > 10MB → walidacja client-side PRZED wysłaniem, brak request
- Upload przy braku połączenia z backendem → obsługa AxiosError, retry button
- Drag & drop wielu plików → kolejkowe przetwarzanie z progress bar per plik

**Kryteria akceptacji:**
- Upload plików PDF/DOCX/IMG do 10MB (US-004)
- Drag & drop z wizualnym feedbackiem
- Widoczne podsumowania plików po ekstrakcji (US-004)
- Informacja o procesowaniu OCR (US-005)
- Soft-delete z potwierdzeniem

---

## Faza 4 — Wizard generowania i polling statusu

### 12. Wizard konfiguracji generowania (GenerationWizard)
**Opis:** Wielokrokowy formularz konfiguracji parametrów generowania z persystencją w localStorage (US-003).
**Kroki implementacji:**
1. `src/app/(authenticated)/generate/page.tsx`:
   - Renderuje `GenerationWizard`
   - Przy wejściu: sprawdza localStorage na zapisany draft → jeśli istnieje, przywraca stan
2. `src/components/generate/GenerationWizard.tsx`:
   - MUI `Stepper` (horizontal na desktop, vertical na mobile) z 5 krokami
   - `react-hook-form` z `zodResolver` opakowuje cały formularz
   - Persystencja `onBlur` do `localStorage` pod kluczem `edugen-generation-draft`
   - Przyciski: "Wstecz", "Dalej" (z walidacją bieżącego kroku), "Generuj" (ostatni krok)
   - Submit → `POST /api/generations` → redirect do `/generate/{id}/status`
3. **Krok 1 — Typ treści** (`StepContentType.tsx`):
   - Grid kart (`Card`) z wyborem typu:
     - Karta pracy | Sprawdzian | Kartkówka | Test | Materiały na zajęcia
   - Wizualnie wyróżniony wybrany typ (border/shadow)
   - Walidacja: wymagany wybór
4. **Krok 2 — Przedmiot i klasa** (`StepSubjectConfig.tsx`):
   - `Select` — Przedmiot (zasilany z `GET /api/subjects`)
   - `RadioGroup` — Poziom edukacji: Szkoła podstawowa / Szkoła średnia
   - `Select` — Klasa (dynamiczny zakres: SP 1-8, LO 1-4 — na podstawie wybranego poziomu)
   - Warunkowy `Select` — Poziom językowy (A1-C2) — widoczny TYLKO gdy wybrany przedmiot to język obcy
   - Pole tekstowe — Temat (wymagane, max 500 znaków)
   - Walidacja: przedmiot + klasa + temat wymagane
5. **Krok 3 — Konfiguracja pytań** (`StepQuestionConfig.tsx`):
   - `TextField` (number) — Łączna liczba pytań
   - `TextField` (number) — Pytania otwarte
   - `TextField` (number) — Pytania zamknięte
   - **Walidacja real-time**: `open_questions + closed_questions === total_questions` → inline error jeśli nie zgadza się
   - `Slider` lub `RadioGroup` — Poziom trudności (1-4 z labelami: Łatwy → Bardzo trudny)
   - `TextField` (number) — Liczba wariantów/grup (min 1, max 6)
   - `TextField` (multiline) — Dodatkowe zalecenia/instrukcje dla AI (opcjonalne, max 2000 znaków)
6. **Krok 4 — Pliki źródłowe** (`StepSourceFiles.tsx`):
   - Lista plików zgrupowana wg przedmiotu (filtrowana do wybranego w kroku 2)
   - Checkboxy do wielokrotnego wyboru plików
   - Opis "Wybierz pliki, na podstawie których AI ma wygenerować materiał"
   - Walidacja: opcjonalne (można generować bez plików źródłowych — na podstawie samego tematu)
   - Wyświetlone: nazwa pliku, summary (jeśli dostępne)
7. **Krok 5 — Podsumowanie** (`StepReview.tsx`):
   - Karty z podsumowaniem wszystkich wybranych parametrów
   - Wizualizacja: typ, przedmiot, klasa, liczba pytań, trudność, warianty, wybrane pliki
   - Przycisk "Generuj materiał" → submit
   - Loading state podczas tworzenia generacji

**Hook `useLocalStorage.ts`:**
```typescript
function useLocalStorage<T>(key: string, initialValue: T) {
  // useState z lazy initializer odczytującym localStorage
  // useEffect zapisujący do localStorage przy zmianie
  // Obsługa JSON.parse errors (corrupted data → reset to initial)
}
```

**Zod schema (`src/schemas/generation.ts`):**
```typescript
export const GenerationParamsSchema = z.object({
  content_type: z.enum(['worksheet', 'test', 'quiz', 'exam', 'lesson_materials']),
  subject_id: z.string().uuid(),
  education_level: z.enum(['primary', 'secondary']),
  class_level: z.number().int().min(1).max(8),
  language_level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).nullable().optional(),
  topic: z.string().min(1).max(500),
  instructions: z.string().max(2000).optional(),
  difficulty: z.number().int().min(1).max(4),
  total_questions: z.number().int().min(1).max(50),
  open_questions: z.number().int().min(0),
  closed_questions: z.number().int().min(0),
  variants_count: z.number().int().min(1).max(6),
  source_file_ids: z.array(z.string().uuid()).optional(),
}).refine(
  (data) => data.open_questions + data.closed_questions === data.total_questions,
  { message: 'Suma pytań otwartych i zamkniętych musi być równa łącznej liczbie pytań', path: ['total_questions'] }
).refine(
  (data) => {
    if (data.education_level === 'primary') return data.class_level >= 1 && data.class_level <= 8;
    return data.class_level >= 1 && data.class_level <= 4;
  },
  { message: 'Nieprawidłowy zakres klasy dla wybranego poziomu edukacji', path: ['class_level'] }
);
```

**API endpoint:**
- `POST /api/generations` → `GenerationParams` → `{ id: string, status: 'processing' }`

**Edge cases:**
- Odświeżenie strony w środku wizarda → przywrócenie stanu z localStorage (US-003)
- Brak klucza API → blokada kroku 5 z komunikatem "Ustaw klucz API w Ustawieniach"
- Brak plików w wybranym przedmiocie → informacja ale nie blokada (generowanie na bazie tematu)
- Zmiana przedmiotu → reset wybranych plików w kroku 4

**Kryteria akceptacji:**
- Wielokrokowy formularz z walidacją per krok (US-003)
- Stan formularza zachowany po odświeżeniu (US-003)
- Suma pytań open + closed === total wymuszona (US-003)
- Walidacja zakresu klas dynamiczna wg poziomu edukacji
- Submit tworzy generację i przekierowuje do statusu

---

### 13. Widok statusu generowania (GenerationStatusView)
**Opis:** Polling statusu generowania AI z wizualnym feedbackiem.
**Kroki implementacji:**
1. `src/app/(authenticated)/generate/[id]/status/page.tsx`:
   - Pobiera parametr `id` z URL
   - Renderuje `GenerationStatusView`
2. `src/components/generate/GenerationStatusView.tsx`:
   - Centrowany card z:
     - Animowana ikona (MUI `CircularProgress` podczas `processing`)
     - Komunikat statusu:
       - `processing` → "Generowanie materiału... To może potrwać do 60 sekund."
       - `ready` → "Materiał gotowy! Przejdź do edytora."
       - `error` → "Wystąpił błąd podczas generowania." + `error_message`
     - Opis parametrów generowania (typ, przedmiot, klasa) — kontekst
   - Po `status === 'ready'` → automatyczny redirect do `/generate/{id}/editor` po 2 sekundach LUB przycisk "Otwórz edytor"
   - Po `status === 'error'` → przycisk "Spróbuj ponownie" (nowa generacja z tymi samymi parametrami) + "Wróć do konfiguracji"
3. `src/hooks/useGenerations.ts`:
   ```typescript
   // Polling statusu
   useQuery({
     queryKey: ['generation', id],
     queryFn: () => api.get(`/api/generations/${id}`),
     refetchInterval: (query) => {
       const status = query.state.data?.status;
       if (status === 'processing') return GENERATION_POLL_INTERVAL_MS; // 3s
       return false; // stop polling
     },
   });

   // Tworzenie generacji
   useMutation({
     mutationFn: (params: GenerationParams) => api.post('/api/generations', params),
     onSuccess: (data) => router.push(`/generate/${data.id}/status`),
   });
   ```

**API endpoint:**
- `GET /api/generations/{id}` → `{ id, status: 'draft' | 'processing' | 'ready' | 'error', error_message?: string, ... }`

**Edge cases:**
- Backend timeout (generowanie > 120s) → frontend przestaje pollować po 120s, wyświetla komunikat o możliwym problemie
- Zamknięcie zakładki i ponowne otwarcie URL statusu → kontynuacja pollingu
- Generacja usunięta lub nie istnieje → 404, redirect do wizard z komunikatem

**Kryteria akceptacji:**
- Polling co 3s aż do `ready` lub `error`
- Automatyczny redirect do edytora po gotowości
- Czytelny komunikat błędu z opcją retry

---

## Faza 5 — Edytor WYSIWYG i reprompt AI

### 14. Edytor prototypu (PrototypeEditor)
**Opis:** Edytor WYSIWYG TipTap z treścią wygenerowanego prototypu, funkcją reprompt AI i przywracaniem oryginału (US-006).
**Kroki implementacji:**
1. `src/app/(authenticated)/generate/[id]/editor/page.tsx`:
   - Pobiera prototyp via `GET /api/prototypes/{generation_id}`
   - Lazy import edytora TipTap via `next/dynamic` (code splitting — ciężki komponent)
   - Layout: edytor (70% width) + panel boczny reprompt + answer key (30% width)
2. `src/components/editor/PrototypeEditor.tsx`:
   - TipTap `useEditor` z rozszerzeniami:
     - `StarterKit` (bold, italic, headings, paragraphs, lists)
     - `Underline`
     - `Table`, `TableRow`, `TableCell`, `TableHeader`
     - `TextAlign` (left, center, right)
     - `Placeholder` ("Zacznij edytować prototyp...")
   - Początkowa zawartość: `edited_content ?? original_content` z API
   - Auto-save: debounce 2s po każdej zmianie → `PUT /api/prototypes/{generation_id}` z aktualnym HTML
   - Dirty state tracking: porównanie bieżącej treści z `original_content`
   - Formatowanie kompatybilne z DOCX: headings (H1-H3), bold, italic, underline, ordered/unordered lists, tabele
3. `src/components/editor/EditorToolbar.tsx`:
   - MUI `ToggleButtonGroup` z przyciskami formatowania:
     - Bold | Italic | Underline | Heading 1-3 | Lista numerowana | Lista punktowana | Tabela | Wyrównanie tekstu
   - Aktywny stan przycisków odzwierciedlający bieżące formatowanie kursora
4. `src/components/editor/RepromptPanel.tsx`:
   - `TextField` (multiline, max 1000 znaków) — "Opisz, co chcesz zmienić"
   - Przycisk "Popraw z AI" → `POST /api/prototypes/{generation_id}/reprompt` z `{ prompt: string }`
   - Loading state: spinner + disabled edytor podczas repromptowania
   - Po sukcesie: edytor aktualizowany nową treścią + snackbar "Treść zaktualizowana"
   - Historia promptów: lista poprzednich zapytań reprompt (opcjonalna, zapisywana w sessionStorage)
5. `src/components/editor/AnswerKeyPanel.tsx`:
   - MUI `Accordion` pod edytorem (lub w panelu bocznym)
   - Treść: `answer_key` z prototypu (readonly, HTML rendering)
   - Tytuł: "Klucz odpowiedzi"
   - Rozwinięty domyślnie: nie
6. `src/components/editor/RestoreOriginalButton.tsx`:
   - Icon button z `Restore` icon
   - `ConfirmDialog`: "Czy na pewno chcesz przywrócić oryginalną treść? Wszystkie ręczne edycje zostaną utracone."
   - Po potwierdzeniu: załadowanie `original_content` do edytora + `PUT /api/prototypes/{generation_id}` z `edited_content: null`
7. `src/hooks/usePrototype.ts`:
   ```typescript
   useQuery({
     queryKey: ['prototype', generationId],
     queryFn: () => api.get(`/api/prototypes/${generationId}`),
   });
   useMutation({
     mutationFn: (html: string) => api.put(`/api/prototypes/${generationId}`, { edited_content: html }),
   });
   useMutation({
     mutationFn: (prompt: string) => api.post(`/api/prototypes/${generationId}/reprompt`, { prompt }),
     onSuccess: () => queryClient.invalidateQueries(['prototype', generationId]),
   });
   ```

**API endpoints:**
- `GET /api/prototypes/{generation_id}` → `{ original_content: string, edited_content: string | null, answer_key: string }`
- `PUT /api/prototypes/{generation_id}` → `{ edited_content: string }`
- `POST /api/prototypes/{generation_id}/reprompt` → `{ prompt: string }` → updated prototype

**Przycisk finalizacji:**
- Na dole edytora lub w TopBar: "Finalizuj jako DOCX" → redirect do `/generate/{id}/finalize`
- Aktywny tylko gdy prototyp jest w stanie `ready`

**Edge cases:**
- Wklejanie rich text z zewnętrznych programów (Word, Chrome) → TipTap domyślnie sanitize'uje — zweryfikować że nie crashuje
- Reprompt timeout (>60s) → graceful error z możliwością retry
- Edytor z dużą ilością treści → performance (TipTap radzi sobie dobrze, ale obserwować)
- Utrata połączenia podczas auto-save → retry z exponential backoff, wizualny wskaźnik "Niezapisane zmiany"

**Kryteria akceptacji:**
- Wyświetlenie edytora WYSIWYG z treścią prototypu (US-006)
- Przywrócenie oryginału usuwa zmiany (US-006)
- Reprompt AI generuje nową wersję na podstawie uwag (US-006)
- Klucz odpowiedzi widoczny w osobnym panelu (US-006)
- Auto-save z debounce

---

## Faza 6 — Finalizacja DOCX i podgląd wariantów

### 15. Widok finalizacji DOCX
**Opis:** Podgląd konfiguracji wariantów i triggerowanie generowania DOCX (US-007).
**Kroki implementacji:**
1. `src/app/(authenticated)/generate/[id]/finalize/page.tsx`:
   - Podsumowanie: typ, przedmiot, klasa, liczba wariantów
   - Informacja o mieszaniu: "Pytania zamknięte zostaną wymieszane w kolejności, a odpowiedzi a/b/c/d zostaną przetasowane dla każdej grupy"
   - Przycisk "Generuj DOCX" → `POST /api/generations/{id}/finalize`
   - Status generowania DOCX: polling `GET /api/generations/{id}` do momentu pojawienia się dokumentu
   - Po zakończeniu: przycisk "Pobierz DOCX" → `GET /api/documents/{doc_id}/download`
2. Widok wyniku:
   - Informacja o wygenerowanych wariantach (Grupa A, B, ...)
   - Przycisk download → trigger pobrania pliku via `file-saver` lub `<a download>`
   - Link do dashboardu: "Dokument zapisany. Przejdź do historii."
3. `src/hooks/useDocuments.ts`:
   ```typescript
   // Finalizacja
   useMutation({
     mutationFn: (generationId: string) => api.post(`/api/generations/${generationId}/finalize`),
   });
   // Download
   const downloadDocument = async (documentId: string, filename: string) => {
     const response = await api.get(`/api/documents/${documentId}/download`, { responseType: 'blob' });
     saveAs(response.data, filename);
   };
   ```

**API endpoints:**
- `POST /api/generations/{id}/finalize` → `{ status: 'processing' }`
- `GET /api/documents/{id}/download` → binary DOCX stream

**Wizualizacja wariantów:**
- Jeśli `variants_count > 1`: wyświetl infografikę/tabelę:
  - Grupa A: pytania w kolejności X
  - Grupa B: pytania w kolejności Y
  - (schematycznie — szczegółowy podgląd nie jest wymagany, pełny podgląd w DOCX)

**Edge cases:**
- Finalizacja trwa dłużej niż oczekiwano → timeout polling z komunikatem
- Plik DOCX nie generuje się z powodu błędu backend → error message z retry
- Download dużego pliku → progress indicator

**Kryteria akceptacji:**
- Przycisk generuje DOCX z wariantami (US-007)
- Mieszanie pytań i odpowiedzi dla każdej grupy (US-007)
- Podział stron między grupami w DOCX (US-007)
- Klucz odpowiedzi na końcu dokumentu dla wszystkich grup (US-007)
- Plik dostępny do pobrania natychmiast po wygenerowaniu

---

## Faza 7 — Dashboard, historia i bulk download

### 16. Dashboard — historia dokumentów
**Opis:** Paginowany widok historii wygenerowanych dokumentów z filtrowaniem, sortowaniem i bulk download (US-008).
**Kroki implementacji:**
1. `src/app/(authenticated)/dashboard/page.tsx`:
   - Tytuł "Historia materiałów"
   - Filtry + DataGrid + bulk akcje
   - Domyślna strona po zalogowaniu
2. `src/components/documents/DocumentFilters.tsx`:
   - Filtry inline (`Stack` horizontal):
     - `Select` — Przedmiot (z listą przedmiotów)
     - `Select` — Typ treści (worksheet/test/quiz/exam/lesson_materials)
     - `DatePicker` — Zakres dat (od-do) — MUI `DatePicker` z `@mui/x-date-pickers`
     - `TextField` — Wyszukiwarka (po nazwie/temacie)
   - Przycisk "Wyczyść filtry"
3. `src/components/documents/DocumentsDataGrid.tsx`:
   - MUI `DataGrid` (lub `DataGrid` z `@mui/x-data-grid`):
     - Kolumny: Checkbox | Nazwa | Przedmiot | Typ | Data | Warianty | Akcje
     - Sortowanie: po dacie (domyślnie desc), nazwie, przedmiocie
     - Paginacja: server-side (`page`, `per_page`) → `GET /api/documents?page=1&per_page=20&subject_id=&sort_by=created_at_desc`
   - Skeleton loader podczas ładowania
   - `EmptyState` gdy brak dokumentów
4. `src/components/documents/DocumentRow.tsx` (jeśli custom rendering):
   - Nazwa pliku (link do edytora/finalizacji)
   - Chip przedmiotu (kolorowy)
   - Chip typu treści
   - Data (format: `dd.MM.yyyy HH:mm`)
   - Liczba wariantów
   - Akcje:
     - Download (ikona `Download`) → `GET /api/documents/{id}/download`
     - Otwórz edytor (ikona `Edit`) → `/generate/{generation_id}/editor`
     - Usuń (ikona `Delete`) → soft-delete z `ConfirmDialog`
5. `src/components/documents/BulkDownloadButton.tsx`:
   - Aktywny gdy >= 1 checkbox zaznaczony
   - `POST /api/documents/bulk-download` z `{ document_ids: [...] }`
   - Response: streamed ZIP → `file-saver` `saveAs(blob, 'edugen_documents.zip')`
   - Loading state: spinner na przycisku podczas generowania ZIP
6. `src/hooks/useDocuments.ts`:
   ```typescript
   useQuery({
     queryKey: ['documents', { page, perPage, subjectId, contentType, sortBy, search }],
     queryFn: () => api.get('/api/documents', { params: { page, per_page: perPage, subject_id: subjectId, sort_by: sortBy } }),
     placeholderData: keepPreviousData, // smooth pagination
   });
   useMutation({
     mutationFn: (id) => api.delete(`/api/documents/${id}`),
     onSuccess: () => queryClient.invalidateQueries(['documents']),
   });
   const bulkDownload = useMutation({
     mutationFn: (ids: string[]) => api.post('/api/documents/bulk-download', { document_ids: ids }, { responseType: 'blob' }),
     onSuccess: (blob) => saveAs(blob, `edugen_materialy_${format(new Date(), 'yyyyMMdd')}.zip`),
   });
   ```

**API endpoints:**
- `GET /api/documents?page=&per_page=&subject_id=&sort_by=` → `{ items: Document[], total: number, page: number, per_page: number }`
- `DELETE /api/documents/{id}` → `204`
- `POST /api/documents/bulk-download` → binary ZIP stream

**Edge cases:**
- Pusta lista (nowy użytkownik) → `EmptyState` z CTA "Wygeneruj pierwszy materiał"
- Bulk download > 50 dokumentów → ostrzeżenie o rozmiarze, ale dozwolone
- Soft-deleted dokumenty nie pojawiają się na liście (filtrowane backend-side)
- Paginacja z filtrami → reset na stronę 1 przy zmianie filtra

**Kryteria akceptacji:**
- Lista plików z paginacją i wyszukiwarką (US-008)
- Pobieranie pojedynczego pliku (US-008)
- Bulk download jako ZIP (US-008)
- Soft-delete z potwierdzeniem (US-008)
- Sortowanie po dacie, nazwie, przedmiocie

---

## Faza 8 — Backup, diagnostyka i finalizacja

### 17. Panel backupów
**Opis:** Zarządzanie kopiami zapasowymi bazy danych (US-009).
**Kroki implementacji:**
1. `src/components/settings/BackupPanel.tsx` (w ramach strony Ustawienia):
   - Sekcja "Kopie zapasowe"
   - Przycisk "Utwórz kopię zapasową" → `POST /api/backups`
   - Lista istniejących backupów (tabela):
     - Data utworzenia
     - Rozmiar
     - Przycisk "Przywróć" → `POST /api/backups/restore` z `{ backup_id }` + `ConfirmDialog`
   - Informacja: "Automatyczne kopie tworzone co 24 godziny. Retencja: 7 dni."
2. `src/hooks/useBackups.ts`:
   ```typescript
   useQuery({ queryKey: ['backups'], queryFn: () => api.get('/api/backups') });
   useMutation({
     mutationFn: () => api.post('/api/backups'),
     onSuccess: () => {
       queryClient.invalidateQueries(['backups']);
       snackbar.success('Kopia zapasowa utworzona');
     },
   });
   useMutation({
     mutationFn: (backupId: string) => api.post('/api/backups/restore', { backup_id: backupId }),
     onSuccess: () => snackbar.success('Dane przywrócone. Odśwież stronę.'),
   });
   ```

**API endpoints:**
- `POST /api/backups` → `{ id, backup_path, created_at }`
- `GET /api/backups` → `Backup[]`
- `POST /api/backups/restore` → `{ backup_id }` → `200 OK`

**Edge cases:**
- Przywracanie backupu → wymaga restartu engine backend → informacja "Po przywróceniu odśwież stronę"
- Pusta lista backupów (pierwsza instalacja) → informacja o automatycznym harmonogramie

**Kryteria akceptacji:**
- Ręczne tworzenie kopii zapasowej (US-009)
- Lista kopii z datami i rozmiarami (US-009)
- Przywracanie z potwierdzeniem (US-009)
- Informacja o automatycznych kopiach co 24h

---

### 18. Panel diagnostyczny
**Opis:** Widok logów diagnostycznych systemu.
**Kroki implementacji:**
1. `src/app/(authenticated)/diagnostics/page.tsx`:
   - Tabela logów z paginacją
   - Filtry: poziom (info/warning/error), zakres dat
2. `src/components/diagnostics/DiagnosticLogsTable.tsx`:
   - MUI `Table` lub `DataGrid`:
     - Kolumny: Data | Poziom | Wiadomość | Szczegóły
     - Chip kolorowy wg poziomu: info (blue), warning (orange), error (red)
     - Kliknięcie wiersza → rozwijane szczegóły (`metadata` JSON, sformatowane)
   - Paginacja server-side: `GET /api/diagnostics/logs?level=&page=&per_page=`
   - Auto-refresh co 30s (`refetchInterval`)
3. `src/hooks/useDiagnostics.ts`:
   ```typescript
   useQuery({
     queryKey: ['diagnostics', { level, page, perPage }],
     queryFn: () => api.get('/api/diagnostics/logs', { params: { level, page, per_page: perPage } }),
     refetchInterval: 30_000,
   });
   ```

**API endpoints:**
- `GET /api/diagnostics/logs?level=&page=&per_page=` → `{ items: DiagnosticLog[], total: number }`

**Kryteria akceptacji:**
- Paginowana lista logów z filtrowaniem po poziomie
- Kolorowe oznaczenie poziomu logów
- Szczegóły dostępne po kliknięciu
- Auto-odświeżanie co 30s

---

### 19. Wspólne komponenty UI (ui/)
**Opis:** Reużywalne komponenty wspólne dla całej aplikacji.
**Kroki implementacji:**
1. `LoadingSkeleton.tsx`:
   - Wrapper MUI `Skeleton` z wariantami: `table` (3 wiersze), `card` (1 karta), `form` (3 pola)
   - Używany jako placeholder podczas ładowania danych
2. `EmptyState.tsx`:
   - Centrowana ikona + tekst + opcjonalny CTA button
   - Props: `icon`, `title`, `description`, `actionLabel`, `onAction`
3. `ErrorAlert.tsx`:
   - MUI `Alert` severity `error` z komunikatem
   - Opcjonalny przycisk "Spróbuj ponownie" (`onRetry`)
4. `ConfirmDialog.tsx`:
   - MUI `Dialog` z `title`, `message`, "Anuluj", "Potwierdź" (konfigurowalny kolor: `error` dla usuwania)
   - Props: `open`, `onConfirm`, `onCancel`, `title`, `message`, `confirmLabel`, `severity`
5. `StatusChip.tsx`:
   - MUI `Chip` z mapowaniem statusu:
     - `draft` → szary, "Szkic"
     - `processing` → niebieski + spinner, "Przetwarzanie"
     - `ready` → zielony, "Gotowy"
     - `error` → czerwony, "Błąd"

**Kryteria akceptacji:**
- Komponenty kompatybilne z Dark/Light mode
- Spójny design na wszystkich stronach

---

### 20. Globalny system powiadomień (Snackbar)
**Opis:** System toast/snackbar dla feedbacku użytkownika.
**Kroki implementacji:**
1. Context `SnackbarProvider`:
   - MUI `Snackbar` + `Alert` w root layout
   - API: `snackbar.success(msg)`, `snackbar.error(msg)`, `snackbar.info(msg)`
   - Auto-dismiss: 5s (success/info), manual dismiss (error)
   - Kolejkowanie: max 3 visible jednocześnie, stack position bottom-left
2. Integracja:
   - Sukces operacji CRUD → snackbar success
   - Błędy API (non-401) → snackbar error
   - Axios interceptor → globalny error snackbar

**Kryteria akceptacji:**
- Toasty widoczne przy operacjach CRUD
- Błędy API wyświetlane automatycznie
- Nie przesłaniają ważnych elementów UI

---

## Weryfikacja i testy

### Testy jednostkowe (Vitest)
1. **Walidacja formularzy**: testy Zod schemas — `GenerationParamsSchema` poprawnie waliduje i odrzuca dane
2. **Hooki**: `useLocalStorage` — poprawny zapis/odczyt/reset
3. **Stałe**: `CONTENT_TYPES`, `EDUCATION_LEVELS` — spójność wartości
4. **Komponenty UI**: `StatusChip` renderuje poprawny kolor wg statusu

### Testy E2E (Playwright)
1. **Flow logowania**: Wejście na stronę → ekran logowania → wpis hasła → redirect do dashboard
2. **Flow generowania**: Login → Subjects → Upload pliku → Generate wizard (pełny) → Status polling → Edytor → Finalizacja → Download DOCX
3. **Idle timeout**: Login → brak aktywności 15 min → modal → wylogowanie
4. **Ustawienia**: Login → Settings → Wpis klucza API → Walidacja → Zmiana modelu

### Jak uruchomić testy
```bash
# Vitest
npm run test

# Playwright (wymaga uruchomionego docker compose)
npm run test:e2e
```

---

## Verification Checklist

1. `npm run build` — brak błędów TypeScript, brak ostrzeżeń krytycznych
2. `npm run dev` — aplikacja na `localhost:3000`, routing działa
3. Dark/Light mode → przełączanie bez FOUC, localStorage persystencja
4. Login flow → poprawne hasło loguje, niepoprawne wyświetla błąd, idle 15min wylogowuje
5. Subjects CRUD → dodanie/usunięcie przedmiotu, lista odświeża się
6. File upload → drag & drop + click, progress bar, 10MB limit, OCR status polling
7. Generation wizard → 5 kroków, walidacja, localStorage persystencja, submit tworzy generację
8. Status polling → co 3s, auto-redirect do edytora
9. Edytor TipTap → formatowanie, auto-save, reprompt AI, przywróć oryginał
10. Finalizacja DOCX → generowanie + download
11. Dashboard → paginacja, filtrowanie, sortowanie, bulk download ZIP, soft-delete
12. Ustawienia → klucz API, model, backup
13. Diagnostyka → logi z filtrowaniem, auto-refresh
14. Docker build → obraz < 200MB, komunikacja z backendem

---

## Decyzje techniczne

- **MUI zamiast Tailwind** — spójny design system z komponentami do formularzy, tabel, dialogów; wbudowany Dark/Light mode; brak konieczności pisania custom CSS
- **TipTap zamiast Quill** — lepsza architektura rozszerzeń, aktywny development, natywne wsparcie dla tabel i structured content, lepszy TypeScript support
- **TanStack Query zamiast SWR** — dojrzalszy devtools, `refetchInterval` do pollingu, `keepPreviousData` do smooth pagination, lepsze wsparcie mutacji
- **react-hook-form + zod** — wydajna walidacja bez re-renderów, schemat walidacji współdzielony z typami TypeScript
- **next/dynamic dla TipTap** — code splitting ciężkiego edytora z critical render path; ładowany lazy przy wejściu na stronę edytora
- **Axios zamiast fetch** — interceptory (401 handling), `onUploadProgress`, spójny error handling
- **sessionStorage dla tokenu (fallback)** — czyszczony przy zamknięciu zakładki; preferowane HttpOnly cookies
- **Server-side paginacja** — wydajność przy dużej ilości dokumentów; `limit/offset` mapowany na `page/per_page`
- **`file-saver`** — cross-browser download blobów (DOCX, ZIP) bez konieczności tworzenia `<a>` elementów
- **`date-fns`** — lekka alternatywa dla moment.js; formatowanie dat w formacie polskim
- **Brak SSR dla authenticated pages** — wszystkie strony autentykowane są client-side rendered (CSR) gdyż dane są prywatne i nie wymagają SEO
