# EduGen Local — Backlog nowych funkcji i ulepszeń

**Dokument produktowy dla zespołu deweloperskiego**

| Pole | Wartość |
|------|---------|
| Wersja dokumentu | 1.0 |
| Data | 2026-03-11 |
| Autor | Product Manager / AI Assistant |
| Zakres | Sprint backlog — 16 user stories (US-010–US-025) |
| Priorytety | 🟢 Szybka wygrana (6) · 🟡 Średni nakład (6) · 🔴 Ambitny kierunek (4) |

---

## Podsumowanie wykonawcze

Niniejszy dokument zawiera **16 szczegółowych user stories (US-010–US-025)** podzielonych równomiernie na 4 obszary rozwoju produktu EduGen Local. Każda historia zawiera opis funkcji, problem użytkownika, format user story, weryfikowalne kryteria akceptacji oraz priorytet implementacji.

Rozkład priorytetów:
- 🟢 **6 szybkich wygranych** — implementacja 1–3 dni
- 🟡 **6 średnich nakładów** — implementacja 3–8 dni
- 🔴 **4 ambitne kierunki** — 8+ dni, wymagające spike'a technicznego

---

## Macierz priorytetów

| ID | Funkcja | Obszar | Priorytet |
|----|---------|--------|-----------|
| US-010 | Kreator konfiguracji sprawdzianu (wizard) | UX/UI | 🟢 Szybka wygrana |
| US-011 | Drag-and-drop reorder pytań | UX/UI | 🟡 Średni nakład |
| US-012 | Pasek postępu generowania z ETA | UX/UI | 🟢 Szybka wygrana |
| US-013 | Biblioteka dokumentów z wyszukiwaniem | UX/UI | 🟡 Średni nakład |
| US-014 | Generator fiszek (flashcards) | Nowe typy materiałów | 🟡 Średni nakład |
| US-015 | Ćwiczenia z lukami (cloze / gap-fill) | Nowe typy materiałów | 🟢 Szybka wygrana |
| US-016 | Krzyżówka dydaktyczna | Nowe typy materiałów | 🔴 Ambitny kierunek |
| US-017 | Karta oceny / Rubric | Nowe typy materiałów | 🟢 Szybka wygrana |
| US-018 | Eksport do PDF | Integracje i eksport | 🟢 Szybka wygrana |
| US-019 | Eksport Moodle XML / GIFT | Integracje i eksport | 🟡 Średni nakład |
| US-020 | Współdzielenie szablonów (import/export) | Integracje i eksport | 🟢 Szybka wygrana |
| US-021 | Dostęp LAN z autoryzacją | Integracje i eksport | 🔴 Ambitny kierunek |
| US-022 | Resume przerwanych zadań | Wydajność i stabilność | 🟡 Średni nakład |
| US-023 | Chunked OCR (PDF >5 stron) | Wydajność i stabilność | 🟡 Średni nakład |
| US-024 | System wielu szablonów DOCX | Wydajność i stabilność | 🟡 Średni nakład |
| US-025 | Obsługa LaTeX / MathML | Wydajność i stabilność | 🔴 Ambitny kierunek |

---

## 1. UX/UI

*Usprawnienia przepływów: konfiguracja → generowanie → edycja → eksport. Cel: zmniejszenie liczby kliknięć, redukcja błędów konfiguracji i poprawa przejrzystości statusu operacji.*

---

### US-010: Kreator konfiguracji sprawdzianu (wizard krokowy)

