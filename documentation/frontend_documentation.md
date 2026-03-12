# Struktura projektu EduGen (Frontend)

Podczas wprowadzania zmian w części frontendowej projektu, zawsze przestrzegaj poniższej struktury katalogów i konwencji. Projekt jest zbudowany w oparciu o framework Next.js (App Router) i React 19.

---

## 1. Architektura ogólna

Frontend aplikacji EduGen składa się z trzech głównych warstw w katalogu `src/`:
- **App Router (`app/`)** — konfiguracja ścieżek, podział na strefę uwierzytelnioną i publiczną, główne widoki (strony).
- **Komponenty (`components/`)** — podzielone domenowo na bloki funkcjonalne (auth, generowanie, edytor, layout). Korzystają z biblioteki Material UI (MUI).
- **Logika i Stan (`hooks/`, `lib/`, `schemas/`)** — zarządzanie stanem powtórnie używalnym (React Query), walidacja formularzy (Zod) oraz połączenie z API (Axios).

---

## 2. Katalog `/src/app/` – Routing

Aplikacja korzysta z Next.js App Router. Wszystkie pliki `page.tsx` w folderach definiują poszczególne ścieżki (routes).

### `src/app/(authenticated)/`
Ścieżki wymagające uwierzytelnienia. Otoczone przez `layout.tsx`, który zapewnia główny układ strony (pasek nawigacji, sidebar).
- `/dashboard` — strona startowa / panel główny użytkownika
- `/documents` — widok zapisanych dokumentów
- `/generate` — ścieżki kreatora generowania dokumentów i materiałów
- `/subjects` — zarządzanie przedmiotami i plikami źródłowymi ułatwiającymi generowanie
- `/settings` — powiązane z konfiguracją użytkownika (klucze API OpenRouter, wybór modelu)
- `/diagnostics` — diagnostyka działania (dostępna z panelu admina)
- `/admin-panel` — panel administracyjny (wyłącznie dla superuserów) z kafelkami do sekcji zarządzania

#### Aktualny podział na `/dashboard`
- Widok materiałów ma 2 sekcje:
  - **Gotowe materiały** — dokumenty sfinalizowane (jak wcześniej) z drill-down: typ treści → poziom edukacji → klasa → przedmiot → lista materiałów.
  - **Wersje robocze** — zapisane prototypy (bez aktywnego dokumentu końcowego) z identycznym drill-down i przejściem do edytora `/generate/[id]/editor`.
  - Karty wersji roboczych mają akcję usuwania z modalem potwierdzenia (`DELETE /api/prototypes/{generation_id}`).

### Ścieżki publiczne (w `src/app/`)
- `/login` — ekran logowania (email + hasło)
- `/register` — ekran rejestracji nowego konta (email, imię, nazwisko, hasło, potwierdzenie hasła)

---

## 3. Komponenty UI (`src/components/`)

Komponenty podzielone na domeny ułatwiające ich znalezienie:

### `auth/`
- **`LoginForm.tsx`** — formularz logowania z polami email i hasło. Walidacja Zod via `react-hook-form`.
- **`RegisterForm.tsx`** — formularz rejestracji z polami: email, imię, nazwisko, hasło, potwierdzenie hasła. Walidacja Zod.
- **`AuthGuard.tsx`** — strażnik tras chronionych. Sprawdza `isAuthenticated()` i przekierowuje do `/login` jeśli brak tokena. Pomija sprawdzanie na stronach `/login` i `/register`.

