# Instrukcja uruchomienia aplikacji EduGen

**EduGen** to platforma oparta na sztucznej inteligencji, pomagająca nauczycielom i edukatorom w automatycznym generowaniu materiałów dydaktycznych (m.in. testów, sprawdzianów, quizów) na bazie wgranych dokumentów.

Poniższa instrukcja krok po kroku wyjaśnia, jak uruchomić aplikację na własnym komputerze. Nie jest wymagana wiedza programistyczna – wystarczy postępować zgodnie z poniższymi punktami.

---

## Spis treści

1. [Wymagania wstępne](#1-wymagania-wstępne)
2. [Krok 1 – Pobieranie aplikacji i instalacja Git](#krok-1--pobieranie-aplikacji-i-instalacja-git)
3. [Krok 2 – Instalacja Docker Desktop](#krok-2--instalacja-docker-desktop)
4. [Krok 3 – Przygotowanie pliku konfiguracyjnego](#krok-3--przygotowanie-pliku-konfiguracyjnego)
5. [Krok 4 – Uruchomienie aplikacji](#krok-4--uruchomienie-aplikacji)
6. [Krok 5 – Rejestracja i logowanie](#krok-5--rejestracja-i-logowanie)
7. [Skrypty uruchamiania i aktualizacji](#skrypty-uruchamiania-i-aktualizacji)
8. [Zatrzymywanie aplikacji](#zatrzymywanie-aplikacji)
9. [Rozwiązywanie problemów](#rozwiązywanie-problemów)

---

## 1. Wymagania wstępne

Aby móc uruchomić aplikację EduGen, upewnij się, że posiadasz:
- Komputer z systemem **Windows 10/11**, **macOS** lub **Linux**.
- Stabilne połączenie z Internetem (niezbędne do komunikacji z modelami AI).
- Opcjonalnie plik konfiguracyjny **`.env`** z własnym kluczem API OpenRouter (jeśli nie posiadasz, skrypty startowe automatycznie wygenerują plik domyślny na podstawie szablonu `.env` — jednak do generowania materiałów konieczne jest dodanie własnego klucza API w panelu **Ustawienia**).

---

## Krok 1 – Pobieranie aplikacji i instalacja Git

Aplikacja znajduje się w repozytorium, które należy skopiować na swój komputer. W tym celu używamy programu **Git**.

### 1. Instalacja Git

- **Windows:** Wejdź na stronę [https://git-scm.com/download/win](https://git-scm.com/download/win) i pobierz instalator. Uruchom go i przejdź, klikając "Next" potwierdzając domyślne ustawienia, aż do zakończenia instalacji.
- **macOS:** W większości przypadków Git jest dostępny od razu asystent zapyta o jego włączenie, jeśli spróbujesz użyć go w konsoli. Możesz również wymusić instalację narzędzi przez wpisanie polecenia wewnątrz programu **Terminal**: `xcode-select --install`. 
- **Linux:** Otwórz terminal i użyj swojego menedżera pakietów (np. dla systemu Ubuntu/Debian wpisz ostatecznie `sudo apt-get update && sudo apt-get install git`).

### 2. Pobieranie repozytorium (plików aplikacji)

Po poprawnej instalacji programu Git:
1. Wejdź na obszar roboczy, gdzie ma pojawić się projekt (np. Pulpit).
2. Otwórz dla tego miejsca narzędzie wiersza poleceń na Windows lub program **Terminal** na Mac/Linux.
3. Skopiuj umieszczoną niżej komendę z linkiem repozytorium z profilu EduGen, wklej w terminal, po czym potwierdź dając **Enter**:
```bash
git clone https://github.com/gumissek/EduGen.git
```
4. Na Twoim komputerze właśnie utworzył się folder `EduGen`.

### 3. Nadawanie uprawnień skryptowi (tylko na macOS i Linux)
Skrypty automatyzujące muszą otrzymać najpierw odpowiednie uprawnienia systemowe za nim będą mogły swobodnie wykonać swoją pracę ułatwiającą uruchomienie projektu bez Twojej specjalnej pomocy:
1. Wpisz polecenie wejścia do nowo wygenerowanego pobranego przed momentem folderu aplikacji (zależnie od tego gdzie pobierano folder we wcześniejszych instrukcjach np. jeśli zrzuciłeś pobieranie na Pulpit): 
```bash
cd ~/Desktop/EduGen
``` 
2. Mając otwartą sesję z wnętrza środowiska aplikacji nadaj skryptom potrzebne oprogramowaniu autoryzacje zezwalające wprost:
```bash
chmod +x start_mac_linux.sh run_tests_mac_linux.sh reset_images_volumes.sh launch_app.app/Contents/MacOS/launch_app hard_reset_app.app/Contents/MacOS/hard_reset_app
```

---

## Krok 2 – Instalacja Docker Desktop

Aplikacja Docker Desktop pozwala na uruchomienie wyizolowanego środowiska dla usługi EduGen na Twoim systemie w sposób bezpieczny, bez wpływu na inne pliki.

### Windows

1. Wejdź na stronę: **https://www.docker.com/products/docker-desktop/**
2. Kliknij przycisk **„Download for Windows"**.
3. Uruchom pobrany plik instalacyjny i postępuj zgodnie z instrukcjami instalatora na ekranie.
4. Po zakończeniu instalacji, uruchom program **Docker Desktop** z menu systemowego Start.
5. Zwróć uwagę na zasobnik systemowy w prawym dolnym rogu ekranu (obok zegara). Po uruchomieniu powinna pojawić się ikona aplikacji Docker. Wymagane jest odczekanie chwili, aż usługa zostanie w pełni załadowana (na początku może to zająć dłuższą chwilę).

### macOS

1. Wejdź na stronę: **https://www.docker.com/products/docker-desktop/**
2. Kliknij **„Download for Mac"**, wybierając odpowiednią wersję procesora ("Intel" lub nowsze "Apple Silicon / Mac with Apple chip").
3. Po pobraniu pliku `*.dmg`, otwórz go i postępując zgodnie z oknem, przeciągnij ikonę **Docker** do systemowego folderu **Aplikacje**.
4. Włącz aplikację **Docker Desktop** z Launchpada lub z folderu Aplikacje w oknie Finder.
5. Zaczekaj, aż na górnym pasku menu pojawi się ikona aplikacji. Oznacza to gotowość usługi do działania.

### Linux

1. Przejdź do oficjalnej dokumentacji instalacji: **https://docs.docker.com/desktop/install/linux/**
2. Zainstaluj Docker Desktop zgodnie ze szczegółową instrukcją dedykowaną dla Twojej konkretnej dystrybucji systemu operacyjnego Linux.

---

## Krok 3 – Przygotowanie pliku konfiguracyjnego

Aplikacja wymaga pliku konfiguracyjnego `.env` do połączenia z usługami AI oraz konfiguracji bazy danych i JWT.

**Opcja A – Automatyczne tworzenie (zalecane dla nowych użytkowników):**
Skrypty startowe (`start_windows.bat` / `start_mac_linux.sh`) automatycznie wykrywają brak pliku `.env` i tworzą go z szablonu `.env.example` znajdującego się w głównym folderze projektu. Po uruchomieniu aplikacji wejdź w **Ustawienia** i dodaj własny klucz API **OpenRouter** (uzyskany na [openrouter.ai](https://openrouter.ai)), bez którego generowanie materiałów nie będzie możliwe. Wygeneruj także unikalne `POSTGRES_PASSWORD` oraz `JWT_SECRET_KEY`.

**Opcja B – Ręczna instalacja:**
1. Znajdź główny folder projektu **EduGen** na swoim urządzeniu.
2. Skopiuj plik **`.env.example`** w głównym katalogu projektu i zmień jego nazwę na **`.env`**.
3. Otwórz plik `.env` w edytorze tekstowym, zmień `POSTGRES_PASSWORD` na bezpieczne oraz wygeneruj unikalny 64-znakowy ciąg dla `JWT_SECRET_KEY`. Klucz API OpenRouter dodasz po uruchomieniu aplikacji w panelu **Ustawienia**.

> Jeśli port PostgreSQL `5432` jest zajęty przez inną aplikację na komputerze (często lokalny PostgreSQL), ustaw w `.env` zmienną `POSTGRES_HOST_PORT` na wolny port, np. `55432`.

---

## Krok 4 – Uruchomienie aplikacji

Mając weryfikację gotowego środowiska Docker oraz poprawne przeniesienie pliku konfiguracyjnego, możesz uruchomić program EduGen.

### Komputery Windows

1. Upewnij się, że program **Docker Desktop jest stale włączony** w tle.
2. Wejdź do głównego folderu **EduGen**.
3. Dwukrotnie kliknij plik uruchomieniowy o nazwie **`start_windows.bat`**.
4. Otworzy się okno konsoli, które automatycznie:
   - sprawdzi dostępność aktualizacji (`check_update.bat`),
   - zweryfikuje poprawność instalacji i działania Docker Desktop,
   - utworzy plik `.env` z szablonu `.env.example`, jeśli go brakuje,
   - zbuduje i uruchomi kontenery poleceniem `docker compose up --build`.
5. Przeglądarka otworzy się automatycznie po **15 sekundach** od uruchomienia skryptu pod adresem **http://localhost:3000**. Jeśli tak się nie stanie, wpisz adres ręcznie. Backend działa pod adresem **http://localhost:8000**.

> **Ważne:** Pierwsze uruchomienie aplikacji zajmuje znacznie więcej czasu ze względu na potrzebę ściągnięcia obrazów instalacyjnych z Internetu (w zależności od przepustowości pobierania nierzadko proces wymaga nawet kilkunastu minut). Następne uruchomienia sprowadzać się będą zaledwie do kilkunastu sekund.

### Komputery macOS / Linux

1. Upewnij się, że narzędzie **Docker Desktop jest włączone**.

Dostępne są dwie metody uruchomienia – wybierz tę wygodniejszą dla siebie:

#### Metoda A – Dwukrotne kliknięcie (zalecana dla macOS)

> Wyłącznie dla **macOS** (nie działa na Linuxie).

1. Wejdź do folderu **EduGen** w Finderze.
2. Dwukrotnie kliknij plik **`launch_app.app`**.
3. Jeśli macOS zapyta o zezwolenie na uruchomienie, potwierdź. Skrypt automatycznie przejdzie do odpowiedniego katalogu i wywoła `start_mac_linux.sh`.
4. Otworzy się okno terminala, a przeglądarka uruchomi się automatycznie po **15 sekundach** od uruchomienia skryptu pod adresem **http://localhost:3000**.

> **Uwaga:** Jeśli system macOS blokuje uruchomienie aplikacji, nadaj uprawnienia wykonywania zgodnie z Krokiem 1 punkt 3 (dla `launch_app.app/Contents/MacOS/launch_app`) i uruchom ponownie.

#### Metoda B – Terminal (macOS i Linux)

1. Otwórz systemowy program **Terminal** (na Macu najszybciej znajdziesz go wpisując `Terminal` po wciśnięciu `⌘ Cmd + Spacja`).
2. Przejdź do folderu projektu:
```bash
cd ~/Desktop/EduGen
```
3. Uruchom skrypt startowy:
```bash
bash start_mac_linux.sh
```
4. Skrypt automatycznie otworzy przeglądarkę po **15 sekundach** od uruchomienia skryptu pod adresem **http://localhost:3000**. Jeżeli tak się nie stanie, wpisz adres ręcznie.

---

## Krok 5 – Rejestracja i logowanie

Po otwarciu przeglądarki pod adresem **http://localhost:3000** zostaniesz przekierowany do ekranu logowania.

**Pierwsze uruchomienie — utwórz swoje konto:**
1. Kliknij link **„Zarejestruj się"** na stronie logowania.
2. Wypełnij formularz rejestracyjny: podaj **adres e-mail**, **imię**, **nazwisko** oraz **hasło** (potwierdzając je ponownie).
3. Po pomyślnej rejestracji zostaniesz automatycznie zalogowany i przekierowany do panelu głównego.

> Aplikacja obsługuje wielu niezależnych użytkowników. Każde konto posiada własne, odizolowane dane (przedmioty, pliki, wygenerowane materiały). Nie istnieje żadne domyślne hasło — każdy użytkownik samodzielnie tworzy swoje konto.

### Aktualny interfejs (UI)

- Dla użytkownika niezalogowanego i zalogowanego wyświetlane są **różne topbary** (zależnie od strefy aplikacji).
- W całej aplikacji widoczna jest wspólna **stopka** z logo i kontaktem.
- Na wybranych stronach (np. Materiały i Przedmioty) dostępny jest przycisk **„Odśwież stronę”**.

---

## Skrypty uruchamiania i aktualizacji

W głównym katalogu projektu dostępne są poniższe skrypty:

- **`start_windows.bat`** – standardowe uruchomienie aplikacji na Windows (Docker Compose). Jeśli wykryje istniejący stack Compose, usuwa go (`down --remove-orphans --rmi local`) i buduje aplikację od nowa. Gdy `docker compose up --build` zakończy się błędem (np. błąd kompilacji TypeScript), skrypt wyświetla czytelny komunikat diagnostyczny i kończy się kodem błędu zamiast pokazywać mylący komunikat o powodzeniu.
- **`check_update.bat`** – sprawdzenie i opcjonalna aktualizacja wersji na Windows.
- **`start_mac_linux.sh`** – standardowe uruchomienie aplikacji na macOS/Linux (Docker Compose). Jeśli wykryje istniejący stack Compose, usuwa go (`down --remove-orphans --rmi local`) i buduje aplikację od nowa. Gdy `docker compose up --build` zakończy się błędem (np. błąd kompilacji TypeScript), skrypt wyświetla czytelny komunikat diagnostyczny i kończy się oryginalnym kodem błędu.
- **`check_update.sh`** – sprawdzenie i opcjonalna aktualizacja wersji na macOS/Linux.
- **`dev_windows.bat`** – tryb deweloperski na Windows (backend i frontend w osobnych oknach, PostgreSQL lokalnie przez Docker jeśli dostępny). Przed startem synchronizuje `common_filles` z katalogu głównego do `backend/common_filles`. Uruchomienie backendu realizuje `backend/start_backend_dev.bat` (najpierw `init_app.py`, potem `uvicorn`) z czytelnym komunikatem błędu i kodem zakończenia.
- **`launch_app.app`** – launcher macOS uruchamiający w Terminalu skrypt `start_mac_linux.sh`.
- **`reset_images_volumes.bat`** – awaryjny hard reset na Windows. Najpierw zamyka cały stack z `docker-compose.yml` (jeśli istnieje), a następnie usuwa kontenery, obrazy i wolumeny Docker powiązane z EduGen po wymaganym potwierdzeniu (`USUN_DANE`).
- **`reset_images_volumes.sh`** – awaryjny hard reset na macOS/Linux. Najpierw zamyka cały stack z `docker-compose.yml` (jeśli istnieje), a następnie usuwa kontenery, obrazy i wolumeny Docker powiązane z EduGen po wymaganym potwierdzeniu (`USUN_DANE`).
- **`hard_reset_app.app`** – launcher macOS uruchamiający w Terminalu skrypt `reset_images_volumes.sh`.
- **`run_tests_windows.bat`** – ręczne uruchomienie testów backendu na Windows.
- **`run_tests_mac_linux.sh`** – ręczne uruchomienie testów backendu na macOS/Linux.

Przykład uruchomienia testów backendu z katalogu głównego projektu:

```bash
# macOS / Linux
bash run_tests_mac_linux.sh
```

```bat
:: Windows
run_tests_windows.bat
```

> **Ważne:** Skrypty aktualizacji (`check_update.bat` i `check_update.sh`) są automatycznie wywoływane przez skrypty startowe tylko na gałęzi **master**. Jeśli pracujesz na innej gałęzi, uruchamianie aplikacji jest kontynuowane bez sprawdzania aktualizacji.

---

## Zatrzymywanie aplikacji

Aplikacja pozostaje uruchomiona w tle tak długo, jak aktywne jest okno konsoli terminala. Krok jej bezproblemowego zatrzymania po zakończeniu pracy należy wdrożyć według wytycznych poniżej. Pomyślne zatrzymywanie procesów zachowuje pełną sprawność procesora RAM dla Twojego sprzętu podczas zakończenia projektów na daną sesję roboczą platformy.

### Komputery Windows:
1. Przejdź z powrotem do użytego wcześniej, otwartego wiersza poleceń (konsoli) wewnątrz którego załadowany został i uruchomiony plik **`start_windows.bat`**.
2. Na klawiaturze naciśnij jednocześnie klawisze **CTRL + C**.
3. Gdy konsola zapyta o potwierdzenie procedury zamknięcia ("Przerwanie działania skryptu wsadowego? / Terminate batch job?") wpisz w pole konsoli wiersza na znak **T** (lub **Y** w zależności od języka systemu) i zaakceptuj wciskając **Enter**. Skrypt samodzielnie zatrzyma aplikację.

### Komputery macOS / Linux:
1. Przełącz do otwartego okna **Terminal**, w którym działa **`start_mac_linux.sh`** lub **`launch_app.app`**.
2. Na klawiaturze naciśnij jednocześnie klawisze **CTRL + C**.
3. Skrypt zawiera wbudowaną obsługę sygnału (`trap`), która automatycznie wywoła `docker compose down` i zatrzyma wszystkie kontenery bez potrzeby dodatkowego potwierdzenia.

---

## Rozwiązywanie problemów

Jeśli napotkasz błędy podczas uruchomienia, zapoznaj się z listą najczęstszych usterek:

### „Docker nie jest zainstalowany"
Aplikacja EduGen wymaga do poprawnego działania środowiska Docker. Upewnij się, że Docker Desktop jest zainstalowany i działa poprawnie. Jeśli nie jest zainstalowany, zainstaluj go i spróbuj ponownie.

### „Docker Desktop nie jest uruchomiony"
Aplikacja EduGen wymaga do poprawnego działania aktywnego środowiska Docker. Upewnij się, że Docker Desktop jest uruchomiony i działa poprawnie. Jeśli nie jest uruchomiony, uruchom go i spróbuj ponownie.

### Komunikat z brakiem pliku konfiguracyjnego .env
Skrypty startowe automatycznie tworzą plik `.env` z szablonu `.env.example`, jeśli go brakuje. Jeżeli mimo to pojawi się błąd, upewnij się, że plik `.env.example` znajduje się w głównym folderze projektu EduGen. Pamiętaj, że klucz API **OpenRouter** można dodać w panelu **Ustawienia** po pierwszym zalogowaniu, aby móc generować materiały. Należy też zmienić domyślne hasła dla bazy danych i JWT.

### Strona WWW nie odpowiada i generuje się w nieskończoność 
- Początkowe uruchomienie aplikacji może trwać dłużej ze względu na potrzebę pobrania obrazów instalacyjnych z Internetu. Poczekaj cierpliwie, aż proces się zakończy.
- Upewnij się, że wpisujesz poprawny adres URL w przeglądarce: **http://localhost:3000**. Sprawdź, czy nie ma literówek i czy nie próbujesz połączyć się przez HTTPS.
- Sprawdź komunikaty w oknie konsoli, aby zidentyfikować problem. Jeśli widzisz błędy, zrób zrzut ekranu i skontaktuj się z pod adresem email: **bilinski.piotr89@gmail.com**.

### Błąd „Ports are not available” dla `5432`
- Oznacza to konflikt: port `5432` jest już zajęty na hoście.
- W pliku `.env` ustaw `POSTGRES_HOST_PORT=55432` (lub inny wolny port) i uruchom aplikację ponownie.
- Skrypt `start_mac_linux.sh` próbuje automatycznie dobrać wolny port hosta PostgreSQL, ale ustawienie ręczne w `.env` ma pierwszeństwo.

### Błąd kompilacji podczas `docker compose up --build` (np. TypeScript)
- Jeśli build kontenera zakończy się błędem, skrypty startowe wypiszą teraz blok diagnostyczny zamiast komunikatu sugerującego sukces.
- Kluczowe jest znalezienie **pierwszego** błędu w logach (najczęściej wskazany plik i linia, np. w frontendzie).
- Po poprawce kodu uruchom skrypt startowy ponownie.

### Nic nie pomaga? Ostateczność: hard reset danych Docker
- Jeśli żadne kroki z tej sekcji nie pomagają, możesz użyć skryptu hard reset:
   - Windows: `reset_images_volumes.bat`
   - macOS/Linux: `reset_images_volumes.sh`
   - macOS (UI): `hard_reset_app.app`
- Skrypt wyświetla czerwony alert i wymaga wpisania potwierdzenia `USUN_DANE`.
- **To działanie jest nieodwracalne**: skrypt najpierw zamyka cały stack z `docker-compose.yml`, a następnie usuwa wolumeny i obrazy Docker projektu EduGen, co oznacza **całkowitą utratę danych**, w tym bazy PostgreSQL.
- Po hard resecie aplikacja uruchomi się jak świeża instalacja i trzeba będzie ponownie utworzyć konto oraz dane.