| | |
|---|---|
| **Priorytet** | 🟢 Szybka wygrana |
| **Opis funkcji** | Zastąpienie jednoekranowego formularza konfiguracji wielokrokowym wizardem z walidacją na każdym kroku: (1) wybór typu dokumentu, (2) załadowanie materiału źródłowego, (3) parametry generowania (liczba pytań, typ, poziom trudności), (4) podgląd ustawień i start. |
| **Problem** | Nauczyciel widzi jeden długi formularz z wieloma polami jednocześnie, co przytłacza i prowadzi do błędów konfiguracji — np. pominięcia załączenia materiału źródłowego. Skutkuje to powtórnymi iteracjami AI i wydłuża czas tworzenia dokumentu. |
| **User Story** | *Jako nauczyciel, chcę konfigurować sprawdzian krok po kroku z walidacją na każdym etapie, aby uniknąć błędów i przyspieszyć proces tworzenia.* |

**Kryteria akceptacji:**

- **AC-1:** Wizard zawiera minimum 4 kroki z paskiem postępu (progress bar) widocznym na górze ekranu
- **AC-2:** Przejście do kolejnego kroku jest zablokowane, dopóki bieżący nie przejdzie walidacji (np. krok 2 wymaga min. 1 załącznika)
- **AC-3:** Użytkownik może cofnąć się do dowolnego wcześniejszego kroku bez utraty wprowadzonych danych
- **AC-4:** Ostatni krok wyświetla czytelne podsumowanie wszystkich wybranych parametrów przed rozpoczęciem generowania
- **AC-5:** Czas przejścia przez wizard (nowy użytkownik) nie przekracza 90 sekund mierzonych w teście użyteczności

---

### US-011: Drag-and-drop reorder pytań w edytorze WYSIWYG

| | |
|---|---|
| **Priorytet** | 🟡 Średni nakład |
| **Opis funkcji** | Dodanie możliwości przeciągania i upuszczania (drag-and-drop) poszczególnych pytań/bloków w edytorze WYSIWYG, z automatyczną renumeracją i aktualizacją klucza odpowiedzi w czasie rzeczywistym. |
| **Problem** | Po wygenerowaniu sprawdzianu nauczyciel chce zmienić kolejność pytań (np. od najłatwiejszego do najtrudniejszego), ale musi ręcznie kopiować i wklejać tekst, co jest żmudne i prowadzi do błędów w numeracji i kluczu odpowiedzi. |
| **User Story** | *Jako nauczyciel, chcę przeciągać pytania w edytorze, aby szybko zmienić ich kolejność bez ręcznego kopiowania tekstu.* |

**Kryteria akceptacji:**

- **AC-1:** Każde pytanie ma uchwyt drag handle widoczny po najechaniu kursorem
- **AC-2:** Przeciągnięcie pytania w nowe miejsce automatycznie przenumerowuje wszystkie pytania (1, 2, 3...)
- **AC-3:** Klucz odpowiedzi aktualizuje się synchronicznie z nową kolejnością pytań
- **AC-4:** Warianty grupowe (A/B) zachowują spójność — zmiana kolejności w jednej grupie nie psuje mapowania odpowiedzi
- **AC-5:** Operacja drag-and-drop jest odwracalna przez Ctrl+Z (undo)

---

### US-012: Pasek postępu generowania z szacowanym czasem (ETA)

| | |
|---|---|
| **Priorytet** | 🟢 Szybka wygrana |
| **Opis funkcji** | Wyświetlanie w czasie rzeczywistym paska postępu podczas generowania dokumentu przez AI, z informacją o aktualnym etapie (analiza materiału → generowanie pytań → formatowanie → finalizacja) i szacowanym czasem do zakończenia. |
| **Problem** | Podczas generowania sprawdzianu nauczyciel widzi jedynie spinner bez informacji o postępie. Nie wie, czy proces trwa normalnie, czy się zawiesił, co prowadzi do przedwczesnego przerywania i ponownego uruchamiania. |
| **User Story** | *Jako nauczyciel, chcę widzieć postęp generowania i szacowany czas zakończenia, aby wiedzieć, że system działa i móc zaplanować swoją pracę.* |

**Kryteria akceptacji:**

