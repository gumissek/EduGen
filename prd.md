1. Przegląd produktu
EduGen Local to zaawansowana aplikacja desktopowa uruchamiana lokalnie, zaprojektowana w celu wsparcia nauczycieli w procesie tworzenia materiałów dydaktycznych. System wykorzystuje sztuczną inteligencję (modele OpenAI) do generowania spersonalizowanych kart pracy, sprawdzianów, kartkówek oraz testów na podstawie wytycznych użytkownika lub załączonych materiałów źródłowych.

Aplikacja kładzie nacisk na prywatność i kontrolę danych poprzez model wdrażania lokalnego (Docker Compose) oraz przechowywanie plików w lokalnej bazie danych SQLite i strukturze folderów użytkownika. Proces tworzenia treści jest dwuetapowy: najpierw generowany jest interaktywny prototyp do edycji, a następnie finalny dokument DOCX z opcją mieszania pytań i tworzenia wielu wariantów (grup).

2. Problem użytkownika
Nauczyciele poświęcają znaczną ilość czasu na ręczne przygotowywanie materiałów dydaktycznych, co często wiąże się z:

Mozolnym przepisywaniem treści z podręczników lub skanów.

Trudnością w tworzeniu wielu unikalnych wariantów tego samego testu (Grupa A/B).

Brakiem narzędzi, które pozwalają na szybką transformację surowych notatek w sformatowane dokumenty gotowe do druku.

Obawami o prywatność danych w chmurowych narzędziach AI.

Potrzebą posiadania scentralizowanego archiwum własnych materiałów źródłowych i wygenerowanych prac.

3. Wymagania funkcjonalne
3.1. Konfiguracja i dane wejściowe
System musi umożliwiać wybór rodzaju treści: karta pracy, sprawdzian, kartkówka, test lub materiały na zajęcia.

Obsługa poziomów edukacyjnych: szkoła podstawowa (klasy 1-8) oraz szkoła średnia (klasy 1-4).

Zarządzanie przedmiotami: wybór z predefiniowanej listy z opcją dodawania własnych pozycji.

Skalowanie poziomu językowego: dla przedmiotów językowych wybór skali A1-C2.

Parametryzacja testów: określenie tematu, zaleceń tekstowych, liczby pytań (otwartych i zamkniętych), poziomu trudności (4 stopnie) oraz liczby wariantów (grup).

3.2. Zarządzanie plikami źródłowymi
Obsługa formatów: PDF, DOCX, IMG (JPG/PNG) do limitu 10MB na plik.

Przechowywanie plików w strukturze folderów powiązanych z przedmiotem.

Mechanizm OCR/Vision: automatyczna ekstrakcja treści z obrazów i skanów PDF przy użyciu modeli OpenAI Vision.

Automatyczne generowanie jednozdaniowych podsumowań dla każdego dodanego pliku źródłowego.

3.3. Proces generowania treści (Workflow)
Prototypowanie: wygenerowanie wstępnej wersji treści do weryfikacji w edytorze.

Edytor WYSIWYG: lekki edytor obsługujący formatowanie kompatybilne z formatem DOCX (tekst, listy, tabele).

Iteracyjność: możliwość wprowadzania poprawek poprzez promptowanie AI lub edycję ręczną.

Finalizacja: generowanie dokumentu DOCX z automatycznym mieszaniem pytań i odpowiedzi dla różnych grup oraz dołączonym kluczem odpowiedzi na końcu pliku.

3.4. Backend i Administracja
Silnik: FastAPI z asynchroniczną obsługą zadań (BackgroundTasks).

Baza danych: SQLite do przechowywania metadanych plików i logów zapytań OpenAI.

Bezpieczeństwo: dostęp chroniony hasłem statycznym, automatyczne wylogowanie po 15 minutach.

Diagnostyka: endpointy healthcheck, weryfikacja klucza API, eksport logów diagnostycznych.

Backup: system codziennych kopii zapasowych bazy danych z retencją 7 dni.

4. Granice produktu
Brak wsparcia dla sieci LAN: aplikacja dostępna wyłącznie pod adresem localhost (127.0.0.1).

Ograniczenia formatowania: brak natywnego wsparcia dla LaTeX; wzory matematyczne renderowane w formacie liniowym/Unicode.

Zarządzanie błędami: brak mechanizmu resume dla przerwanych zadań generowania - wymagany restart procesu.

Skany PDF: ograniczenie efektywnego procesowania skanów do 5 stron (powyżej wymagany wybór zakresu).

Szablony: system korzysta z jednego uniwersalnego szablonu DOCX dla wszystkich dokumentów w fazie MVP.

5. Historyjki użytkowników
Dostęp i Konfiguracja
ID: US-001

Tytuł: Logowanie do systemu

Opis: Jako nauczyciel, chcę wprowadzić hasło dostępu, aby nikt niepowołany nie miał dostępu do moich materiałów lokalnych.

Kryteria akceptacji:

Wyświetlenie ekranu logowania przy starcie aplikacji.

Walidacja hasła z zapisanym w konfiguracji.

