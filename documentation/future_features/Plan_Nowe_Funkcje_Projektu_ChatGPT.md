# EduGen Local — propozycje nowych funkcji i user stories

## Założenia

EduGen Local to lokalna aplikacja desktopowa dla nauczycieli, działająca w oparciu o Docker Compose, FastAPI i SQLite. Produkt obsługuje workflow dwuetapowy: prototyp w edytorze WYSIWYG, a następnie finalizacja do DOCX. Aktualne ograniczenia obejmują między innymi brak resume dla przerwanych zadań, pojedynczy szablon DOCX, limit OCR dla skanów PDF do 5 stron oraz brak dostępu przez LAN.

Celem poniższego backlogu jest dostarczenie konkretnych pomysłów gotowych do estymacji i planowania sprintów.

---

## 1. UX/UI

### F-001 — Kreator generowania z podglądem konfiguracji

**Co to jest**  
Wielostopniowy kreator prowadzący użytkownika przez proces: źródło → typ materiału → parametry → podgląd AI → edycja → eksport.

**Problem, który rozwiązuje**  
Nauczyciel nie zawsze widzi cały proces i łatwo gubi ustawienia wpływające na wynik końcowy.

**User story**  
Jako nauczyciel chcę przejść przez generowanie materiału krok po kroku, aby szybciej skonfigurować dokument bez pomijania ważnych opcji.

**Kryteria akceptacji**
- [ ] Użytkownik widzi 6 stałych kroków procesu oraz bieżący etap.
- [ ] Każdy krok ma czytelną nazwę biznesową.
- [ ] Panel boczny pokazuje aktualne ustawienia konfiguracji.
- [ ] Przycisk przejścia dalej jest nieaktywny, jeśli wymagane pola są puste.
- [ ] Użytkownik może wrócić do wcześniejszego kroku bez utraty danych.
- [ ] Ostatni krok pokazuje podsumowanie ustawień przed eksportem.

**Priorytet implementacji**  
Szybka wygrana

---

### F-002 — Tryb „Szybki start” i „Zaawansowany”

**Co to jest**  
Dwa poziomy złożoności interfejsu: prosty dla szybkiego generowania oraz rozszerzony dla pełnej kontroli nad ustawieniami.

**Problem, który rozwiązuje**  
Początkujący użytkownicy są przeciążeni liczbą opcji, a zaawansowani użytkownicy potrzebują większej kontroli.

**User story**  
Jako nauczyciel chcę wybrać prosty lub zaawansowany tryb pracy, aby dopasować liczbę opcji do mojego doświadczenia i czasu.

**Kryteria akceptacji**
- [ ] Przy tworzeniu nowego materiału użytkownik wybiera tryb „Szybki start” albo „Zaawansowany”.
- [ ] Tryb „Szybki start” pokazuje tylko podstawowe pola.
- [ ] Tryb „Zaawansowany” pokazuje dodatkowe parametry generowania.
- [ ] Przełączenie trybu nie usuwa już wpisanych danych.
- [ ] Aplikacja zapamiętuje ostatnio użyty tryb lokalnie.

**Priorytet implementacji**  
Szybka wygrana

---

### F-003 — Biblioteka szablonów konfiguracji

**Co to jest**  
Możliwość zapisywania konfiguracji generowania jako presetów wielokrotnego użytku.

**Problem, który rozwiązuje**  
Nauczyciel wielokrotnie ustawia te same parametry dla podobnych materiałów.

**User story**  
Jako nauczyciel chcę zapisać konfigurację jako szablon, aby przy kolejnych materiałach uruchamiać sprawdzony zestaw ustawień jednym kliknięciem.

**Kryteria akceptacji**
- [ ] Użytkownik może zapisać bieżącą konfigurację pod własną nazwą.
- [ ] Użytkownik może uruchomić nowy dokument na bazie zapisanego szablonu.
- [ ] Szablon przechowuje typ materiału, poziom klasy, liczbę pytań, warianty A/B i ustawienia eksportu.
- [ ] Lista szablonów pokazuje datę ostatniego użycia.
- [ ] Użytkownik może edytować i usuwać własne szablony.

**Priorytet implementacji**  
Średni nakład

---

### F-004 — Widok porównania prototypu i finalnego DOCX

**Co to jest**  
Widok różnic pomiędzy wersją WYSIWYG a finalnym układem po eksporcie.

**Problem, który rozwiązuje**  
Użytkownik może zobaczyć inny efekt końcowy w DOCX niż w prototypie i nie wie, skąd wynikają różnice.