- **AC-1:** Pasek postępu wyświetla minimum 4 nazwane etapy generowania z wizualnym wskaźnikiem aktualnego etapu
- **AC-2:** Szacowany czas ETA jest kalkulowany na podstawie średniego czasu poprzednich generowań danego typu dokumentu
- **AC-3:** ETA aktualizuje się dynamicznie co etap (nie jest statyczny)
- **AC-4:** W przypadku błędu lub przekroczenia timeout (>120 s) wyświetla się komunikat z opcją ponowienia lub anulowania
- **AC-5:** Postęp jest persistent — odświeżenie strony przywraca widok aktualnego stanu (nie resetuje procesu)

---

### US-013: Biblioteka wygenerowanych dokumentów z wyszukiwaniem

| | |
|---|---|
| **Priorytet** | 🟡 Średni nakład |
| **Opis funkcji** | Panel "Moje dokumenty" wyświetlający historię wszystkich wygenerowanych materiałów z możliwością filtrowania po typie, dacie, przedmiocie i wyszukiwania pełnotekstowego. Możliwość duplikowania, edytowania i ponownego eksportowania dowolnego dokumentu. |
| **Problem** | Nauczyciel tworzący wiele sprawdzianów w ciągu semestru nie ma sposobu na szybkie odnalezienie wcześniej wygenerowanego materiału. Musi pamiętać nazwy plików lub przeszukiwać folder na dysku. |
| **User Story** | *Jako nauczyciel, chcę mieć przeszukiwalną bibliotekę moich dokumentów w aplikacji, aby szybko znaleźć, skopiować i zmodyfikować wcześniejsze materiały.* |

**Kryteria akceptacji:**

- **AC-1:** Widok listy dokumentów z kolumnami: nazwa, typ, data utworzenia, przedmiot/tag, liczba pytań
- **AC-2:** Filtrowanie po typie dokumentu (sprawdzian, kartkówka, karta pracy) i zakresie dat
- **AC-3:** Wyszukiwanie pełnotekstowe zwraca wyniki w czasie <500 ms dla bazy do 500 dokumentów
- **AC-4:** Przycisk "Duplikuj" tworzy edytowalną kopię dokumentu z nowym draft w edytorze WYSIWYG
- **AC-5:** Przycisk "Eksportuj ponownie" generuje DOCX z bieżącą treścią bez konieczności przechodzenia przez cały wizard

---

## 2. Nowe typy materiałów dydaktycznych

*Rozszerzenie portfolio typów dokumentów o formy najczęściej stosowane przez nauczycieli, których obecnie brakuje w MVP.*

---

### US-014: Generator fiszek (flashcards) z eksportem do Anki

| | |
|---|---|
| **Priorytet** | 🟡 Średni nakład |
| **Opis funkcji** | Nowy typ dokumentu: fiszki pytanie-odpowiedź generowane z materiału źródłowego. Fiszki dostępne zarówno jako tabela w DOCX (do druku), jak i eksport w formacie .apkg (Anki) lub CSV zgodnym z Quizlet. |
| **Problem** | Nauczyciele tworzą fiszki ręcznie w Excelu lub na kartkach, co jest bardzo czasochłonne. Uczniowie proszą o materiały do samodzielnej nauki, a nauczyciel nie ma narzędzia do ich szybkiego generowania. |
| **User Story** | *Jako nauczyciel, chcę wygenerować fiszki z podręcznika lub notatek, aby dać uczniom gotowy materiał do powtórek w formacie cyfrowym lub do druku.* |

**Kryteria akceptacji:**

- **AC-1:** Użytkownik wybiera typ "Fiszki" w wizardzie i podaje materiał źródłowy oraz docelową liczbę fiszek (5–50)
- **AC-2:** AI generuje pary pytanie/odpowiedź z zachowaniem kontekstu dziedzinowego (nie wyrwane z kontekstu fakty)
- **AC-3:** Podgląd w edytorze WYSIWYG wyświetla fiszki w siatce 2-kolumnowej (awers | rewers)
- **AC-4:** Eksport DOCX tworzy tabelę do cięcia z liniami odcinania (format A4, 8 fiszek na stronę)
- **AC-5:** Eksport CSV jest zgodny z importem Anki/Quizlet (separator tabulacja, kodowanie UTF-8 BOM)

