# Struktura projektu EduGen (Frontend)

Podczas wprowadzania zmian w części frontendowej projektu, zawsze przestrzegaj poniższej struktury katalogów i konwencji. Projekt jest zbudowany w oparciu o framework Next.js 16 (App Router) i React 19.

## Struktura plików

```
frontend/
├── src/
│   ├── proxy.ts                    # Middleware Next.js (ochrona tras, przekierowania)
│   ├── app/
│   │   ├── layout.tsx              # Root layout (providers, globals.css)
│   │   ├── page.tsx                # Strona publiczna /
│   │   ├── globals.css
│   │   ├── favicon.ico
│   │   ├── AppProviders.tsx        # QueryClient, SnackbarProvider
│   │   ├── not-found.tsx           # Przekierowanie do /dashboard
│   │   ├── about/                  # /about
│   │   ├── login/                  # /login
│   │   ├── register/               # /register
│   │   ├── verify-email-change/    # /verify-email-change?token=...
│   │   ├── email-change-succeeded/ # /email-change-succeeded
│   │   └── (authenticated)/        # Trasy chronione layoutem uwierzytelnionym
│   │       ├── layout.tsx          # AuthGuard → IdleTimer → MainLayout
│   │       ├── dashboard/
│   │       ├── documents/
│   │       │   └── [id]/           # Podgląd/edycja dokumentu
│   │       ├── generate/
│   │       │   ├── page.tsx        # Kreator generowania (GenerationWizard)
│   │       │   └── [id]/
│   │       │       ├── status/     # Polling statusu generacji
│   │       │       └── editor/     # Edytor wersji roboczej (TipTap)
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
│   │   │   ├── AuthGuard.tsx
│   │   │   ├── IdleTimer.tsx
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── SessionTimeoutModal.tsx
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
│   │   │   ├── MainLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopBar.tsx
│   │   │   ├── PublicTopBar.tsx
│   │   │   ├── PublicChrome.tsx
│   │   │   └── AppFooter.tsx
│   │   ├── documents/
│   │   │   └── DocumentCard.tsx
│   │   ├── subjects/
│   │   │   ├── SubjectList.tsx
│   │   │   ├── SubjectDialog.tsx
│   │   │   ├── FileList.tsx
│   │   │   ├── FileCard.tsx
│   │   │   └── FileUploader.tsx
│   │   ├── settings/
│   │   │   ├── ApiKeyForm.tsx
│   │   │   └── ModelSelector.tsx
│   │   └── ui/
│   │       ├── ConfirmDialog.tsx
│   │       ├── EmptyState.tsx
│   │       └── SnackbarProvider.tsx
│   ├── hooks/
│   │   ├── useAdminAccess.ts
│   │   ├── useAuth.ts
│   │   ├── useCurrentUser.ts
│   │   ├── useDocuments.ts
│   │   ├── useFiles.ts
│   │   ├── useGenerations.ts
│   │   ├── useIdleTimer.ts
│   │   ├── useLevels.ts
│   │   ├── useLocalStorage.ts
│   │   ├── useSecretKeys.ts
│   │   ├── useSettings.ts
│   │   ├── useSubjects.ts
│   │   ├── useTaskTypes.ts
│   │   └── useUserAIModels.ts
│   ├── lib/
│   │   ├── api.ts                  # Axios instance z interceptorami JWT
│   │   ├── constants.ts            # Stałe: typy treści, poziomy, limity, timeouty
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
│   ├── logo.png
│   └── ikony (svg, png)
├── .env.local
├── .version
├── next.config.ts
├── tsconfig.json
├── package.json
├── eslint.config.mjs
└── Dockerfile
```

---

## 1. Architektura ogólna

Frontend aplikacji EduGen składa się z czterech głównych warstw w katalogu `src/`:
- **App Router (`app/`)** — konfiguracja ścieżek, podział na strefę uwierzytelnioną i publiczną, główne widoki (strony).
- **Komponenty (`components/`)** — podzielone domenowo na bloki funkcjonalne (auth, generowanie, edytor, layout, dokumenty, przedmioty, ustawienia, ui). Korzystają z biblioteki Material UI (MUI).
- **Logika i Stan (`hooks/`, `lib/`, `schemas/`)** — zarządzanie stanem powtórnie używalnym (React Query), walidacja formularzy (Zod) oraz połączenie z API (Axios).
- **Middleware (`proxy.ts`)** — ochrona tras na poziomie serwera Next.js — przekierowania dla niezalogowanych użytkowników i zalogowanych na stronach logowania.
- **Logowanie** — Centralny moduł `src/lib/logger.ts` dodaje znaczniki czasu ISO-8601 do wszystkich logów. Format: `2024-01-15T12:30:45.123Z [INFO ] treść`.