**User story**  
Jako nauczyciel chcę zobaczyć różnice między edytorem a eksportem DOCX, aby uniknąć niespodzianek przed wydrukiem.

**Kryteria akceptacji**
- [ ] Po wygenerowaniu DOCX użytkownik może otworzyć widok porównawczy.
- [ ] Widok pokazuje różnice w numeracji, sekcjach i układzie bloków tekstu.
- [ ] Użytkownik może wrócić do edycji bez utraty zmian.
- [ ] Jeśli różnic nie ma, system pokazuje stosowny komunikat.

**Priorytet implementacji**  
Ambitny kierunek

---

## 2. Nowe typy materiałów dydaktycznych

### F-005 — Fiszki i karty powtórkowe

**Co to jest**  
Nowy typ materiału do generowania zestawów pojęcie–definicja lub pytanie–odpowiedź.

**Problem, który rozwiązuje**  
Nauczyciel potrzebuje materiałów do powtórek, a nie tylko testów i kartkówek.

**User story**  
Jako nauczyciel chcę generować fiszki z materiału źródłowego, aby przygotować uczniom krótkie powtórki bez ręcznego przepisywania treści.

**Kryteria akceptacji**
- [ ] Użytkownik może wybrać typ materiału „Fiszki”.
- [ ] System generuje minimum 10 fiszek.
- [ ] Dostępne są warianty: definicje, daty, pojęcia, słówka.
- [ ] Fiszki można edytować w WYSIWYG.
- [ ] Eksport DOCX układa fiszki w formacie gotowym do wydruku.

**Priorytet implementacji**  
Szybka wygrana

---

### F-006 — Arkusze pracy z odpowiedziami otwartymi

**Co to jest**  
Typ materiału z miejscem na dłuższe odpowiedzi ucznia.

**Problem, który rozwiązuje**  
Brakuje wsparcia dla ćwiczeń lekcyjnych i pracy domowej z odpowiedziami opisowymi.

**User story**  
Jako nauczyciel chcę wygenerować kartę pracy z pytaniami otwartymi i miejscem na odpowiedzi, aby wykorzystać ją na lekcji lub jako pracę domową.

**Kryteria akceptacji**
- [ ] Użytkownik określa liczbę pytań otwartych.
- [ ] Użytkownik określa długość miejsca na odpowiedź.
- [ ] System generuje pytania wraz z pustymi liniami lub polami odpowiedzi.
- [ ] Można opcjonalnie wygenerować skrócony klucz dla nauczyciela.
- [ ] Materiał wspiera warianty A/B.

**Priorytet implementacji**  
Średni nakład

---

### F-007 — Exit tickets / bilety wyjścia

**Co to jest**  
Krótki format 3–5 pytań na zakończenie lekcji.

**Problem, który rozwiązuje**  
Nauczyciel potrzebuje szybkiego narzędzia do sprawdzenia zrozumienia materiału po zajęciach.

**User story**  
Jako nauczyciel chcę wygenerować krótki bilet wyjścia na koniec lekcji, aby szybko sprawdzić, co uczniowie zrozumieli.

**Kryteria akceptacji**
- [ ] Użytkownik może wybrać typ materiału „Exit ticket”.
- [ ] System generuje od 3 do 5 pytań.
- [ ] Dostępne są warianty: zamknięte, otwarte, mieszane.
- [ ] Układ eksportu pozwala wydrukować minimum 4 bilety na jednej stronie A4.
- [ ] Klucz odpowiedzi jest opcjonalny.

**Priorytet implementacji**  
Szybka wygrana

---

### F-008 — Materiały wyrównawcze i rozszerzające

**Co to jest**  
Generowanie dwóch poziomów trudności tego samego materiału: podstawowego i rozszerzonego.

**Problem, który rozwiązuje**  
Jedna wersja materiału nie odpowiada zróżnicowanemu poziomowi klasy.

**User story**  
Jako nauczyciel chcę wygenerować wersję podstawową i rozszerzoną tego samego materiału, aby dopasować zadania do zróżnicowanego poziomu uczniów.

**Kryteria akceptacji**
- [ ] Użytkownik może włączyć tryb „Wersje poziomowane”.
- [ ] System generuje minimum dwie wersje materiału.
- [ ] Obie wersje obejmują ten sam zakres tematyczny.
- [ ] Klucz odpowiedzi jest generowany osobno dla każdej wersji.
- [ ] Użytkownik może przełączać się między wersjami w edytorze bez utraty zmian.

**Priorytet implementacji**  
Ambitny kierunek

---

## 3. Integracje i formaty eksportu

### F-009 — Eksport PDF i HTML