---

### US-015: Ćwiczenia z lukami (cloze / gap-fill)

| | |
|---|---|
| **Priorytet** | 🟢 Szybka wygrana |
| **Opis funkcji** | Nowy typ dokumentu: tekst źródłowy z automatycznie wygenerowanymi lukami do uzupełnienia. AI identyfikuje kluczowe pojęcia i tworzy wersję z lukami oraz oddzielną listę wyrażeń do wstawienia (opcjonalnie z dystraktorami). |
| **Problem** | Ćwiczenia z lukami są jednym z najczęściej stosowanych typów zadań w edukacji, ale ich ręczne przygotowywanie (wybór słów, tworzenie banku wyrazów, dodawanie dystraktorów) jest czasochłonne. |
| **User Story** | *Jako nauczyciel, chcę automatycznie wygenerować ćwiczenie z lukami z dowolnego tekstu, aby szybko przygotować materiał sprawdzający rozumienie kluczowych pojęć.* |

**Kryteria akceptacji:**

- **AC-1:** AI automatycznie identyfikuje 5–20 kluczowych terminów/pojęć do usunięcia z tekstu (konfigurowalna liczba)
- **AC-2:** Luki są numerowane i zastąpione podkreśleniem o stałej długości (nie zdradzają długości słowa)
- **AC-3:** Generowana jest oddzielna sekcja "Bank wyrazów" z poprawnymi odpowiedziami + opcjonalnymi dystraktorami (0–5)
- **AC-4:** Klucz odpowiedzi mapuje numer luki → poprawne słowo/fraza
- **AC-5:** Warianty A/B mają różne luki w tym samym tekście (inne słowa usunięte)

---

### US-016: Krzyżówka dydaktyczna (crossword generator)

| | |
|---|---|
| **Priorytet** | 🔴 Ambitny kierunek |
| **Opis funkcji** | Generator krzyżówek opartych na definicjach/pytaniach z materiału źródłowego. AI generuje hasła i definicje, a algorytm układa je w siatkę krzyżówki z automatycznym kluczem. |
| **Problem** | Krzyżówki są atrakcyjną formą powtórki materiału, szczególnie dla młodszych uczniów, ale ich ręczne tworzenie (układanie siatki, numeracja, definicje) jest ekstremalnie pracochłonne. |
| **User Story** | *Jako nauczyciel, chcę wygenerować krzyżówkę z pojęć omawianych na lekcji, aby urozmaicić formę powtórek i zaangażować uczniów.* |

**Kryteria akceptacji:**

- **AC-1:** Użytkownik podaje temat/materiał, a AI generuje minimum 8, maksimum 20 haseł z definicjami
- **AC-2:** Algorytm tworzy siatkę krzyżówki z minimum 60% przecięć (shared letters) między hasłami
- **AC-3:** DOCX zawiera: siatkę krzyżówki (pusta), numerowane definicje (poziomo/pionowo), stronę z rozwiązaniem
- **AC-4:** Siatka renderuje się poprawnie jako tabela w Word (czarne komórki = ciemne wypełnienie, białe = puste pole)
- **AC-5:** Hasła zawierają wyłącznie litery polskiego alfabetu (obsługa ą, ć, ę, ł, ń, ó, ś, ź, ż)

---

### US-017: Karta oceny / Rubric z kryteriami punktowania