### `generate/`
Główny proces biznesowy to generowanie dokumentów. Elementy go wspierające:
- `GenerationWizard.tsx` — główny komponent kreatora krok po kroku.
- `StepContentType.tsx` — wybór typu materiału (kartkówka, sprawdzian, test, quiz, materiały lekcyjne).
- `StepSubjectConfig.tsx` — wybór przedmiotu i konfiguracja tematu.
- `StepQuestionConfig.tsx` — definicja liczby pytań, stopnia trudności oraz wybór typów zadań.
- `StepSourceFiles.tsx` — wybór i dodawanie własnych plików z bazą wiedzy.
- `StepReview.tsx` — weryfikacja danych przed uruchomieniem procesu na backendzie.
- `GenerationStatusView.tsx` — obsługa statusów zadania (reaguje na statusy `processing`, `draft`, `pending`, `ready`, `error`). W przypadku błędu klasyfikuje komunikat z `error_message` na kategorie (brak klucza API, limit kredytów, rate limit, timeout, błąd sieci) wyświetlając precyzyjne wskazówki dla użytkownika. Automatyczny powrót do `/generate` po 5 sekundach (odliczanie widoczne w UI), z przywróceniem kroku kreatora do StepReview (krok 4) via `localStorage`.
- `GenerationWizard.tsx` — przechowuje aktywny krok w `localStorage` (`edugen-generation-step`) obok danych formularza (`edugen-generation-draft`). Dzięki temu powrót po błędzie generowania przywraca użytkownika do ostatniego kroku (StepReview), a nie do kroku 0. Po udanej generacji obydwa klucze są czyszczone.

### `editor/`
- Edytor dokumentów oparty na silniku **Tiptap** dający interfejs modyfikacji wygenerowanej treści.
- **`RepromptInput.tsx`** — pasek prompt przyklejony na stałe do dołu ekranu (`position: fixed`). Na desktopie uwzględnia szerokość Sidebara (260 px) poprzez `left: calc(50% + 130px)` i `width: calc(100% - 292px)`, dzięki czemu jest wyśrodkowany w obszarze treści, a nie w całym viewporcie.
- Edytor prototypu (`/generate/[id]/editor`) zapisuje zmiany przyciskiem **„Zapisz wersję roboczą”** do tabeli `prototypes` (`PUT /api/prototypes/{generation_id}`), dzięki czemu materiał można później kontynuować i finalizować.

### `layout/`
- Layout aplikacji (Sidebar, TopBar).
- **`Sidebar.tsx`** wyświetla wersję aplikacji w stopce (`NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_VERSION`, `NEXT_PUBLIC_APP_RELEASE_DATE`). Zmienne są wstrzykiwane **w czasie budowania** (build-time). W trybie lokalnym (`npm run dev`) Next.js odczytuje je z `frontend/.env.local`. W Dockerze są przekazywane jako build args w `docker-compose.yml` → `Dockerfile` (`ARG`/`ENV`). Zawiera linki: Generuj, Materiały, Przedmioty i Pliki, Ustawienia.
- **`TopBar.tsx`** wyświetla: tytuł strony, imię/nazwisko i email zalogowanego użytkownika, chip z api_quota (jeśli brak secret_keys), przycisk panelu admina (dla superuserów), przełącznik motywu i przycisk wylogowania.

### Inne
- `documents/`, `subjects/`, `settings/` — komponenty odpowiadające logice poszczególnych domen.
  - **`documents/[id]/page.tsx`** — podgląd gotowego materiału zawiera akcję **„Edytuj i przenieś na wersję roboczą”** z modalem potwierdzenia; po akceptacji wywoływany jest `POST /api/documents/{document_id}/move-to-draft` i następuje przekierowanie do edytora roboczego.
  - **`subjects/FileList.tsx` + `subjects/FileCard.tsx`** — dodana opcja pobierania wgranego pliku źródłowego (`GET /api/files/{file_id}/download`).
  - **`settings/ApiKeyForm.tsx`** — CRUD kluczy API (tabela secret_keys). Dodawanie, usuwanie, walidacja klucza via OpenRouter. Na ekranach mobilnych (xs) zamiast tabeli wyświetla karty z kluczowymi informacjami i przyciskami akcji.
  - **`settings/ModelSelector.tsx`** — wybór domyślnego modelu AI (tabela `user_ai_models`). Wyświetla alertem ostrzeżenie jeśli żaden model nie jest wybrany. Po usunięciu aktualnie wybranego modelu automatycznie przełącza na pierwszy z pozostałych (lub czyści wybór jeśli lista jest pusta). Dialog dodawania z linkiem do openrouter.ai/models. Na ekranach mobilnych (xs) zamiast tabeli wyświetla interaktywne karty z przyciskiem radio.