---

## 2. Middleware (`src/proxy.ts`)

Plik eksportuje funkcję `proxy(request)` oraz obiekt `config` z matcherem tras. Działa jako middleware Next.js:
- **Trasy publiczne** (nie wymagają uwierzytelnienia): `/`, `/about`, `/login`, `/register`.
- **Trasy wymagające logowania** — wszystkie pozostałe. Niezalogowani użytkownicy przekierowywani są do `/login?from=pathname`.
- **Trasy blokowane dla zalogowanych** — `/login`. Zalogowany użytkownik przekierowywany jest do `/dashboard`.
- Sprawdzenie uwierzytelnienia oparte na istnieniu ciasteczka `edugen-auth`.
- Matcher pomija ścieżki wewnętrzne Next.js (`_next/static`, `_next/image`), pliki statyczne (svg, png, jpg, jpeg, gif, webp), `favicon.ico` i ścieżki `/api/` (proxowane przez `next.config.ts` rewrites).

---

## 3. Katalog `/src/app/` – Routing

Aplikacja korzysta z Next.js App Router. Wszystkie pliki `page.tsx` w folderach definiują poszczególne ścieżki (routes).

### Root Layout (`src/app/layout.tsx`)
- Konfiguracja HTML: czcionka Inter (Google Fonts).
- Metadata: title = "EduGen Local".
- Stos providerów: `ColorModeProvider` → `ThemeRegistry` → `AppProviders` → `PublicChrome` → children.

### `AppProviders.tsx` (Client Component)
- Owija dzieci w `QueryClientProvider` + `SnackbarProvider`.
- W efekcie ubocznym loguje zdarzenie załadowania/odświeżenia strony.

### `not-found.tsx`
- Przekierowuje nieznane trasy do `/dashboard`.

### `src/app/(authenticated)/`
Ścieżki wymagające uwierzytelnienia. Chronione przez `layout.tsx`, który owija dzieci w: `AuthGuard` → `IdleTimer` → `MainLayout` (sidebar + topbar + obszar treści).
- `/dashboard` — strona startowa / panel główny użytkownika
- `/documents/[id]` — podgląd i edycja gotowego dokumentu
- `/generate` — kreator generowania materiałów (GenerationWizard)
- `/generate/[id]/status` — widok statusu generacji (polling)
- `/generate/[id]/editor` — edytor wersji roboczej (TipTap)
- `/subjects` — zarządzanie przedmiotami i plikami źródłowymi
- `/settings` — konfiguracja użytkownika (klucze API OpenRouter, wybór modelu AI)
- `/profile` — profil użytkownika: edycja danych osobowych (imię, nazwisko), weryfikowana zmiana e-mail (modal z hasłem → link na nowy e-mail, 24h), weryfikowana zmiana hasła (modal z kodem 6-cyfrowym wysyłanym na e-mail, 5 min), statystyki użytkownika
- `/diagnostics` — diagnostyka logów systemowych (dostępna wyłącznie dla administratorów, chroniona przez `useAdminAccess`)
- `/admin-panel` — panel administracyjny (wyłącznie dla superuserów) z kafelkami do sekcji zarządzania
  - `/admin-panel/users` — pełne zarządzanie użytkownikami (lista, edycja, usuwanie, reset hasła)
  - `/admin-panel/database` — pełny backup bazy (utworzenie zrzutu, pobranie, upload, restore)

#### Aktualny podział na `/dashboard`
- Widok materiałów ma 2 zakładki:
  - **Gotowe materiały** — dokumenty sfinalizowane z drill-down: typ treści → poziom edukacji → klasa → przedmiot → lista materiałów.
    - Karty gotowych materiałów mają akcję kopiowania (`POST /api/documents/{document_id}/copy`).
  - **Wersje robocze** — zapisane prototypy (bez aktywnego dokumentu końcowego) z identycznym drill-down i przejściem do edytora `/generate/[id]/editor`.
    - Karty wersji roboczych mają akcję usuwania z modalem potwierdzenia (`DELETE /api/prototypes/{generation_id}`).
    - Karty wersji roboczych mają akcję kopiowania (`POST /api/prototypes/{generation_id}/copy`).