Sesja wygasa po 15 minutach bezczynności.

Istnieje skrypt .bat do resetowania hasła w razie zgubienia.

ID: US-002

Tytuł: Zarządzanie kluczem API i modelem

Opis: Jako użytkownik, chcę wprowadzić swój klucz OpenAI i wybrać model (np. gpt-5-mini), aby kontrolować koszty generowania.

Kryteria akceptacji:

Zakładka Ustawienia umożliwia wprowadzenie i zapisanie klucza API.

Backend weryfikuje poprawność klucza i zwraca status połączenia.

Możliwość wyboru modelu z listy rozwijanej.

Tworzenie Materiałów
ID: US-003

Tytuł: Konfiguracja nowego sprawdzianu

Opis: Jako nauczyciel, chcę określić parametry sprawdzianu (klasa, przedmiot, liczba pytań), aby AI wiedziało, jakiej trudności materiał przygotować.

Kryteria akceptacji:

Formularz zawiera pola: klasa (SP/LO), przedmiot (dropdown + add), liczba pytań (suma, otwarte, zamknięte).

Wybór poziomu trudności z 4 opcji (łatwy do bardzo trudny).

System zapamiętuje stan formularza w localStorage po odświeżeniu strony.

ID: US-004

Tytuł: Wykorzystanie plików źródłowych (Tekst)

Opis: Jako nauczyciel, chcę załączyć plik PDF z podręcznika, aby pytania w teście bazowały na konkretnym materiale źródłowym.

Kryteria akceptacji:

Upload plików PDF/DOCX do 10MB.

Backend odczytuje tekst przy użyciu pypdf/python-docx.

Plik jest przypisywany do folderu wybranego przedmiotu.

ID: US-005

Tytuł: Procesowanie skanów i zdjęć (OCR)

Opis: Jako nauczyciel, chcę przesłać zdjęcie strony z zeszytu ćwiczeń, aby system przekonwertował je na tekst pytania.

Kryteria akceptacji:

Przesłanie pliku IMG uruchamia moduł Vision w OpenAI.

Dla PDF bez warstwy tekstowej system informuje o konwersji na obrazy.

Możliwość wybrania zakresu stron dla dokumentów powyżej 5 stron.

Edycja i Finalizacja
ID: US-006

Tytuł: Przegląd i edycja prototypu

Opis: Jako nauczyciel, chcę zobaczyć wygenerowaną treść i poprawić błędy merytoryczne przed stworzeniem pliku DOCX.

Kryteria akceptacji:

Wyświetlenie edytora WYSIWYG z treścią prototypu.

Przycisk Przywróć oryginał usuwa wprowadzone zmiany ręczne.

Pole na uwagi do AI umożliwia wygenerowanie nowej wersji na podstawie poprawek.

Klucz odpowiedzi jest widoczny w osobnym widoku pod edytorem.

ID: US-007

Tytuł: Generowanie wariantów (Grup)

Opis: Jako nauczyciel, chcę wygenerować jeden plik DOCX z dwiema grupami (A i B), gdzie kolejność zadań jest inna.

Kryteria akceptacji:

Wybór liczby wariantów w formularzu początkowym.

Backend miesza kolejność pytań i odpowiedzi (dla zamkniętych) dla każdej grupy.

Finalny plik DOCX zawiera podziały stron między grupami.

Klucz odpowiedzi dla wszystkich grup znajduje się na końcu dokumentu.

Zarządzanie Danymi
ID: US-008

Tytuł: Przeglądanie i pobieranie wygenerowanych plików

Opis: Jako nauczyciel, chcę mieć dostęp do historii swoich wygenerowanych testów, aby móc je pobrać ponownie.

Kryteria akceptacji:

Widok listy plików z paginacją i wyszukiwarką.

Struktura folderów: Przedmiot/Rodzaj/Data/Nazwa.

Możliwość pobrania pojedynczego pliku lub paczki ZIP (bulk download).

Opcja miękkiego usuwania plików z listy.

ID: US-009

Tytuł: Kopia zapasowa danych

Opis: Jako użytkownik, chcę pobrać kopię zapasową bazy, aby nie stracić historii moich materiałów przy reinstalacji systemu.

Kryteria akceptacji:

Przycisk w ustawieniach do ręcznego generowania backupu .zip.

Automatyczne tworzenie kopii bazy SQLite co 24h.

Możliwość wgrania pliku backupu w celu przywrócenia danych.

6. Metryki sukcesu
Współczynnik akceptacji prototypu: mierzony jako średnia liczba poprawek (iteracji w pętli AI) przed wygenerowaniem finalnego DOCX. Cel: < 1.5 iteracji na dokument.

Stabilność systemu: 0 błędów krytycznych typu crash kontenera Docker podczas procesowania plików Vision.

Efektywność czasu: skrócenie czasu przygotowania sprawdzianu z 2 wariantami z średnio 45 minut do 10 minut (wliczając weryfikację).

Retencja danych: 100% poprawności przywracania danych z codziennych kopii zapasowych w testach diagnostycznych.