- `ui/` — fundamentalne reużywalne fragmenty interfejsu (własne wrappery dla przycisków, powiadomienia Snackbar itp).

---

## 4. Uwierzytelnianie JWT (`src/hooks/useAuth.ts`)

Frontend korzysta z bezstanowej autoryzacji JWT:

- **`login(data)`** — wysyła `{email, password}` do `POST /api/auth/login`, zapisuje `access_token` w ciasteczku `edugen-auth` (7 dni, SameSite=Lax) via `js-cookie`, przekierowuje do `/dashboard`.
- **`register(data)`** — wysyła `{email, password, first_name, last_name}` do `POST /api/auth/register`, po sukcesie automatycznie loguje użytkownika.
- **`logout()`** — wywołuje `POST /api/auth/logout`, usuwa ciasteczko `edugen-auth`, przekierowuje do `/login`.
- **`isAuthenticated()`** — sprawdza istnienie ciasteczka `edugen-auth`.

### `src/lib/api.ts`
- Żądania wysyłane są na ścieżkę bazową `/api`, którą deweloperskie proxy lub Next.js rewrites w `next.config.ts` przekierowują do backendu pod adresem konfigurowanym przez zmienną `BACKEND_URL`.
- Interceptory requestów pobierają automatycznie JWT token ze specjalnego cookie (`edugen-auth`) i zasilają nagłówek `Authorization: Bearer <token>`.
- Interceptory response wymuszają powrót do widoku logowania w przypadku błędu `401 Unauthorized` (usuwając cookie i przekierowując do `/login`).

Za pobieranie, cache'owanie i mutację danych odpowiedzialny jest pakiet **TanStack React Query** (konfiguracja: `src/lib/queryClient.ts`).

### Wybrane hooki (`src/hooks/`)
| Hook | Przeznaczenie | Technologie |
|---|---|---|
| `useAuth.ts` | Rejestracja, logowanie, wylogowanie. Zarządzanie JWT via ciasteczko. | axios, js-cookie |
| `useDocuments.ts` | Wyświetlanie, usuwanie, podgląd detali dla `/api/documents`. Eksporter PDF. | React Query |
| `useGenerations.ts` | Wysłanie żądań o generację materiałów oraz pobranie statusu. | React Query |
| `useSubjects.ts`, `useLevels.ts` | Dane słownikowe (przedmioty, poziomy zaawansowania). | React Query |
| `useTaskTypes.ts` | Pobieranie z backendu dostępnych typów zadań. | React Query |
| `useFiles.ts` | CRUD plików źródłowych dla generatorów. | React Query |
| `useFiles.ts` | Dodatkowo pobieranie pliku źródłowego (`downloadFile`). | React Query |
| `useSecretKeys.ts` | CRUD kluczy API użytkownika (tabela secret_keys). List, create, delete, validate. | React Query |
| `useCurrentUser.ts` | Pobieranie profilu zalogowanego użytkownika (`/api/auth/me`) z polami: email, imię, nazwisko, is_superuser, api_quota, has_secret_keys. | React Query |

---

## 5. Dane i Typy (`src/types/` i `src/schemas/`)

### `src/types/index.ts`
Główne interfejsy TypeScript:
- **Enumy / String Typy:** `ContentType` (worksheet, test, quiz, exam, lesson_materials), `EducationLevel`, `LanguageLevel`
- **Interfejsy:** `Subject`, `SourceFile`, `GenerationParams` (z tablicą `task_types`)

