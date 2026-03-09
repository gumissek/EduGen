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
- `/change-password` — wymuszenie zmiany hasła logowania

### Ścieżki publiczne (w `src/app/`)
- `/login` — ekran logowania do systemu

---

## 3. Komponenty UI (`src/components/`)

Komponenty podzielone na domeny ułatwiające ich znalezienie:

### `generate/`
Główny proces biznesowy to generowanie dokumentów. Elementy go wspierające:
- `GenerationWizard.tsx` — główny komponent kreatora krok po kroku.
- `StepContentType.tsx` — wybór typu materiału (kartkówka, sprawdzian, test, quiz, materiały lekcyjne).
- `StepSubjectConfig.tsx` — wybór przedmiotu i konfiguracja tematu (obsługa list predefiniowanych z autouzupełnianiem).
- `StepQuestionConfig.tsx` — definicja liczby pytań, stopnia trudności oraz wybór konkretnych typów zadań (np. Prawda/Fałsz, Esej).
- `StepSourceFiles.tsx` — wybór i dodawanie własnych plików z bazą wiedzy.
- `StepReview.tsx` — weryfikacja danych przed uruchomieniem procesu na backendzie. Weryfikacja zezwala na elastyczne definiowanie zadań (wystarczy podać jedno z pól: liczba zadań ogólnie, liczba zadań otwartych lub wybranie z listy typów zadań).
- `GenerationStatusView.tsx` — obsługa statusów zadania, podgląd jego trwania (reaguje na statusy `processing`, `draft` oraz początkowy `pending` od razu pokazując spinner).

### `editor/`
- Edytor dokumentów oparty na silniku **Tiptap** dający interfejs modyfikacji wygenerowanej treści.

### `layout/`
- Layout aplikacji (Sidebar, Header głównego ekranu).

### Inne
- `documents/`, `subjects/`, `settings/`, `auth/` — komponenty odpowiadające logice poszczególnych domen.
- `ui/` — fundamentalne reużywalne fragmenty interfejsu (własne wrappery dla przycisków, powiadomienia Snackbar itp).

---

## 4. Komunikacja Frontend ↔ Backend (`src/lib/` i `src/hooks/`)

Architektura zakłada użycie biblioteki `axios` i instancji zdefiniowanej w `src/lib/api.ts`.

### `src/lib/api.ts`
- Baza URL oparta na zmiennej środowiskowej `NEXT_PUBLIC_API_URL` z serwera.
- Interceptory requestów pobierają automatycznie JWT token ze specjalnego cookie (`edugen-auth`) i zasilają nagłówek `Authorization`.
- Interceptory response wymuszają powrót do widoku logowania w przypadku błędu o kodzie `401 Unauthorized`.

Za pobieranie, cache'owanie i mutację danych odpowiedzialny jest pakiet **TanStack React Query** (konfiguracja: `src/lib/queryClient.ts`).

### Wybrane hooki (`src/hooks/`)
| Hook | Przeznaczenie | Technologie pod spodem |
|---|---|---|
| `useAuth.ts` | Endpointy `/api/auth/login`, `/logout`, modyfikacja hasła. Zarządzanie ciasteczkami sesji. | axios |
| `useDocuments.ts` | Wyświetlanie, usuwanie, podgląd detali dla `/api/documents`. Eksporter PDF (zapis Blob jako pobranie). | React Query |
| `useGenerations.ts` | Wysłanie uformulowanych żądań o generację materiałów oraz pobranie statusu. | React Query |
| `useSubjects.ts`, `useLevels.ts` | Dane słownikowe (dostępne przedmioty, poziomy zaawansowania dla formularzy). | React Query |
| `useTaskTypes.ts` | Pobieranie z backendu dostępnych typów zadań do wyboru w formularzu. | React Query |
| `useFiles.ts` | C.R.U.D plików udostępnionych dla generatorów i dodawanych do bazy (opróżnianych na tematy). | React Query |

---

## 5. Dane i Typy (`src/types/` i `src/schemas/`)

### `src/types/index.ts`
Znajdują się w nim główne interfejsy TypeScript służące zapewnieniu ochrony typów danych:

- **Enumy / String Typy do Generacji:** `ContentType` (worksheet, test, quiz, exam, lesson_materials), `EducationLevel`, `LanguageLevel`
- **Interfejsy Bazowe:** `Subject`, `SourceFile`, `GenerationParams` (uwzględniający m.in. tablicę `task_types`)

### `src/schemas/`
Walidacja formularzy realizowana przez **Zod** we współpracy z **React Hook Form**:
- `auth.ts` — np. weryfikacja loginu o długości znaków oraz rygorystyczności hasła.
- `generation.ts` — schematy kroków generacji minimalizujące błędy przed wysłaniem na API (Zod weryfikuje m.in. liczebność pól liczbowych, trudność itp).
- `document.ts`, `file.ts`, `subject.ts`, `settings.ts` — schematy żądań reszty domen aplikacji.

---

## 6. Konfiguracja główna i Skrypty

### `package.json`
| Skrypt | Komenda | Opis |
|---|---|---|
| `dev` | `next dev` | Tryb developerski (Hot-Reload) pożeniony z App Routerem |
| `build` | `next build` | Budowa wersji zoptymalizowanej (produkcyjnej) |
| `start` | `next start` | Serwowanie po zbuildowaniu z wydajną re-kompilacją na dysku |
| `lint` | `eslint` | Weryfikacja czystości składni TypeScript/React według reguł projektowych |

### `next.config.ts`
- Odpowiada za kluczowy routing wewnętrzny w trybie developerskim poprzez `rewrites()`. 
- Proxy przekierowuje wywołania z Frontendu (`/api/*`) na docelowy Backend (`process.env.BACKEND_URL` domyślnie http://localhost:8000), zapobiegając błędom CORS.
- Włącza `standalone` mode przydatny przy pracy w Dockerze i transpilacje pakietów MUI.

---

## 7. Motyw i Style (`src/theme/` i `globals.css`)
Czysty wygląd został osiągnięty przez definicje dla biblioteki Material UI (`@mui/material`).
- `src/theme/theme.ts` — deklaracja głównych kolorów (primary, secondary), konfiguracja cieni komponentów, kształtów (np. borderRadius) oraz typografia.
- `src/theme/ThemeRegistry.tsx` i `ColorModeContext.tsx` — podpięcie stylów pod SSR Next.JS oraz obsługa dynamicznej ramy, co pozwala w przyszłości na sprawną implementację logiki przełącznika Dark/Light w całym drzewie bez odświeżania.
- `src/app/globals.css` — ogólnoprojektowe klasy użytkowe. Reset domyślnych zachowań marginesów w przeglądarkach oraz ustawienie kroju używanych fontów nadrzędnych dla body. 

---

## 8. Testowanie i Jakość Kodu
- Brak wewnątrz folderu predefiniowanych narzędzi typu Jest czy Cypress (warto uzupełnić ewentualnie bazując na API)
- Weryfikator `ESLint` z konfiguracją Strict (`eslint.config.mjs`) połączony z poprawną statyczną analizą kodu wsparcia TypeScript.
- Odwrócenie logiki i użycie silnego modułu `@tanstack/react-query-devtools` do podsłuchu stanu pobrań zapytań ułatwia debuggowanie w trakcie `dev`.