### Ścieżki publiczne (w `src/app/`)
- `/` — publiczna strona wejściowa (hero, karty funkcjonalności, CTA do logowania/rejestracji/about, placeholdery na przyszłe funkcje)
- `/about` — publiczna strona „O nas" z danymi zespołu
- `/login` — ekran logowania (email + hasło, gradient background)
- `/register` — ekran rejestracji nowego konta (email, imię, nazwisko, hasło, potwierdzenie hasła)
- `/verify-email-change` — strona weryfikacji zmiany e-mail (przyjmuje `?token=...` z linku weryfikacyjnego, wywołuje `GET /api/auth/verify-email-change` i przekierowuje do `/email-change-succeeded`)
- `/email-change-succeeded` — strona sukcesu po zmianie e-mail (komunikat + automatyczne wylogowanie i przekierowanie do `/login` po 10 sekundach)
- Publiczne strony korzystają z `PublicChrome` (stały topbar + stała stopka) i mają oddzielny topbar od strefy zalogowanej.

---

## 4. Komponenty UI (`src/components/`)

Komponenty podzielone na domeny ułatwiające ich znalezienie:

### `auth/`
- **`AuthGuard.tsx`** — strażnik tras chronionych. Sprawdza `isAuthenticated()` i przekierowuje do `/login?from=pathname` jeśli brak tokena. Wyświetla spinner podczas ładowania.
- **`LoginForm.tsx`** — formularz logowania z polami email i hasło. Walidacja Zod via `react-hook-form`. Wyświetla Alert z błędami logowania.
- **`RegisterForm.tsx`** — formularz rejestracji z polami: email, imię (opcjonalne), nazwisko (opcjonalne), hasło (min 8 znaków), potwierdzenie hasła. Walidacja Zod z refine (hasła muszą się zgadzać). Dwukolumnowy układ (imiona obok siebie na desktopie).
- **`IdleTimer.tsx`** — wrapper na hook `useIdleTimer()`, renderuje `SessionTimeoutModal`.
- **`SessionTimeoutModal.tsx`** — dialog ostrzegający o wygasającej sesji z odliczaniem czasu do automatycznego wylogowania. Przyciski: „Przedłuż sesję" / „Wyloguj teraz".

### `generate/`
Główny proces biznesowy to generowanie dokumentów. Elementy go wspierające:
- **`GenerationWizard.tsx`** — główny komponent kreatora krok po kroku (5 kroków):
  1. Typ materiału (`StepContentType`)
  2. Przedmiot i konfiguracja (`StepSubjectConfig`)
  3. Konfiguracja pytań (`StepQuestionConfig`) — pomijany dla typów bez pytań (worksheet, lesson_materials)
  4. Pliki źródłowe (`StepSourceFiles`) — opcjonalne
  5. Podsumowanie (`StepReview`)
  - Przechowuje aktywny krok w `localStorage` (`edugen-generation-step`) obok danych formularza (`edugen-generation-draft`). Dzięki temu powrót po błędzie generowania przywraca użytkownika do ostatniego kroku (StepReview), a nie do kroku 0. Po udanej generacji obydwa klucze są czyszczone.
  - Blokuje generowanie jeśli brak klucza API lub brak przedmiotów.
  - Używa `react-hook-form` z `zodResolver`.
- **`StepContentType.tsx`** — wybór typu materiału (kartkówka, sprawdzian, test, quiz, materiały lekcyjne). Karty w gridzie 3/2/1 kolumny z ikoną, etykietą i stanem zaznaczenia.
- **`StepSubjectConfig.tsx`** — wybór przedmiotu (dropdown), poziomu edukacji i klasy (Autocomplete z możliwością dodawania niestandardowych wartości), poziomu językowego (opcjonalnie, tylko dla przedmiotów językowych). Możliwość usuwania niestandardowych poziomów.
- **`StepQuestionConfig.tsx`** — definicja: łączna liczba pytań (0–50), pytania otwarte/zamknięte, typy zadań (Autocomplete multi-select z możliwością tworzenia nowych), stopień trudności (1–4), liczba wariantów (1–6), instrukcje (textarea, opcjonalne).
- **`StepSourceFiles.tsx`** — lista plików z checkboxami do selekcji. Statusy plików: przetwarzanie (spinner), błąd (z podpowiedzią: NO_API_KEY, RATE_LIMIT), gotowy (podsumowanie + liczba stron). EmptyState jeśli brak plików.
- **`StepReview.tsx`** — podsumowanie konfiguracji w komponencie Paper z sekcjami: typ materiału, przedmiot, poziom, konfiguracja pytań, pliki źródłowe (jako Chip).
- **`GenerationStatusView.tsx`** — obsługa statusów zadania generacji:
  - `processing` / `draft` / `pending` — animowany spinner + "Generowanie..."
  - `ready` — ikona sukcesu + przycisk do edytora (auto-redirect po 2 sekundach)
  - `error` — ikona błędu + klasyfikacja komunikatu na kategorie (brak klucza API, limit kredytów, rate limit, timeout, błąd sieci) z precyzyjnymi wskazówkami. Automatyczny powrót do `/generate` po 5 sekundach (odliczanie widoczne w UI), z przywróceniem kroku kreatora do StepReview (krok 4) via `localStorage`.