**Co to jest**  
Rozszerzenie eksportu o PDF i HTML obok DOCX.

**Problem, który rozwiązuje**  
Nie każdy użytkownik chce pracować na DOCX, a PDF i HTML są wygodniejsze do druku i podglądu.

**User story**  
Jako nauczyciel chcę eksportować materiał do PDF i HTML, aby szybciej drukować dokumenty i używać ich także poza Wordem.

**Kryteria akceptacji**
- [ ] Na ekranie eksportu dostępne są formaty DOCX, PDF i HTML.
- [ ] PDF zachowuje strukturę sekcji i numerację pytań.
- [ ] HTML otwiera się lokalnie w przeglądarce bez połączenia z Internetem.
- [ ] Klucz odpowiedzi może być eksportowany osobno.
- [ ] Czas generowania PDF nie przekracza o więcej niż 20% czasu generowania DOCX.

**Priorytet implementacji**  
Średni nakład

---

### F-010 — Eksport do Moodle XML / QTI

**Co to jest**  
Eksport pytań do formatów kompatybilnych z LMS.

**Problem, który rozwiązuje**  
Nauczyciel musi ręcznie przepisywać pytania do platform typu Moodle.

**User story**  
Jako nauczyciel chcę wyeksportować test do formatu LMS, aby zaimportować go do Moodle bez ręcznego przepisywania pytań.

**Kryteria akceptacji**
- [ ] Dla wspieranych typów pytań dostępny jest eksport Moodle XML lub QTI.
- [ ] System waliduje kompatybilność pytań przed eksportem.
- [ ] Użytkownik widzi listę ostrzeżeń dla niewspieranych typów pytań.
- [ ] Plik przechodzi poprawny import testowy do referencyjnej instancji Moodle.
- [ ] Punktacja i klucz odpowiedzi są mapowane, jeśli format na to pozwala.

**Priorytet implementacji**  
Ambitny kierunek

---

### F-011 — Pakiet ZIP nauczyciela

**Co to jest**  
Eksport kompletnego zestawu plików w jednym archiwum ZIP.

**Problem, który rozwiązuje**  
Nauczyciel gubi powiązania pomiędzy dokumentem, kluczem i wersjami A/B.

**User story**  
Jako nauczyciel chcę pobrać cały komplet plików w jednym archiwum, aby łatwo przechowywać i przekazywać gotowy zestaw materiałów.

**Kryteria akceptacji**
- [ ] Użytkownik może wybrać eksport „Pakiet ZIP”.
- [ ] ZIP zawiera materiał ucznia, klucz odpowiedzi, warianty A/B i manifest JSON.
- [ ] Nazwy plików są spójne i zawierają datę, temat oraz wariant.
- [ ] Manifest zawiera metadane dokumentu i timestamp eksportu.
- [ ] Po zapisaniu archiwum użytkownik może otworzyć folder docelowy.

**Priorytet implementacji**  
Szybka wygrana

---

### F-012 — Eksport pośredni CSV / JSON do formularzy online

**Co to jest**  
Eksport pytań do prostego formatu pośredniego pod dalszy import do narzędzi online.

**Problem, który rozwiązuje**  
Pełne integracje API są kosztowne, a użytkownik potrzebuje szybkiego sposobu przeniesienia treści do formularzy.

**User story**  
Jako nauczyciel chcę wyeksportować pytania do prostego formatu pośredniego, aby szybciej przenieść je do narzędzi online.

**Kryteria akceptacji**
- [ ] System wspiera eksport CSV lub JSON dla pytań zamkniętych i krótkiej odpowiedzi.
- [ ] Każdy rekord zawiera treść pytania, odpowiedzi, poprawną odpowiedź, punktację i wariant.
- [ ] Użytkownik dostaje informację, które typy pytań są wspierane.
- [ ] Plik otwiera się poprawnie z polskimi znakami.
- [ ] Format kolumn lub pól jest opisany w interfejsie eksportu.

**Priorytet implementacji**  
Średni nakład

---

## 4. Wydajność i stabilność techniczna

### F-013 — Resume przerwanych zadań generowania

**Co to jest**  
Mechanizm wznowienia joba od ostatniego zakończonego etapu.

**Problem, który rozwiązuje**  
Przerwane generowanie zmusza użytkownika do rozpoczynania całego procesu od nowa.

**User story**  
Jako nauczyciel chcę wznowić przerwane generowanie od ostatniego zakończonego etapu, aby nie tracić czasu i już wykonanej pracy.

