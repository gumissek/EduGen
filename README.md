# EduGen Local

MVP aplikacji lokalnej zgodnej z PRD i `implementation_plan.md`.

## Stack

- Frontend: Next.js + TypeScript + MUI + TanStack Query
- Backend: FastAPI + SQLAlchemy + SQLite
- AI: OpenAI SDK (`gpt-5-mini` / Vision)
- Export: `python-docx`
- Build: Docker Compose

## Uruchomienie

1. Skopiuj plik środowiskowy:

   - Windows: `copy .env.example .env`
   - Mac/Linux: `cp .env.example .env`

2. Uruchom:

   - Windows: `scripts\\start.bat`
   - Mac/Linux: `bash scripts/start.sh`

3. Otwórz:

   - Frontend: http://127.0.0.1:3000
   - Backend: http://127.0.0.1:8000/docs

## Zakres MVP

- Logowanie hasłem + timeout sesji 15 minut.
- Ustawienia modelu i API key.
- Zarządzanie przedmiotami.
- Upload plików PDF/DOCX/IMG do 10MB i ekstrakcja tekstu.
- Generowanie prototypu, edycja, reprompt, finalizacja DOCX z wariantami.
- Historia dokumentów, single download i bulk ZIP.
- Manual backup SQLite z retencją 7 dni.

## Domyślne hasło

Użyj hasła odpowiadającego hashowi w `.env` (domyślnie: `admin123`).