| | |
|---|---|
| **Priorytet** | 🟢 Szybka wygrana |
| **Opis funkcji** | Nowy typ dokumentu: rubryka oceniania (scoring rubric) generowana na podstawie opisu zadania lub sprawdzianu. Tabela z kryteriami, poziomami osiągnięć i punktacją. |
| **Problem** | Tworzenie obiektywnych rubryk oceniania jest trudne i czasochłonne. Nauczyciele często oceniają subiektywnie, bo brak im narzędzia do szybkiego tworzenia szczegółowych kryteriów. |
| **User Story** | *Jako nauczyciel, chcę wygenerować szczegółową rubrykę oceniania do zadania lub sprawdzianu, aby oceniać uczniów obiektywnie i oszczędzić czas na tworzeniu kryteriów.* |

**Kryteria akceptacji:**

- **AC-1:** Użytkownik opisuje zadanie/temat lub wskazuje wcześniej wygenerowany sprawdzian jako źródło
- **AC-2:** AI generuje tabelę z 3–6 kryteriami oceny i 3–4 poziomami osiągnięć (np. niewystarczający / podstawowy / rozszerzony / celujący)
- **AC-3:** Każda komórka tabeli zawiera konkretny, mierzalny opis zachowania ucznia na danym poziomie
- **AC-4:** Automatycznie obliczana jest skala punktowa (np. 0–20 pkt) z rozkładem na kryteria
- **AC-5:** DOCX eksportuje się jako profesjonalna tabela z nagłówkami, gotowa do druku i dołączenia do sprawdzianu

---

## 3. Integracje i formaty eksportu

*Rozszerzenie poza DOCX, integracje z platformami e-learningowymi, umożliwienie współpracy między instancjami.*

---

### US-018: Eksport do PDF z zachowaniem formatowania

| | |
|---|---|
| **Priorytet** | 🟢 Szybka wygrana |
| **Opis funkcji** | Dodanie przycisku "Eksportuj jako PDF" obok istniejącego eksportu DOCX. Konwersja zachowuje formatowanie (tabele, nagłówki, numeracja, warianty grupowe) 1:1 z podglądem WYSIWYG. |
| **Problem** | Nauczyciele często potrzebują PDF do druku (nie DOCX), aby uniknąć przypadkowej edycji przez uczniów w wersji cyfrowej lub problemów z renderowaniem na różnych komputerach. |
| **User Story** | *Jako nauczyciel, chcę wyeksportować sprawdzian bezpośrednio jako PDF, aby mieć pewność, że wydruk wygląda identycznie na każdej drukarce bez konwersji w Wordzie.* |

**Kryteria akceptacji:**

- **AC-1:** Przycisk "Eksportuj PDF" dostępny obok "Eksportuj DOCX" na ekranie finalizacji
- **AC-2:** PDF zachowuje 100% elementów formatowania widocznych w podglądzie WYSIWYG (tabele, numeracja, nagłówki)
- **AC-3:** Warianty A/B generują oddzielne strony w jednym pliku PDF lub oddzielne pliki (konfigurowalne)
- **AC-4:** Rozmiar strony: A4, marginesy identyczne z szablonem DOCX
- **AC-5:** Czas generowania PDF nie przekracza 2x czasu generowania DOCX dla tego samego dokumentu

---

### US-019: Eksport Moodle XML / GIFT do platform e-learningowych

| | |
|---|---|
| **Priorytet** | 🟡 Średni nakład |
| **Opis funkcji** | Eksport wygenerowanych pytań do formatu Moodle XML lub GIFT, umożliwiający bezpośredni import do Moodle, Canvas, lub Blackboard jako quiz/bank pytań. |
| **Problem** | Nauczyciele korzystający z platform e-learningowych muszą ręcznie przepisywać pytania z wydrukowanego sprawdzianu do Moodle. To podwójna praca, która zniechęca do korzystania z testów online. |
| **User Story** | *Jako nauczyciel prowadzący zajęcia hybrydowe, chcę wyeksportować pytania do formatu Moodle, aby jednym kliknięciem przenieść sprawdzian do platformy e-learningowej.* |

**Kryteria akceptacji:**