**Kryteria akceptacji**
- [ ] Każde generowanie tworzy rekord joba z unikalnym ID i statusem etapu.
- [ ] Po restarcie aplikacji użytkownik widzi listę zadań do wznowienia.
- [ ] Wznowienie odbywa się od ostatniego poprawnie zakończonego etapu.
- [ ] Jeśli wznowienie nie jest możliwe, użytkownik dostaje powód i opcję restartu.
- [ ] System zapisuje czas startu, czas ostatniej aktualizacji, etap i błąd.

**Priorytet implementacji**  
Ambitny kierunek

---

### F-014 — Kolejka zadań i ekran statusu

**Co to jest**  
Lokalny job manager z kolejką, statusem i historią błędów.

**Problem, który rozwiązuje**  
Użytkownik nie wie, czy zadanie nadal się wykonuje, czy aplikacja się zawiesiła.

**User story**  
Jako nauczyciel chcę widzieć status generowania i kolejkę zadań, aby wiedzieć, na jakim etapie jest dokument i czy wymaga mojej reakcji.

**Kryteria akceptacji**
- [ ] Ekran pokazuje statusy: oczekuje, przetwarza, wymaga uwagi, zakończone, nieudane.
- [ ] Dla aktywnego joba widoczny jest etap oraz procent postępu.
- [ ] Użytkownik może anulować job przed etapem eksportu.
- [ ] Błędy są prezentowane czytelnym językiem.
- [ ] Historia przechowuje minimum 30 ostatnich zadań.

**Priorytet implementacji**  
Średni nakład

---

### F-015 — Preflight dla wejść OCR

**Co to jest**  
Szybka walidacja jakości i ograniczeń pliku przed uruchomieniem pełnego przetwarzania.

**Problem, który rozwiązuje**  
Użytkownik zbyt późno dowiaduje się, że skan jest słaby albo PDF zbyt długi do skutecznego OCR.

**User story**  
Jako nauczyciel chcę dostać ocenę jakości pliku przed generowaniem, aby od razu wiedzieć, czy materiał nadaje się do OCR.

**Kryteria akceptacji**
- [ ] System wykonuje preflight po dodaniu pliku.
- [ ] Dla PDF pokazuje liczbę stron i ostrzega po przekroczeniu 5 stron.
- [ ] Dla obrazów pokazuje ostrzeżenia o niskiej jakości.
- [ ] Użytkownik dostaje rekomendację: kontynuuj, zalecana poprawa lub duże ryzyko słabego wyniku.
- [ ] Wynik preflight jest zapisywany w metadanych joba.

**Priorytet implementacji**  
Szybka wygrana

---

### F-016 — Warstwa szablonów DOCX v2

**Co to jest**  
Obsługa wielu szablonów DOCX dopasowanych do typu materiału.

**Problem, który rozwiązuje**  
Jeden szablon DOCX ogranicza jakość i elastyczność eksportu dla różnych zastosowań.

**User story**  
Jako nauczyciel chcę wybierać szablon eksportu dopasowany do rodzaju materiału, aby końcowy dokument wymagał mniej ręcznych poprawek.

**Kryteria akceptacji**
- [ ] System wspiera minimum 4 niezależne szablony DOCX.
- [ ] Każdy typ materiału ma przypisany domyślny szablon.
- [ ] Użytkownik może zmienić szablon przed eksportem.
- [ ] Szablon definiuje układ nagłówka, numerację, odstępy i sekcję odpowiedzi.
- [ ] Dodanie nowego szablonu nie wymaga zmiany logiki generowania treści.

**Priorytet implementacji**  
Ambitny kierunek

---

## Proponowana kolejność wdrożenia

### Faza 1 — szybkie wygrane
- F-001 Kreator generowania z podglądem konfiguracji
- F-002 Tryb „Szybki start” i „Zaawansowany”
- F-005 Fiszki i karty powtórkowe
- F-007 Exit tickets / bilety wyjścia
- F-011 Pakiet ZIP nauczyciela
- F-015 Preflight dla wejść OCR

### Faza 2 — średni nakład
- F-003 Biblioteka szablonów konfiguracji
- F-006 Arkusze pracy z odpowiedziami otwartymi
- F-009 Eksport PDF i HTML
- F-012 Eksport pośredni CSV / JSON
- F-014 Kolejka zadań i ekran statusu

### Faza 3 — ambitne kierunki
- F-004 Widok porównania prototypu i finalnego DOCX
- F-008 Materiały wyrównawcze i rozszerzające
- F-010 Eksport do Moodle XML / QTI
- F-013 Resume przerwanych zadań generowania
- F-016 Warstwa szablonów DOCX v2
