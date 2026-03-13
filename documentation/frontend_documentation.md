# Struktura projektu EduGen (Frontend)

Podczas wprowadzania zmian w części frontendowej projektu, zawsze przestrzegaj poniższej struktury katalogów i konwencji. Projekt jest zbudowany w oparciu o framework Next.js (App Router) i React 19.

## Struktura plików

```
frontend/
├── src/
│   ├── proxy.ts
│   ├── app/
│   │   ├── layout.tsx              # Root layout (providers, globals.css)
│   │   ├── page.tsx                # Strona publiczna /
│   │   ├── globals.css
│   │   ├── AppProviders.tsx        # QueryClient, ThemeRegistry, ColorMode
│   │   ├── not-found.tsx
│   │   ├── about/                  # /about
│   │   ├── login/                  # /login
│   │   ├── register/               # /register
│   │   ├── verify-email-change/    # /verify-email-change?token=...
│   │   ├── email-change-succeeded/ # /email-change-succeeded
│   │   └── (authenticated)/        # Trasy chronione layoutem uwierzytelnionym
│   │       ├── layout.tsx
│   │       ├── dashboard/
│   │       ├── documents/
│   │       ├── generate/
│   │       ├── subjects/
│   │       ├── settings/
│   │       ├── profile/
│   │       ├── diagnostics/
│   │       └── admin-panel/
│   │           ├── page.tsx
│   │           ├── users/
│   │           └── database/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── AuthGuard.tsx
│   │   ├── generate/
│   │   │   ├── GenerationWizard.tsx
│   │   │   ├── StepContentType.tsx
│   │   │   ├── StepSubjectConfig.tsx
│   │   │   ├── StepQuestionConfig.tsx
│   │   │   ├── StepSourceFiles.tsx
│   │   │   ├── StepReview.tsx
│   │   │   └── GenerationStatusView.tsx
│   │   ├── editor/
│   │   │   ├── TipTapEditor.tsx
│   │   │   └── RepromptInput.tsx
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopBar.tsx
│   │   │   ├── PublicTopBar.tsx
│   │   │   ├── PublicChrome.tsx
│   │   │   └── AppFooter.tsx
│   │   ├── documents/
│   │   ├── subjects/
│   │   │   ├── FileList.tsx
│   │   │   └── FileCard.tsx
│   │   ├── settings/
│   │   │   ├── ApiKeyForm.tsx
│   │   │   └── ModelSelector.tsx
│   │   └── ui/                     # Reużywalne wrappery UI (przyciski, Snackbar itp.)
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useCurrentUser.ts
│   │   ├── useDocuments.ts
│   │   ├── useFiles.ts
│   │   ├── useGenerations.ts
│   │   ├── useLevels.ts
│   │   ├── useSecretKeys.ts
│   │   ├── useSubjects.ts
│   │   └── useTaskTypes.ts
│   ├── lib/
│   │   ├── api.ts                  # Axios instance z interceptorami JWT
│   │   ├── constants.ts
│   │   ├── logger.ts               # Logger z znacznikami czasu ISO-8601
│   │   └── queryClient.ts          # React Query client
│   ├── schemas/
│   │   ├── auth.ts
│   │   ├── document.ts
│   │   ├── file.ts
│   │   ├── generation.ts
│   │   ├── settings.ts
│   │   └── subject.ts
│   ├── theme/
│   │   ├── theme.ts
│   │   ├── ThemeRegistry.tsx
│   │   └── ColorModeContext.tsx
│   └── types/
│       └── index.ts
├── public/
├── next.config.ts
├── tsconfig.json
├── package.json
├── eslint.config.mjs
└── Dockerfile
```

---

## 1. Architektura ogólna