- **AC-1:** Eksport do Moodle XML obejmuje typy: wielokrotny wybór, prawda/fałsz, krótka odpowiedź, dopasowywanie
- **AC-2:** Każde pytanie w XML zawiera prawidłowe odpowiedzi z wagami punktowymi zgodnymi ze schematem Moodle 4.x
- **AC-3:** Plik XML przechodzi walidację importu w Moodle bez błędów (testowane na Moodle 4.1+)
- **AC-4:** Eksport GIFT dostępny jako alternatywa dla prostszych platform (plain text format)
- **AC-5:** Pytania otwarte/opisowe eksportują się jako typ "essay" z instrukcją dla prowadzącego w polu feedback

---

### US-020: Współdzielenie szablonów między instancjami (import/export config)

| | |
|---|---|
| **Priorytet** | 🟢 Szybka wygrana |
| **Opis funkcji** | Mechanizm eksportu i importu konfiguracji szablonów dokumentów jako pliki .json. Nauczyciel może wyeksportować swoje ustawienia (szablon, domyślne parametry, tagi przedmiotów) i udostępnić je innemu nauczycielowi z inną instancją EduGen Local. |
| **Problem** | Każda instancja EduGen jest izolowana (localhost). Gdy drugi nauczyciel w szkole instaluje aplikację, musi od zera konfigurować szablony i ustawienia, nawet jeśli kolega ma już gotową konfigurację. |
| **User Story** | *Jako nauczyciel, chcę wyeksportować moje ustawienia szablonów i udostępnić je koledze, aby nie musiał konfigurować wszystkiego od nowa.* |

**Kryteria akceptacji:**

- **AC-1:** Przycisk "Eksportuj konfigurację" generuje plik .json z: szablonami, domyślnymi parametrami, tagami przedmiotów
- **AC-2:** Przycisk "Importuj konfigurację" wczytuje plik .json z walidacją schematu i informacją o konfliktach z istniejącymi ustawieniami
- **AC-3:** Import nie nadpisuje danych użytkownika (dokumenty, historia) — dotyczy wyłącznie konfiguracji
- **AC-4:** Plik .json jest czytelny dla człowieka i edytowalny ręcznie (dokumentacja pól w README)
- **AC-5:** Walidacja przy imporcie odrzuca pliki niezgodne ze schematem z komunikatem wskazującym błąd

---

### US-021: Dostęp LAN z autoryzacją per-urządzenie

| | |
|---|---|
| **Priorytet** | 🔴 Ambitny kierunek |
| **Opis funkcji** | Opcjonalne włączenie dostępu przez sieć LAN (np. 192.168.x.x) z systemem autoryzacji opartym na jednorazowym kodzie parowania per urządzenie. Domyślnie wyłączone (zachowanie obecnego localhost only). |
| **Problem** | W szkole z jednym serwerem EduGen tylko jeden nauczyciel przy danym komputerze może korzystać z aplikacji. Inni nauczyciele w pokoju nauczycielskim nie mają dostępu, mimo że są w tej samej sieci. |
| **User Story** | *Jako administrator szkolny, chcę umożliwić nauczycielom w sieci LAN dostęp do jednej instancji EduGen, aby nie instalować aplikacji na każdym komputerze osobno.* |

**Kryteria akceptacji:**

- **AC-1:** Tryb LAN jest domyślnie WYŁĄCZONY; włączany jawnie w ustawieniach z ostrzeżeniem o konsekwencjach bezpieczeństwa
- **AC-2:** Parowanie nowego urządzenia wymaga wprowadzenia 6-cyfrowego kodu jednorazowego wyświetlanego na hoście
- **AC-3:** Sparowane urządzenia wyświetlane są na liście z opcją odwołania dostępu (revoke)
- **AC-4:** Komunikacja LAN odbywa się przez HTTPS z self-signed certificate (ostrzeżenie przeglądarki akceptowalne w MVP)
- **AC-5:** Auto-wylogowanie po 15 min obowiązuje identycznie dla sesji LAN jak dla localhost

