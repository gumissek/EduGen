# Notatka: naprawa logiki zgodności z Podstawą Programową (2026-03-15)

## Zakres zgłoszenia
1. Przełączniki w kreatorze (`Weryfikuj zgodność...`, `Dołącz metryczkę zgodności`) nie działały poprawnie i nie wpływały skutecznie na dalszą logikę.
2. Weryfikacja zgodności zwracała stale 0 dopasowań (`matches=0`), m.in. z logiem `subject_name=None`.
3. Panel zgodności w edytorze miał problemy mobilne i był zasłaniany przez pole reprompt.
4. Przyciski akcji w edytorze były zbyt duże i niespójne wizualnie.

## Co zostało zmienione

### Frontend
- `frontend/src/components/generate/StepReview.tsx`
  - Zastąpiono statyczny odczyt `getValues()` reaktywnym `useWatch`, aby stan przełączników i checkboxów był zawsze aktualny.
  - Ustawianie pól (`curriculum_compliance_enabled`, `include_compliance_card`, `curriculum_document_ids`) doposażono o flagi `shouldDirty/shouldTouch`.
- `frontend/src/types/index.ts`
  - Rozszerzono `GenerationParams` o:
    - `include_compliance_card?: boolean`
    - `curriculum_document_ids?: string[]`
- `frontend/src/app/(authenticated)/generate/[id]/editor/page.tsx`
  - Uporządkowano sekcję przycisków (mniejsze, spójniejsze wizualnie).
  - Dodano dolny odstęp kontenera (`pb`), by nie kolidować z fixed inputem.
  - Usunięto zewnętrzny fixed-wrapper dla repromptu (uniknięcie podwójnego pozycjonowania).
  - Przekazywany jest `hidden={complianceOpen}` do repromptu.
- `frontend/src/components/editor/RepromptInput.tsx`
  - Dodano prop `hidden` i warunkowe ukrywanie komponentu.
  - Obniżono `zIndex` do wartości poniżej Drawera zgodności.
- `frontend/src/components/editor/ComplianceSidebar.tsx`
  - Dodano responsywność Drawera: `temporary` na mobile, `persistent` na desktop.
  - Drobne korekty stylu przycisku otwierającego panel.

### Backend
- `backend/app/schemas/generation.py`
  - Dodano do `GenerationCreate` i `GenerationResponse` pola:
    - `include_compliance_card: bool = False`
    - `curriculum_document_ids: List[str] = []`
  - Dodano parser `curriculum_document_ids` z JSON string -> list.
- `backend/app/models/generation.py`
  - Dodano kolumny modelu:
    - `include_compliance_card` (bool)
    - `curriculum_document_ids` (text/json string)
- `backend/app/routers/generations.py`
  - Zapisywanie nowych pól podczas tworzenia generacji.
- `backend/app/routers/prototypes.py`
  - Przy kopiowaniu draftu zachowanie ustawień zgodności (`curriculum_compliance_enabled`, `include_compliance_card`, `curriculum_document_ids`).
- `backend/app/services/generation_service.py`
  - Przy pobieraniu kontekstu PP (RAG) przekazywany jest:
    - `subject_name` z relacji `generation.subject.name`,
    - ograniczenie do wybranych dokumentów `document_ids`.
- `backend/app/services/curriculum_service.py`
  - `search_similar_chunks(...)` rozszerzono o `document_ids`.
  - Dodano bezpieczne fallbacki filtrów `education_level`/`subject_name`: jeśli brak pasujących dokumentów `ready`, wyszukiwanie działa bez zbyt restrykcyjnego filtra (zamiast stałego 0).
  - `check_compliance(...)` rozszerzono o `document_ids` i przekazywanie ich do wyszukiwarki.
- `backend/app/routers/curriculum.py`
  - `run_compliance_check` przekazuje do `check_compliance`:
    - `subject_name` z generacji,
    - `document_ids` wybrane w generacji.
- `backend/app/services/docx_service.py`
  - Metryczka zgodności jest dodawana do dokumentu tylko gdy `generation.include_compliance_card == true`.
- `backend/app/services/ai_service.py`
  - Przy włączonych opcjach zgodności dodano jawne wymaganie mapowalności pytań do wymagań PP w promptach.

### Migracja DB
- Dodano migrację: `backend/alembic/versions/005_generation_compliance_options.py`
  - `include_compliance_card` (BOOLEAN, default false)
  - `curriculum_document_ids` (TEXT)

### Test
- `backend/tests/test_generations_router.py`
  - Dodano test regresyjny tworzenia generacji z nowymi opcjami zgodności.

## Dokumentacja
- Zaktualizowano:
  - `documentation/frontend_documentation.md`
  - `documentation/backend_documentation.md`
  - `documentation/database_documentation.md`

## Efekt końcowy
- Opcje zgodności PP są teraz poprawnie obsługiwane od UI aż po backend.
- Wybrane dokumenty PP i opcja metryczki są persystowane i używane.
- Problem z `subject_name=None` został usunięty w ścieżce compliance check.
- Wyszukiwanie ma odporność na zbyt restrykcyjne filtry metadanych.
- UX mobilny edytora został poprawiony, a reprompt nie zasłania panelu zgodności.

## Weryfikacja
- Sprawdzenie błędów IDE (`get_errors`) dla zmienionych plików: brak błędów.
- Próba uruchomienia testów `pytest` lokalnie nie powiodła się, ponieważ w środowisku brak modułu `pytest`.