### `editor/`
- Edytor dokumentów oparty na silniku **Tiptap** dający interfejs modyfikacji wygenerowanej treści.
- **`TipTapEditor.tsx`** — dynamicznie importowany (client-only), ustawia `immediatelyRender: false` dla bezpieczeństwa SSR/hydracji. Rozszerzenia:
  - StarterKit (bold, italic, listy, nagłówki, code, horizontal rule)
  - Table, TableRow, TableCell, TableHeader
  - Underline, TextAlign (left/center/right)
  - Placeholder, DragHandle, Highlight
  - Niestandardowe: CommentMark (komentarze inline)
  - Toolbar z przyciskami formatowania (B/I/U, wyrównanie, listy)
  - TableBubbleMenu (dodawanie/usuwanie komórek, merge/split)
  - **Drag-and-drop reorder:** uchwyt (`DragIndicatorIcon`) widoczny po najechaniu kursorem. Po przeciągnięciu bloku automatyczne przenumerowanie pytań (wzorzec `N. `). Odwracalne przez Ctrl+Z.
  - **Bubble menu — wzajemne wykluczanie tabeli i komentarzy:** `TableBubbleMenu` wyświetla się wyłącznie wewnątrz komórek tabeli. `CommentBubbleMenu` nigdy nie pojawia się wewnątrz tabeli (podwójna ochrona przez `isActive` + przejście po drzewie węzłów).
  - **Usuwanie komentarzy:** `extendMarkRange("comment")` przed `unsetMark("comment")` — poprawne usuwanie komentarza nawet bez zaznaczenia tekstu.
  - **Persystencja komentarzy:** helper `extractCommentsFromHtml()` wyodrębnia z HTML wszystkie znaczniki `<mark class="tiptap-comment" data-comment="...">` i wysyła jako strukturyzowany JSON (`comments_json`) obok treści HTML.
- **`RepromptInput.tsx`** — pole AI renderowane jako `position: fixed`, przyklejone 50 px od dołu ekranu. Efekt glassmorphism z gradientem. Input z ikoną wysyłania, Enter wysyła, Shift+Enter nowa linia. Props: `onSend(prompt)`, `isLoading`.
- Edytor prototypu (`/generate/[id]/editor`) zapisuje zmiany przyciskiem **„Zapisz wersję roboczą"** do tabeli `prototypes` (`PUT /api/prototypes/{generation_id}`).

### `layout/`
- **`MainLayout.tsx`** — główna struktura strefy zalogowanej: Sidebar (lewy panel) + TopBar (fixed u góry) + obszar treści (prawa strona). Na mobile Sidebar jako tymczasowy Drawer z toggle via TopBar. Tło: radialny gradient.
- **`Sidebar.tsx`** — stały panel (260 px, desktop permanent / mobile temporary `Drawer`). Menu: Generuj, Materiały, Przedmioty i Pliki, Ustawienia, Mój profil. W dolnej sekcji: logo, kontakt e-mail, wersja aplikacji (`NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_VERSION`, `NEXT_PUBLIC_APP_RELEASE_DATE`). Zmienne wstrzykiwane w czasie budowania — lokalnie z `.env.local`, w Dockerze jako build args.
- **`TopBar.tsx`** — fixed, z blur backdrop, z-index ponad sidebarem. Po lewej: tytuł strony (kontekstowy). Po prawej: imię/nazwisko i email użytkownika, chip z api_quota (jeśli brak secret_keys), przycisk profilu, przycisk panelu admina (dla superuserów), globalny przycisk „Odśwież stronę", przełącznik motywu, przycisk wylogowania. Na mobile kolapsuje dane użytkownika.
- **`PublicTopBar.tsx`** — topbar dla niezalogowanych: logo/link „EduGen", nawigacja (`Start`, `O nas`), przełącznik motywu, przyciski `Login`/`Register`. Stosuje bezpieczny dla hydracji render zależny od motywu (po montażu). Na `xs` krótsze etykiety CTA.
- **`PublicChrome.tsx`** — warstwa layoutu dla publicznych tras. Renderuje `PublicTopBar` + `Toolbar` spacer + children + `AppFooter`. Ukrywa się na trasach zalogowanych. Utrzymuje stabilny markup SSR/CSR.
- **`AppFooter.tsx`** — stopka: logo (`/logo.png`), branding „EduGen", kontakt e-mail. Prop `compact` steruje spacingiem.

