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
- `/settings` — powiązane z konfiguracją użytkownika
- `/diagnostics` — diagnostyka działania

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
- `GenerationStatusView.tsx` — obsługa statusów zadania (reaguje na statusy `processing`, `draft`, `pending`).

### `editor/`
- Edytor dokumentów oparty na silniku **Tiptap** dający interfejs modyfikacji wygenerowanej treści.

### `layout/`
- Layout aplikacji (Sidebar, Header głównego ekranu).
- **`Sidebar.tsx`** wyświetla wersję aplikacji w stopce (odczytywana ze zmiennych środowiskowych `NEXT_PUBLIC_APP_*`).

### Inne
- `documents/`, `subjects/`, `settings/` — komponenty odpowiadające logice poszczególnych domen.
- `ui/` — fundamentalne reużywalne fragmenty interfejsu (własne wrappery dla przycisków, powiadomienia Snackbar itp).

---

## 4. Uwierzytelnianie JWT (`src/hooks/useAuth.ts`)

Frontend korzysta z bezstanowej autoryzacji JWT:

- **`login(data)`** — wysyła `{email, password}` do `POST /api/auth/login`, zapisuje `access_token` w ciasteczku `edugen-auth` (7 dni, SameSite=Lax) via `js-cookie`, przekierowuje do `/dashboard`.
- **`register(data)`** — wysyła `{email, password, first_name, last_name}` do `POST /api/auth/register`, po sukcesie automatycznie loguje użytkownika.
- **`logout()`** — wywołuje `POST /api/auth/logout`, usuwa ciasteczko `edugen-auth`, przekierowuje do `/login`.
- **`isAuthenticated()`** — sprawdza istnienie ciasteczka `edugen-auth`.

### `src/lib/api.ts`
- Baza URL oparta na zmiennej środowiskowej `NEXT_PUBLIC_API_URL`.
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
- **Wstrzykiwanie wersji** ze zmiennych `NEXT_PUBLIC_APP_*` na podstawie pliku `.version`.

---

## 7. Motyw i Style (`src/theme/` i `globals.css`)
- `src/theme/theme.ts` — deklaracja głównych kolorów, cieni, kształtów i typografii MUI.
- `src/theme/ThemeRegistry.tsx` i `ColorModeContext.tsx` — integracja z SSR Next.JS.
- `src/app/globals.css` — reset CSS i globalne style.

---

## 8. Testowanie i Jakość Kodu
- Weryfikator `ESLint` z konfiguracją Strict (`eslint.config.mjs`) połączony z TypeScript.
- `@tanstack/react-query-devtools` do debuggowania stanu zapytań w trybie `dev`.
- TypeScript strict mode — brak `any` w kodzie produkcyjnym.