Frontend aplikacji EduGen składa się z trzech głównych warstw w katalogu `src/`:
- **App Router (`app/`)** — konfiguracja ścieżek, podział na strefę uwierzytelnioną i publiczną, główne widoki (strony).
- **Komponenty (`components/`)** — podzielone domenowo na bloki funkcjonalne (auth, generowanie, edytor, layout). Korzystają z biblioteki Material UI (MUI).
- **Logika i Stan (`hooks/`, `lib/`, `schemas/`)** — zarządzanie stanem powtórnie używalnym (React Query), walidacja formularzy (Zod) oraz połączenie z API (Axios).
- **Logowanie** — Centralny moduł `src/lib/logger.ts` dodaje znaczniki czasu ISO-8601 do wszystkich logów. Format: `2024-01-15T12:30:45.123Z [INFO ] treść`.

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
- `/profile` — profil użytkownika: edycja danych osobowych (imię, nazwisko), weryfikowana zmiana e-mail (modal z hasłem → link na nowy e-mail, 24h), weryfikowana zmiana hasła (modal z kodem 6-cyfrowym wysyłanym na e-mail, 5 min), statystyki użytkownika
- `/diagnostics` — diagnostyka działania (dostępna z panelu admina)
- `/admin-panel` — panel administracyjny (wyłącznie dla superuserów) z kafelkami do sekcji zarządzania
  - `/admin-panel/users` — pełne zarządzanie użytkownikami (lista, edycja, usuwanie, reset hasła)
  - `/admin-panel/database` — pełny backup bazy (utworzenie zrzutu, pobranie, upload, restore)

#### Aktualny podział na `/dashboard`
- Widok materiałów ma 2 sekcje:
  - **Gotowe materiały** — dokumenty sfinalizowane (jak wcześniej) z drill-down: typ treści → poziom edukacji → klasa → przedmiot → lista materiałów.
    - Karty gotowych materiałów mają akcję kopiowania (`POST /api/documents/{document_id}/copy`).
  - **Wersje robocze** — zapisane prototypy (bez aktywnego dokumentu końcowego) z identycznym drill-down i przejściem do edytora `/generate/[id]/editor`.
  - Karty wersji roboczych mają akcję usuwania z modalem potwierdzenia (`DELETE /api/prototypes/{generation_id}`).
  - Karty wersji roboczych mają akcję kopiowania (`POST /api/prototypes/{generation_id}/copy`).

### Ścieżki publiczne (w `src/app/`)
- `/` — publiczna strona wejściowa (opis aplikacji, placeholdery: tekst/obrazy/wideo, linki do `/login`, `/register`, `/about` i disabled odnośniki na przyszłość)
- `/about` — publiczna strona „O nas” z mock danymi
- `/login` — ekran logowania (email + hasło)
- `/register` — ekran rejestracji nowego konta (email, imię, nazwisko, hasło, potwierdzenie hasła)- `/verify-email-change` — strona weryfikacji zmiany e-mail (przyjmuje `?token=...` z linku weryfikacyjnego, wywołuje `GET /api/auth/verify-email-change` i przekierowuje do `/email-change-succeeded`)
- `/email-change-succeeded` — strona sukcesu po zmianie e-mail (komunikat + automatyczne wylogowanie i przekierowanie do `/login` po 10 sekundach)- Publiczne strony korzystają z `PublicChrome` (stały topbar + stała stopka) i mają oddzielny topbar od strefy zalogowanej.

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
- `TipTapEditor.tsx` ustawia `immediatelyRender: false`, aby uniknąć ostrzeżeń SSR/hydration podczas inicjalizacji edytora w Next.js.
- **Drag-and-drop reorder (US-011):** `TipTapEditor.tsx` integruje `@tiptap/extension-drag-handle-react`. W trybie edycji po lewej stronie każdego bloku pojawia się uchwyt (`DragIndicatorIcon`) widoczny po najechaniu kursorem. Po zakończeniu przeciągania bloku (`onElementDragStart` + `onUpdate`) wywoływana jest funkcja `renumberQuestions`, która przeszukuje DOM edytora i automatycznie przenumerowuje wszystkie bloki zaczynające się od wzorca `N. ` (pytania). Operacja drag-and-drop jest odwracalna przez Ctrl+Z dzięki wbudowanej historii TipTap (StarterKit).- **Bubble menu — wzajemne wykluczanie tabeli i komentarzy:** `TableBubbleMenu` wyświetla się wyłącznie gdy kursor/zaznaczenie znajduje się wewnątrz komórki tabeli (`editor.isActive("tableCell")` / `"tableHeader"` lub `CellSelection`). `CommentBubbleMenu` stosuje podwójną ochronę — najpierw sprawdza `editor.isActive("tableCell"/"tableHeader")`, a następnie wykonuje ręczne przejście po drzewie węzłów (`$from.node(d)`) — i nigdy nie pojawia się, gdy kursor jest wewnątrz tabeli.
- **Usuwanie komentarzy:** Przycisk „Usuń komentarz" w `CommentBubbleMenu` korzysta z `extendMarkRange("comment")` przed `unsetMark("comment")`, dzięki czemu komentarz jest usuwany poprawnie nawet gdy kursor jest ustawiony wewnątrz komentarza bez zaznaczenia tekstu.- **`RepromptInput.tsx`** — pasek prompt przyklejony na stałe do dołu ekranu (`position: fixed`). Na desktopie uwzględnia szerokość Sidebara (260 px) poprzez `left: calc(50% + 130px)` i `width: calc(100% - 292px)`, dzięki czemu jest wyśrodkowany w obszarze treści, a nie w całym viewporcie.
- Edytor prototypu (`/generate/[id]/editor`) zapisuje zmiany przyciskiem **„Zapisz wersję roboczą”** do tabeli `prototypes` (`PUT /api/prototypes/{generation_id}`), dzięki czemu materiał można później kontynuować i finalizować.