### `documents/`
- **`DocumentCard.tsx`** — karta dokumentu: ikona, tytuł, data, chip typu materiału. Akcje: kopiowanie, usuwanie. Kliknięcie nawiguje do `/documents/{id}`. Hover lift + border highlight.

### `subjects/`
- **`SubjectList.tsx`** — lista przedmiotów z możliwością selekcji. Ikona folderu, podświetlenie aktywnego. Przycisk usuwania tylko dla niestandardowych przedmiotów.
- **`SubjectDialog.tsx`** — dialog modalny dodawania nowego przedmiotu. Jedno pole tekstowe z walidacją Zod (min 2, max 255, regex dla polskich znaków).
- **`FileList.tsx`** — siatka plików w gridzie 3/2/1 kolumny. Renderuje `FileCard`. Dialog potwierdzenia usuwania (`ConfirmDialog`). EmptyState jeśli brak plików.
- **`FileCard.tsx`** — karta pliku: ikona, nazwa, rozmiar, data, sekcja statusu (przetwarzanie: spinner; NO_API_KEY: ostrzeżenie z linkiem do Ustawień; RATE_LIMIT: błąd; gotowy: sukces chip + podsumowanie). Akcje: pobieranie, usuwanie.
- **`FileUploader.tsx`** — komponent drag-and-drop do wgrywania plików. Akceptuje .pdf, .docx, .jpg, .jpeg, .png (max 10 MB). Pasek postępu `LinearProgress` podczas uploadu. Snackbar z błędem jeśli przekroczony rozmiar.

### `settings/`
- **`ApiKeyForm.tsx`** — CRUD kluczy API (tabela secret_keys). Tabela (desktop) / karty (mobile) z kolumnami: nazwa, platforma, data utworzenia, ostatnie użycie, akcje. Dialog dodawania dwuetapowy (formularz + potwierdzenie). Akcje: walidacja klucza, usuwanie z potwierdzeniem. Dashed Paper jako empty state.
- **`ModelSelector.tsx`** — wybór domyślnego modelu AI (tabela `user_ai_models`). Radio buttons do selekcji. Tabela (desktop) / karty (mobile): dostawca, nazwa modelu, status, data, opis, akcje. Alert jeśli żaden model nie jest wybrany. Dialog dodawania dwuetapowy (formularz z linkiem do openrouter.ai/models + potwierdzenie). Po usunięciu aktualnie wybranego modelu automatycznie przełącza na pierwszy z pozostałych.

### `ui/`
- **`ConfirmDialog.tsx`** — uniwersalny dialog potwierdzenia. Props: open, title, message, confirmLabel, cancelLabel, severity (primary/error/warning/info/success), isLoading, onConfirm, onCancel. Kolor przycisków dopasowany do severity. CircularProgress w stanie ładowania.
- **`EmptyState.tsx`** — komponent pustego stanu. Duża ikona (stonowana), tytuł, opis, opcjonalny przycisk akcji. Obramowanie przerywane, jasne tło, wyśrodkowany układ.
- **`SnackbarProvider.tsx`** — context provider + hook `useSnackbar()`. Metody: `showSnackbar(msg, severity)`, `success()`, `error()`, `info()`. Auto-ukrycie po 5 sekundach, pozycja bottom-left, zamykanie po kliknięciu obok.

---

## 5. Uwierzytelnianie i Sesja

### JWT (`src/hooks/useAuth.ts`)

Frontend korzysta z bezstanowej autoryzacji JWT:

- **`login(data)`** — wysyła `{email, password}` do `POST /api/auth/login`, zapisuje `access_token` w ciasteczku `edugen-auth` (7 dni, SameSite=Lax) via `js-cookie`, czyści cache React Query i przekierowuje do `/dashboard`.
- **`register(data)`** — wysyła `{email, password, first_name, last_name}` do `POST /api/auth/register`, po sukcesie automatycznie loguje użytkownika.
- **`logout()`** — wywołuje `POST /api/auth/logout`, usuwa ciasteczko `edugen-auth`, czyści cache React Query oraz lokalny draft kreatora (`edugen-generation-*`), a następnie przekierowuje do `/login`.
- **`isAuthenticated()`** — sprawdza istnienie ciasteczka `edugen-auth`.

> Klucze OpenRouter nie są przechowywane po stronie przeglądarki (w tym w `localStorage`).

### Bezczynność sesji (`src/hooks/useIdleTimer.ts`)

