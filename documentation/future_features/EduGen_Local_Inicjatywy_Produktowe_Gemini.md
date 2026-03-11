# Inicjatywy Produktowe — EduGen Local

Oto zestawienie konkretnych inicjatyw produktowych, które rozszerzają możliwości EduGen Local, skupiając się na usunięciu barier adopcyjnych dla nauczycieli oraz optymalizacji istniejącej architektury. Propozycje zostały sformatowane tak, aby zespół deweloperski mógł z nich bezpośrednio skorzystać podczas planowania najbliższych sprintów, dbając o wydajność interfejsu przy rosnącej złożoności operacji asynchronicznych.

## 1. UX/UI — Usprawnienia przepływów

### Asynchroniczny podgląd generowania (Streaming UI)
**Co to jest:** Zmiana paradygmatu UX z "czekaj na całość" na bieżące strumieniowanie tekstu (np. przez Server-Sent Events z FastAPI) bezpośrednio do widoku w edytorze WYSIWYG.
**Problem, który rozwiązuje:** Oczekiwanie kilku minut w ciemno rodzi niepokój i uniemożliwia wczesną ocenę pracy AI. Nauczyciel nie może przerwać procesu, jeśli model źle zinterpretował polecenie (co generuje puste przebiegi i frustrację).
**User story:** *Jako nauczyciel, chcę widzieć pojawiające się pytania w czasie rzeczywistym, aby móc przerwać i skorygować generowanie, jeśli sztuczna inteligencja odeszła od tematu.*
**Kryteria akceptacji:**
- Interfejs nawiązuje połączenie strumieniowe i na bieżąco renderuje tekst w edytorze.
- Aktywny jest widoczny przycisk "Przerwij generowanie", który natychmiast anuluje żądanie API na backendzie.
- Po przerwaniu dotychczas wygenerowany tekst pozostaje zachowany w edytorze do ręcznej edycji.
**Priorytet implementacji:** Średni nakład.

### Kreator nagłówków dokumentu (Template Builder)
**Co to jest:** Prosty moduł konfiguracyjny w kroku eksportu, pozwalający na personalizację górnej sekcji dokumentu przed zrzutem do DOCX (ominięcie ograniczenia "jednego uniwersalnego szablonu w MVP").
**Problem, który rozwiązuje:** Sprawdziany z MVP wyglądają monotonnie i często nie spełniają wymogów formalnych danej szkoły (brak dedykowanego miejsca na punktację, klasę, grupę czy logo).
**User story:** *Jako nauczyciel, chcę wybrać układ nagłówka przed pobraniem pliku, aby wydrukowany sprawdzian wyglądał oficjalnie i posiadał uporządkowane rubryki na dane ucznia.*
**Kryteria akceptacji:**
- W modalnym oknie eksportu widoczne są 3 predefiniowane warianty układu (Minimalistyczny, Rozbudowany z rubryką ocen, Standard).
- Użytkownik może wpisać nazwę szkoły, która zostanie wstrzyknięta do dokumentu.
- Wybrany wariant poprawnie mapuje się na style i nadpisuje standardowy nagłówek pliku DOCX.
**Priorytet implementacji:** Szybka wygrana.

## 2. Nowe typy materiałów dydaktycznych

### Generator dwustronnych fiszek (Flashcards)
**Co to jest:** Nowy tryb przepływu łączący systemowy prompt i dedykowany layout tabelaryczny, zamieniający tekst wejściowy w gotowy zestaw dwustronnych kart do wycięcia.
**Problem, który rozwiązuje:** Narzędzie z MVP skupia się niemal w całości na ewaluacji. Nauczyciele potrzebują też materiałów do aktywnego uczenia się i powtórek, a ręczne formatowanie fiszek w Wordzie sprawia ogromne trudności.
**User story:** *Jako nauczyciel języka lub przedmiotu humanistycznego, chcę jednym kliknięciem wygenerować zestaw fiszek na podstawie skanu podręcznika, aby rozdać je uczniom na lekcji powtórzeniowej.*
**Kryteria akceptacji:**
- Użytkownik ma do wyboru nowy typ materiału "Fiszki edukacyjne".
- AI generuje symetryczne pary pojęciowe "Pojęcie – Definicja" lub "Pytanie – Krótka odpowiedź".
- Eksport DOCX wykorzystuje szablon tabeli precyzyjnie sformatowany pod wydruk dwustronny, z odpowiednim odbiciem lustrzanym marginesów rewersu.
**Priorytet implementacji:** Średni nakład.

### Analityczne rubryki oceniania (Grading Rubrics)
**Co to jest:** Rozbudowa generowanego klucza odpowiedzi o szczegółowe kryteria przyznawania punktów cząstkowych dla pytań opisowych i esejów.
**Problem, który rozwiązuje:** Zwykły klucz doskonale radzi sobie z wariantami A/B testów zamkniętych, ale sprawdzanie pytań otwartych bez obiektywnej miary pozostaje wysoce subiektywne i czasochłonne dla nauczyciela.
**User story:** *Jako nauczyciel, chcę otrzymać szczegółową rubrykę punktacji do każdego pytania otwartego, aby móc szybciej i sprawiedliwiej oceniać wypowiedzi pisemne uczniów.*
**Kryteria akceptacji:**
- Dla zadań otwartych aplikacja dokleja do klucza mini-tabelę punktacji (wymagania na 1 pkt, 2 pkt, maks pkt).
- Rubryka uwzględnia słowa kluczowe, których uczeń musi użyć.
- Moduł uruchamia się automatycznie pod warunkiem zaznaczenia obecności pytań otwartych w konfiguratorze.
**Priorytet implementacji:** Szybka wygrana.