### `src/schemas/`
Walidacja formularzy realizowana przez **Zod** we współpracy z **React Hook Form**:
- `auth.ts` — `LoginRequestSchema` (email + hasło), `RegisterRequestSchema` (email, imię, nazwisko, hasło, potwierdzenie hasła z refine), `LoginResponseSchema` (access_token + token_type).
- `generation.ts` — schematy kroków generacji.
- `document.ts`, `file.ts`, `subject.ts`, `settings.ts` — schematy żądań reszty domen.
- `settings.ts` — dodatkowo: interfejsy `SecretKey`, `SecretKeyCreate`, `SecretKeyValidateResponse` dla CRUD kluczy API.

---

## 6. Konfiguracja główna i Skrypty

### `package.json`
| Skrypt | Komenda | Opis |
|---|---|---|
| `dev` | `next dev` | Tryb developerski (Hot-Reload) |
| `build` | `next build` | Budowa wersji produkcyjnej |
| `start` | `next start` | Serwowanie po zbuildowaniu |
| `lint` | `eslint` | Weryfikacja czystości składni TypeScript/React |

### Kluczowe zależności
- `js-cookie` + `@types/js-cookie` — zarządzanie ciasteczkami JWT po stronie klienta
- `@hookform/resolvers` + `react-hook-form` + `zod` — walidacja formularzy
- `axios` — HTTP client
- `@tanstack/react-query` — zarządzanie stanem serwera
- `@mui/material` + `@emotion/*` — biblioteka komponentów UI
- `@tiptap/*` — edytor WYSIWYG

### `next.config.ts`
- Proxy routing: przekierowuje `/api/*` na Backend (`process.env.BACKEND_URL`).
- `standalone` mode dla Dockera, transpilacje pakietów MUI.

### `frontend/.env.local`
- Plik dla trybu lokalnego (dev/build). Zawiera `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_VERSION`, `NEXT_PUBLIC_APP_RELEASE_DATE`.
- W Dockerze odpowiedniki są przekazywane jako build args (`NEXT_PUBLIC_APP_*`) z `docker-compose.yml` do `Dockerfile` i inlinowane przez Next.js podczas `npm run build`.

---

## 7. Motyw i Style (`src/theme/` i `globals.css`)
- `src/theme/theme.ts` — deklaracja głównych kolorów, cieni, kształtów i typografii MUI.
- `src/theme/ThemeRegistry.tsx` i `ColorModeContext.tsx` — integracja z SSR Next.JS.
- `src/app/globals.css` — reset CSS i globalne style.

### Responsywność mobilna
Aplikacja korzysta z systemu breakpoints MUI (`xs / sm / md / lg`). Zasady stosowane globalnie:
- **Tabele** (ApiKeyForm, ModelSelector, Diagnostics) — na `xs` ukrywane na rzecz kart lub listy z redukcją kolumn (`display: { xs: 'none', sm: 'block' }`).
- **Nagłówki stron** (h4) — mniejszy `fontSize` na `xs` (`1.5rem` zamiast `2.125rem`).
- **Przyciski akcji** w nagłówkach (dashboard, editor, documents) — zamiast `flex-row` zastosowano `flexDirection: { xs: 'column', sm: 'row' }` i `width: { xs: '100%', sm: 'auto' }`.
- **Diagnostics** — `TableContainer` z `overflowX: 'auto'` i kolumna Metadane ukryta na `xs`/`sm` (`display: { xs: 'none', md: 'table-cell' }`).
- **Sidebar** — na `xs`/`sm` tymczasowy `Drawer` (overlay), stały tylko od `md`.

---

## 8. Testowanie i Jakość Kodu
- Weryfikator `ESLint` z konfiguracją Strict (`eslint.config.mjs`) połączony z TypeScript.
- `@tanstack/react-query-devtools` do debuggowania stanu zapytań w trybie `dev`.
- TypeScript strict mode — brak `any` w kodzie produkcyjnym.