- Timeout sesji po 15 minutach braku aktywności (konfigurowalny w `constants.ts`: `SESSION_TIMEOUT_MS`).
- Ostrzeżenie wyświetlane 60 sekund przed wygaśnięciem (`SESSION_WARNING_MS`).
- Monitorowane zdarzenia: `mousemove`, `keydown`, `mousedown`, `scroll`, `touchstart`.
- Możliwość przedłużenia sesji lub natychmiastowego wylogowania.
- Czyści `localStorage` przy wylogowaniu.

### `src/lib/api.ts`
- Żądania wysyłane są na ścieżkę bazową konfigurowaną przez `NEXT_PUBLIC_API_URL` (domyślnie puste — ścieżki względne `/api/...`), które Next.js rewrites w `next.config.ts` przekierowują do backendu (`BACKEND_URL`).
- `withCredentials: true`.
- Interceptory requestów: pobierają JWT token z ciasteczka `edugen-auth` i ustawiają nagłówek `Authorization: Bearer <token>`.
- Interceptory response: przy błędzie `401` usuwają ciasteczko i przekierowują do `/login`. Czyszczą klucze localStorage: `edugen-generation-step`, `edugen-generation-draft`. Błędy logowane przez `logger`.

### `src/lib/logger.ts`
Centralny moduł logowania dla całego frontendu:
- Eksportuje obiekt `logger` z metodami: `debug()`, `info()`, `warn()`, `error()`.
- Każda wiadomość poprzedzona jest znacznikiem czasu ISO-8601 i oznaczeniem poziomu, np. `2024-01-15T12:30:45.123Z [INFO ] …`.
- Działa zarówno po stronie przeglądarki (client components), jak i Node.js (server/SSR).
- Używany przez: interceptory `api.ts`, middleware `proxy.ts`, `AppProviders.tsx`.

### `src/lib/constants.ts`
- Typy treści z polskimi etykietami: worksheet, test, quiz, exam, lesson_materials.
- Poziomy edukacji z zakresem klas: primary, secondary.
- Poziomy trudności: 1–4 (Łatwy → Bardzo trudny).
- Poziomy językowe: A1–C2.
- Limit rozmiaru pliku: `MAX_FILE_SIZE_BYTES` = 10 MB.
- Timeouty sesji: `SESSION_TIMEOUT_MS` = 15 min, `SESSION_WARNING_MS` = 14 min.
- Interwał odpytywania generacji: `GENERATION_POLL_INTERVAL_MS` = 3000 ms.

Za pobieranie, cache'owanie i mutację danych odpowiedzialny jest pakiet **TanStack React Query** (konfiguracja: `src/lib/queryClient.ts`, `staleTime: 30_000`, `retry: 1`, `refetchOnWindowFocus: false`).

### Hooki (`src/hooks/`)
| Hook | Przeznaczenie | Technologie |
|---|---|---|
| `useAdminAccess.ts` | Sprawdzenie uprawnień admina (GET `/api/admin/me`). Zwraca `{ isLoading, isAuthorized, isError }`. | React Query |
| `useAuth.ts` | Rejestracja, logowanie, wylogowanie. Zarządzanie JWT via ciasteczko. | axios, js-cookie |
| `useCurrentUser.ts` | Pobieranie profilu zalogowanego użytkownika (`GET /api/auth/me`). Interfejs `CurrentUser`: id, email, first_name, last_name, is_active, is_superuser, created_at, api_quota, api_quota_reset, has_secret_keys. Cache: `staleTime=Infinity`. | React Query |
| `useDocuments.ts` | `useDocuments(subjectId?)` — lista dokumentów, usuwanie. `useDocumentDetails(id)` — podgląd, aktualizacja, eksport PDF, eksport DOCX, przeniesienie na wersję roboczą. | React Query, file-saver |
| `useFiles.ts` | CRUD plików źródłowych. Upload (multipart z postępem), usuwanie, pobieranie. Auto-refetch co 5 s jeśli plik w trakcie przetwarzania. | React Query |
| `useGenerations.ts` | Tworzenie generacji (`POST /api/generations`), polling statusu (co 3 s), finalizacja (`POST /api/documents/{id}/finalize`). Statusy: draft, processing, ready, error, pending. | React Query |
| `useIdleTimer.ts` | Timer bezczynności sesji (15 min timeout, ostrzeżenie na 60 s przed). Monitoruje aktywność użytkownika. | — |
| `useLocalStorage.ts` | Generyczny hook `useLocalStorage<T>(key, initialValue)`. SSR-safe. Zwraca `[value, setValue, removeValue]`. | — |
| `useLevels.ts` | Interfejsy `EducationLevelItem`, `ClassLevelItem`. CRUD poziomów edukacji i klas (`GET/POST/DELETE /api/levels/education`, `/api/levels/classes`). | React Query |
| `useSecretKeys.ts` | CRUD kluczy API użytkownika (tabela secret_keys). List, create, delete, validate. Snackbar feedback. | React Query |
| `useSettings.ts` | Ustawienia użytkownika (`GET/PUT /api/settings`). `SettingsResponse`: default_model, has_api_key. | React Query |
| `useSubjects.ts` | CRUD przedmiotów (`GET/POST/DELETE /api/subjects`). | React Query |
| `useTaskTypes.ts` | Lista typów zadań (`GET /api/task-types`), tworzenie nowych (`POST /api/task-types`). | React Query |
| `useUserAIModels.ts` | CRUD modeli AI użytkownika (`GET/POST/DELETE /api/user-ai-models`). Interfejs `UserAIModel`: id, user_id, provider, model_name, description, price_description, is_available, created_at, changed_at, request_made. Obsługa 409 Conflict. | React Query |