---

## 4. Wydajność i stabilność techniczna

*Rozwiązanie znanych ograniczeń technicznych: brak resume, limit skanów, jeden szablon, brak LaTeX.*

---

### US-022: Mechanizm wznawiania przerwanych zadań generowania (resume)

| | |
|---|---|
| **Priorytet** | 🟡 Średni nakład |
| **Opis funkcji** | Checkpoint-based resume: każdy etap generowania (analiza OCR, generowanie pytań, formatowanie) zapisywany jest w SQLite. Po przerwaniu (crash, zamknięcie przeglądarki, timeout) zadanie można wznowić od ostatniego ukończonego checkpointu. |
| **Problem** | Gdy generowanie zostanie przerwane (np. przez zamknięcie laptopa lub timeout API), cała praca jest tracona i nauczyciel musi zaczynać od nowa, marnując czas i tokeny API. |
| **User Story** | *Jako nauczyciel, chcę wznowić przerwane generowanie od miejsca, w którym się zatrzymało, aby nie tracić czasu i nie zużywać ponownie tokenów API.* |

**Kryteria akceptacji:**

- **AC-1:** Każdy z min. 4 etapów generowania zapisuje checkpoint w SQLite po ukończeniu (tabela `task_checkpoints`)
- **AC-2:** Po wykryciu przerwanego zadania UI wyświetla dialog: "Wykryto niedokończone zadanie. Wznowić od etapu X?"
- **AC-3:** Wznowienie pomija ukończone etapy i kontynuuje od następnego, używając zapisanych danych pośrednich
- **AC-4:** Checkpoint zawiera: `task_id`, etap, timestamp, dane wejściowe/wyjściowe etapu (JSON), status
- **AC-5:** Checkpointy starsze niż 24h są automatycznie usuwane (garbage collection)

---

### US-023: Przetwarzanie skanów PDF powyżej 5 stron (chunked OCR)

| | |
|---|---|
| **Priorytet** | 🟡 Średni nakład |
| **Opis funkcji** | Podział dokumentów PDF >5 stron na chunki po 5 stron, przetwarzanie OCR sekwencyjnie z łączeniem wyników. Pasek postępu per-chunk z informacją o łącznym postępie. |
| **Problem** | Obecny limit 5 stron na skan PDF oznacza, że nauczyciel musi ręcznie dzielić dłuższe dokumenty (np. 15-stronicowy podręcznik) na części, co jest uciążliwe i prowadzi do utraty kontekstu między fragmentami. |
| **User Story** | *Jako nauczyciel, chcę załadować cały wielostronicowy PDF bez ręcznego dzielenia, aby AI przetworzyła pełny materiał źródłowy.* |

**Kryteria akceptacji:**

- **AC-1:** System akceptuje PDF do 30 stron (nowy limit) z informacją o szacowanym czasie przetwarzania
- **AC-2:** PDF jest dzielony na chunki po 5 stron, przetwarzane sekwencyjnie przez OpenAI Vision
- **AC-3:** Postęp wyświetla się jako: "Przetwarzanie stron 6–10 z 15 (chunk 2/3)"
- **AC-4:** Wyniki OCR z kolejnych chunków są łączone z zachowaniem kolejności i bez duplikacji na granicach stron
- **AC-5:** W przypadku błędu OCR na jednym chunku, system kontynuuje z pozostałymi i raportuje brakujące strony

---

### US-024: System wielu szablonów DOCX z edytorem wizualnym