### `layout/`
- Layout aplikacji (Sidebar, TopBar).
- **`Sidebar.tsx`** wyświetla wersję aplikacji w stopce (`NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_VERSION`, `NEXT_PUBLIC_APP_RELEASE_DATE`). Zmienne są wstrzykiwane **w czasie budowania** (build-time). W trybie lokalnym (`npm run dev`) Next.js odczytuje je z `frontend/.env.local`. W Dockerze są przekazywane jako build args w `docker-compose.yml` → `Dockerfile` (`ARG`/`ENV`). Zawiera linki: Generuj, Materiały, Przedmioty i Pliki, Ustawienia.
- **`Sidebar.tsx`** wyświetla w dolnej sekcji: logo, kontakt e-mail oraz wersję aplikacji (`NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_VERSION`, `NEXT_PUBLIC_APP_RELEASE_DATE`). Zmienne są wstrzykiwane **w czasie budowania** (build-time). W trybie lokalnym (`npm run dev`) Next.js odczytuje je z `frontend/.env.local`. W Dockerze są przekazywane jako build args w `docker-compose.yml` → `Dockerfile` (`ARG`/`ENV`). Zawiera linki: Generuj, Materiały, Przedmioty i Pliki, Ustawienia.
- **`TopBar.tsx`** wyświetla: tytuł strony, imię/nazwisko i email zalogowanego użytkownika, chip z api_quota (jeśli brak secret_keys), przycisk panelu admina (dla superuserów), przełącznik motywu i przycisk wylogowania.
- **`TopBar.tsx`** wyświetla: tytuł strony, imię/nazwisko i email zalogowanego użytkownika, chip z api_quota (jeśli brak secret_keys), przycisk panelu admina (dla superuserów), globalny przycisk **„Odśwież stronę”**, przełącznik motywu i przycisk wylogowania.
- **`PublicTopBar.tsx`** — topbar dla niezalogowanych z nawigacją (`Start`, `O nas`), akcjami `Login`/`Register` oraz przełącznikiem motywu.
- **`PublicChrome.tsx`** — warstwa layoutu dla publicznych tras; odpowiada za stały publiczny topbar i stopkę.
- **`AppFooter.tsx`** — stopka dla strefy publicznej; zawiera logo (`/logo.png`) i kontakt.
- `PublicChrome.tsx` utrzymuje stabilny markup SSR/CSR (topbar, toolbar i stopka są stale montowane, a na trasach zalogowanych ukrywane przez `hidden`), co ogranicza błędy hydracji.
- `PublicTopBar.tsx` stosuje bezpieczny dla hydracji render zależny od motywu (`resolvedMode` po montażu) oraz krótsze etykiety CTA na `xs` (`Login`, `Konto`) dla lepszej użyteczności mobilnej.