---

## 6. Dane i Typy (`src/types/` i `src/schemas/`)

### `src/types/index.ts`
Główne interfejsy TypeScript:
- **String Typy:** `ContentType` (worksheet, test, quiz, exam, lesson_materials), `EducationLevel` (primary, secondary), `LanguageLevel` (A1–C2)
- **Interfejsy:** `Subject` (id, name, is_custom, created_at), `SourceFile` (id, subject_id, filename, file_type, file_size, summary, has_extracted_text, extraction_error, page_count, created_at), `GenerationParams` (pełny zestaw parametrów generacji z tablicą `task_types` i `source_file_ids`)

### `src/schemas/`
Walidacja formularzy realizowana przez **Zod** we współpracy z **React Hook Form**:
- `auth.ts` — `LoginRequestSchema` (email + hasło), `RegisterRequestSchema` (email, imię opcjonalne, nazwisko opcjonalne, hasło min 8, potwierdzenie hasła z refine), `LoginResponseSchema` (access_token + token_type).
- `generation.ts` — `GenerationParamsSchema` z walidacją warunkową: total_questions LUB open_questions LUB task_types wymagane (z wyjątkiem typów free-form: worksheet, lesson_materials — zdefiniowane w `TYPES_WITHOUT_QUESTIONS`).
- `document.ts` — `DocumentSchema`: id (UUID), generation_id, subject_id, title, content_type, education_level, class_level, content, comments_json (nullable), filename, variants_count, created_at, updated_at.
- `file.ts` — `SourceFileSchema`: id, subject_id, filename, file_type, file_size, summary (nullable), has_extracted_text, extraction_error (nullable/optional), page_count (nullable).
- `subject.ts` — `SubjectSchema` (id UUID, name, is_custom, created_at), `CreateSubjectSchema` (name: min 2, max 255, regex dla polskich znaków).
- `settings.ts` — `SettingsResponseSchema` (default_model, has_api_key), `SettingsUpdateSchema` (default_model?). Interfejsy: `SecretKey` (id, platform, key_name, is_active, last_used_at, created_at), `SecretKeyCreate` (platform, key_name, secret_key), `SecretKeyValidateResponse` (valid, error?).

---

## 7. Konfiguracja główna i Skrypty

### `package.json`
| Skrypt | Komenda | Opis |
|---|---|---|
| `dev` | `next dev` | Tryb developerski (Hot-Reload) |
| `build` | `next build` | Budowa wersji produkcyjnej |
| `start` | `next start` | Serwowanie po zbuildowaniu |
| `lint` | `eslint` | Weryfikacja czystości składni TypeScript/React |

### Kluczowe zależności
- `next` 16.1.6, `react` 19.2.3, `react-dom` 19.2.3 — framework i runtime
- `js-cookie` + `@types/js-cookie` — zarządzanie ciasteczkami JWT po stronie klienta
- `@hookform/resolvers` + `react-hook-form` + `zod` — walidacja formularzy
- `axios` — HTTP client
- `@tanstack/react-query` + `@tanstack/react-query-devtools` — zarządzanie stanem serwera
- `@mui/material` + `@mui/icons-material` + `@emotion/*` — biblioteka komponentów UI
- `@tiptap/*` — edytor WYSIWYG (starter-kit, react, drag-handle, drag-handle-react, node-range, table, table-row, table-cell, table-header, underline, text-align, highlight, placeholder)
- `file-saver` + `@types/file-saver` — pobieranie eksportów (PDF, DOCX)
- `date-fns` — formatowanie dat
- `babel-plugin-react-compiler` (dev) — optymalizacja React Compiler