| | |
|---|---|
| **Priorytet** | 🟡 Średni nakład |
| **Opis funkcji** | Zastąpienie jednego uniwersalnego szablonu DOCX systemem wielu szablonów z prostym edytorem wizualnym. Nauczyciel może tworzyć szablony z niestandardowymi nagłówkami (logo szkoły, imię nauczyciela), stopkami i stylami. |
| **Problem** | Jeden szablon nie pasuje do wszystkich szkół — każda ma inny nagłówek, logo, formatowanie. Nauczyciele muszą po eksporcie ręcznie dodawać nagłówek szkoły do każdego dokumentu. |
| **User Story** | *Jako nauczyciel, chcę stworzyć własny szablon z logo i nagłówkiem mojej szkoły, aby eksportowane dokumenty były od razu gotowe do druku.* |

**Kryteria akceptacji:**

- **AC-1:** Sekcja "Szablony" w ustawieniach wyświetla listę szablonów z podglądem miniaturki
- **AC-2:** Edytor szablonu pozwala ustawić: logo (upload obrazka), nazwę szkoły, imię nauczyciela, stopkę, marginesy, font
- **AC-3:** Każdy typ dokumentu (sprawdzian, kartkówka, karta pracy) może mieć przypisany inny domyślny szablon
- **AC-4:** Eksport DOCX stosuje wybrany szablon — nagłówek/stopka/style renderują się poprawnie
- **AC-5:** System zawiera min. 3 predefiniowane szablony: formalny, minimalistyczny, kolorowy

---

### US-025: Obsługa LaTeX/MathML dla wzorów matematycznych

| | |
|---|---|
| **Priorytet** | 🔴 Ambitny kierunek |
| **Opis funkcji** | Renderowanie wzorów matematycznych w edytorze WYSIWYG (np. via KaTeX) oraz eksport do DOCX jako pola OMML (Office Math Markup Language). Nauczyciel wprowadza wzory w notacji LaTeX, a system konwertuje je na poprawnie wyświetlane formuły. |
| **Problem** | Brak wsparcia LaTeX jest krytycznym ograniczeniem dla nauczycieli matematyki, fizyki i chemii. Wzory Unicode/liniowe (np. x^2 + 3x = 0) są nieczytelne i nieprofesjonalne w wydrukach. |
| **User Story** | *Jako nauczyciel matematyki, chcę wpisywać wzory w LaTeX i widzieć je wyrenderowane w edytorze i eksporcie, aby sprawdziany miały profesjonalny zapis matematyczny.* |

**Kryteria akceptacji:**

- **AC-1:** Edytor WYSIWYG renderuje LaTeX inline (`$...$`) i blokowy (`$$...$$`) za pomocą KaTeX lub MathJax
- **AC-2:** AI generuje pytania matematyczne z poprawną notacją LaTeX (weryfikowane wyrażeniem regularnym i parserem KaTeX)
- **AC-3:** Eksport DOCX konwertuje LaTeX na OMML — wzory wyświetlają się natywnie w Microsoft Word bez dodatkowych pluginów
- **AC-4:** Obsługiwane symbole: ułamki, potęgi, indeksy, pierwiastki, sumy, całki, symbole greckie, macierze 2x2
- **AC-5:** Fallback: jeśli konwersja OMML nie powiedzie się dla formuły, wstawiana jest wersja PNG wzoru (rasteryzacja)

---

## Rekomendacje implementacyjne

**Sprint 1 (szybkie wygrane):** US-010 (wizard), US-012 (progress bar), US-015 (cloze), US-017 (rubric), US-018 (PDF export), US-020 (config sharing). Szacowany nakład: 2 tygodnie dla zespołu 2-osobowego.

**Sprint 2–3 (średni nakład):** US-011 (drag-and-drop), US-013 (biblioteka), US-014 (fiszki), US-019 (Moodle XML), US-022 (resume), US-023 (chunked OCR), US-024 (szablony). Szacowany nakład: 4–6 tygodni.

**Backlog / Spike:** US-016 (krzyżówki), US-021 (LAN), US-025 (LaTeX/OMML). Wymagają spike'a technicznego przed estymacją — rekomendacja: 2-dniowy spike per funkcja.