## 3. Integracje i formaty eksportu

### Błyskawiczny eksport do CSV (Standard Kahoot! / Quizlet)
**Co to jest:** Moduł zapisujący quizy jednokrotnego wyboru bezpośrednio do pliku w ustandaryzowanej strukturze kolumnowej zgodnej z wiodącymi platformami edukacyjnymi.
**Problem, który rozwiązuje:** Obecny proces zmusza innowacyjnych nauczycieli do ręcznego i powolnego przeklejania pytań z DOCX do formularzy webowych Kahoota lub Quizleta w celu stworzenia interaktywnej gry.
**User story:** *Jako nauczyciel cyfrowy, chcę pobrać mój test w formacie pliku CSV, aby w 15 sekund zaimportować go na platformie Kahoot! i wykorzystać na najbliższej lekcji.*
**Kryteria akceptacji:**
- Dodany zostaje przycisk "Pobierz jako CSV (Kahoot/Quizlet)".
- Plik wynikowy posiada poprawne kodowanie oraz układ kolumn: *Pytanie, Odpowiedź 1, Odpowiedź 2, Odpowiedź 3, Odpowiedź 4, Limit czasu, Indeks poprawnej odpowiedzi*.
**Priorytet implementacji:** Szybka wygrana.

### Eksport do standardu QTI (Moodle / Canvas)
**Co to jest:** Opcja transformująca wygenerowaną strukturę pytań do standardu XML IMS QTI 2.1 kompresowanego w locie do archiwum `.zip` natywnie zjadanego przez systemy LMS.
**Problem, który rozwiązuje:** W szkołach w pełni scyfryzowanych i przy zadaniach domowych, zwykły DOCX nie pozwala na szybką dystrybucję i zautomatyzowane ocenianie — potrzebny jest format czytelny dla e-dzienników.
**User story:** *Jako wykładowca, chcę wyeksportować test do paczki QTI, aby móc od razu opublikować go na szkolnym serwerze Moodle bez przepisywania pytań.*
**Kryteria akceptacji:**
- Logika backendowa poprawnie mapuje wewnętrzny format JSON quizu (oraz warianty A/B) na węzły specyfikacji QTI XML.
- Archiwum `.zip` generowane jest w pamięci i pobierane przez przeglądarkę bez zapisywania stanów pośrednich na dysku.
**Priorytet implementacji:** Ambitny kierunek.

## 4. Wydajność i stabilność techniczna

### Persystencja zadań i bezpieczne wznawianie (Resumable Task Queue)
**Co to jest:** Użycie istniejącej w architekturze bazy SQLite jako asynchronicznej kolejki zadań, zapobiegającej stracie postępów.
**Problem, który rozwiązuje:** Z powodu braku funkcji "resume", zamknięcie aplikacji, odświeżenie strony lub krótkotrwały błąd sieci zrywa połączenie w trakcie operacji, co niweczy dotychczasową pracę AI, pożerając zapas tokenów i frustrując użytkowników.
**User story:** *Jako użytkownik, chcę by proces tworzenia sprawdzianu zapisywał się w tle, abym w razie nieoczekiwanego zamknięcia aplikacji mógł go wznowić od punktu przerwania.*
**Kryteria akceptacji:**
- Każde żądanie generowania rejestrowane jest w SQLite z nadanym unikatowym ID i przypisanym statusem (`pending`, `processing`, `failed`, `completed`).
- Odświeżenie aplikacji i przejście do historii pozwala na kliknięcie przycisku "Wznów zadanie" dla nieukończonych procesów.
- Połączenie API startuje dokładnie od ostatniego prawidłowo zmapowanego pytania.
**Priorytet implementacji:** Ambitny kierunek.

### Inteligentne okienkowanie dokumentów (Sliding Window PDF Chunking)
**Co to jest:** Architektoniczne obejście wąskiego gardła polegającego na ograniczeniu 5 stron dla modelu Vision, poprzez systematyczne cięcie PDF w tle na nakładające się okna kontekstowe ("chunks").
**Problem, który rozwiązuje:** Nauczyciele zmuszeni są obecnie dzielić obszerne skany rozdziałów i duże prezentacje w zewnętrznych programach PDF na oddzielne pliki przez wgraniem ich do EduGen.
**User story:** *Jako nauczyciel, chcę wgrać 25-stronicową prezentację, aby aplikacja samodzielnie podzieliła ją pod maską na równe porcje i wygenerowała z niej finalny test, oszczędzając mój czas.*
**Kryteria akceptacji:**
- System tnie uploadowane dokumenty z zachowaniem zakładki kontekstowej (overlap), np. 1-4 str., 4-7 str.
- Model analizuje strony sekwencyjnie i na końcu scala metadane przed wysłaniem podsumowania do edytora WYSIWYG.
- Nałożony zostaje logiczny twardy limit blokujący pliki absurdalnie długie (np. całe podręczniki > 150 stron).
**Priorytet implementacji:** Średni nakład.