### `next.config.ts`
- Output: `standalone` (dla Dockera).
- Transpilacja pakietów MUI: `@mui/material`, `@mui/system`, `@mui/icons-material`.
- Zmienne środowiskowe (build-time): `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_VERSION`, `NEXT_PUBLIC_APP_RELEASE_DATE`.
- Rewrites: `/api/:path*` → `${BACKEND_URL}/api/:path*` (domyślnie `http://localhost:8000`).
- Dozwolone origin dev: localhost + adresy IP z sieci lokalnej (automatycznie wykrywane).

### `tsconfig.json`
- Target: ES2017, strict mode.
- Path alias: `@/*` → `./src/*`.
- JSX: react-jsx (automatic runtime).

### `eslint.config.mjs`
- Extends: ESLint Next.js (core-web-vitals, TypeScript).
- Ignorowane: `.next/**`, `out/**`, `build/**`, `next-env.d.ts`.

### `frontend/.env.local`
- Plik dla trybu lokalnego (dev/build). Zawiera `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_VERSION`, `NEXT_PUBLIC_APP_RELEASE_DATE`, `NEXT_PUBLIC_API_URL` (domyślnie puste — ścieżki względne proxowane przez Next.js).
- W Dockerze odpowiedniki są przekazywane jako build args (`NEXT_PUBLIC_APP_*`) z `docker-compose.yml` do `Dockerfile` i inlinowane przez Next.js podczas `npm run build`.

---

## 8. Motyw i Style (`src/theme/` i `globals.css`)

### `src/theme/theme.ts`
- Kolory: primary #0A5CAD (blue), success #22C55E (green), warning #FACC15 (yellow), error #EF4444 (red).
- Typografia: czcionka Inter, Roboto. h1–h6 ze specyficznymi rozmiarami i wagami. Przyciski: `textTransform: none`.
- Nadpisania komponentów MUI: MuiButton (padding, hover, focus outline), MuiCard (rounded, hover lift, shadow), MuiTextField (rounded input, focus), MuiDialog (border-radius 24px, elevated shadow), MuiStepLabel (custom CSS dla stanu „not applicable").
- Obsługa jasnego i ciemnego motywu.

### `src/theme/ThemeRegistry.tsx`
- Client component. Konfiguruje Emotion CSS-in-JS caching z Server-Inserted HTML.
- Używa `useColorMode()` do wyboru między jasnym a ciemnym motywem.
- Providers: `CacheProvider` → `ThemeProvider` → `CssBaseline`.

### `src/theme/ColorModeContext.tsx`
- Eksportuje `ColorModeProvider` i hook `useColorMode()`.
- Interfejs: `{ mode: 'light' | 'dark', toggleColorMode }`.
- Persystencja trybu w `localStorage` pod kluczem `edugen-theme-mode`.
- Odczyt z localStorage po montażu — zapobiega mismatchowi hydracji.

### `src/app/globals.css`
- Reset CSS i globalne style.

### Responsywność mobilna
Aplikacja korzysta z systemu breakpoints MUI (`xs / sm / md / lg`). Zasady stosowane globalnie:
- **Tabele** (ApiKeyForm, ModelSelector, Diagnostics) — na `xs` ukrywane na rzecz kart lub listy z redukcją kolumn.
- **Nagłówki stron** (h4) — mniejszy `fontSize` na `xs` (`1.5rem` zamiast `2.125rem`).
- **Przyciski akcji** w nagłówkach (dashboard, editor, documents) — `flexDirection: { xs: 'column', sm: 'row' }` i `width: { xs: '100%', sm: 'auto' }`.
- **Diagnostics** — `TableContainer` z `overflowX: 'auto'` i kolumna Metadane ukryta na `xs`/`sm`.
- **Sidebar** — na `xs`/`sm` tymczasowy `Drawer` (overlay), stały tylko od `md`.

---

## 9. Klucze `localStorage`

| Klucz | Przeznaczenie | Czyszczony |
|---|---|---|
| `edugen-auth` (cookie) | JWT access token | logout, 401 |
| `edugen-generation-draft` | Dane formularza kreatora generacji | po udanej generacji, logout, 401 |
| `edugen-generation-step` | Aktywny krok kreatora | po udanej generacji, logout, 401 |
| `edugen-theme-mode` | Tryb motywu (light/dark) | nigdy |

---

## 10. Testowanie i Jakość Kodu
- Weryfikator `ESLint` z konfiguracją Strict (`eslint.config.mjs`) połączony z TypeScript.
- `@tanstack/react-query-devtools` do debuggowania stanu zapytań w trybie `dev`.
- TypeScript strict mode — brak `any` w kodzie produkcyjnym.