### Inne
- `documents/`, `subjects/`, `settings/` — komponenty odpowiadające logice poszczególnych domen.
  - **`documents/[id]/page.tsx`** — podgląd gotowego materiału zawiera akcję **„Edytuj i przenieś na wersję roboczą”** z modalem potwierdzenia; po akceptacji wywoływany jest `POST /api/documents/{document_id}/move-to-draft` i następuje przekierowanie do edytora roboczego.
  - **`subjects/FileList.tsx` + `subjects/FileCard.tsx`** — dodana opcja pobierania wgranego pliku źródłowego (`GET /api/files/{file_id}/download`).
  - **`settings/ApiKeyForm.tsx`** — CRUD kluczy API (tabela secret_keys). Dodawanie, usuwanie, walidacja klucza via OpenRouter. Na ekranach mobilnych (xs) zamiast tabeli wyświetla karty z kluczowymi informacjami i przyciskami akcji.
  - **`(authenticated)/settings/page.tsx`** — zawiera informację bezpieczeństwa, że klucz OpenRouter nie jest przechowywany w `localStorage`, tylko szyfrowany po stronie backendu.
  - **`settings/ModelSelector.tsx`** — wybór domyślnego modelu AI (tabela `user_ai_models`). Wyświetla alertem ostrzeżenie jeśli żaden model nie jest wybrany. Po usunięciu aktualnie wybranego modelu automatycznie przełącza na pierwszy z pozostałych (lub czyści wybór jeśli lista jest pusta). Dialog dodawania z linkiem do openrouter.ai/models. Na ekranach mobilnych (xs) zamiast tabeli wyświetla interaktywne karty z przyciskiem radio.
  - Backupy zostały przeniesione z ustawień użytkownika do sekcji admin (`/admin-panel/database`).
- `ui/` — fundamentalne reużywalne fragmenty interfejsu (własne wrappery dla przycisków, powiadomienia Snackbar itp).

---

## 4. Uwierzytelnianie JWT (`src/hooks/useAuth.ts`)

Frontend korzysta z bezstanowej autoryzacji JWT:

- **`login(data)`** — wysyła `{email, password}` do `POST /api/auth/login`, zapisuje `access_token` w ciasteczku `edugen-auth` (7 dni, SameSite=Lax) via `js-cookie`, czyści cache React Query i przekierowuje do `/dashboard`.
- **`register(data)`** — wysyła `{email, password, first_name, last_name}` do `POST /api/auth/register`, po sukcesie automatycznie loguje użytkownika.
- **`logout()`** — wywołuje `POST /api/auth/logout`, usuwa ciasteczko `edugen-auth`, czyści cache React Query oraz lokalny draft kreatora (`edugen-generation-*`), a następnie przekierowuje do `/login`.
- **`isAuthenticated()`** — sprawdza istnienie ciasteczka `edugen-auth`.

> Klucze OpenRouter nie są przechowywane po stronie przeglądarki (w tym w `localStorage`).

### `src/lib/api.ts`
- Żądania wysyłane są na ścieżkę bazową `/api`, którą deweloperskie proxy lub Next.js rewrites w `next.config.ts` przekierowują do backendu pod adresem konfigurowanym przez zmienną `BACKEND_URL`.
- Interceptory requestów pobierają automatycznie JWT token ze specjalnego cookie (`edugen-auth`) i zasilają nagłówek `Authorization: Bearer <token>`.
- Interceptory response wymuszają powrót do widoku logowania w przypadku błędu `401 Unauthorized` (usuwając cookie i przekierowując do `/login`). Błędy logowane są przez `logger` z poziomu `WARN`/`ERROR`.

### `src/lib/logger.ts`
Centralny moduł logowania dla całego frontendu:
- Eksportuje obiekt `logger` z metodami: `debug()`, `info()`, `warn()`, `error()`.
- Każda wiadomość poprzedzona jest znacznikiem czasu ISO-8601 i oznaczeniem poziomu, np. `2024-01-15T12:30:45.123Z [INFO ] …`.
- Działa zarówno po stronie przeglądarki (client components), jak i Node.js (server/SSR).
- Używany przez: interceptory `api.ts` do logowania błędów HTTP.

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
- `@tiptap/*` — edytor WYSIWYG (w tym `@tiptap/extension-drag-handle-react` dla drag-and-drop bloków)

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
