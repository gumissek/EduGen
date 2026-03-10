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
6. [Krok 5 – Logowanie](#krok-5--logowanie)
7. [Zatrzymywanie aplikacji](#zatrzymywanie-aplikacji)
8. [Rozwiązywanie problemów](#rozwiązywanie-problemów)

---

## 1. Wymagania wstępne

Aby móc uruchomić aplikację EduGen, upewnij się, że posiadasz:
- Komputer z systemem **Windows 10/11**, **macOS** lub **Linux**.
- Stabilne połączenie z Internetem (niezbędne do komunikacji z modelami AI).
- Opcjonalnie plik konfiguracyjny **`.env`** z własnym kluczem API OpenAI (jeśli nie posiadasz, skrypty startowe automatycznie wygenerują plik domyślny na podstawie szablonu `.config_backend` — jednak do generowania materiałów konieczne jest uzupełnienie klucza `OPENAI_API_KEY`).

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
chmod +x start_mac_linux.sh Uruchom_Mac.command
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

Aplikacja wymaga pliku konfiguracyjnego `backend/.env` do połączenia z usługami AI.

**Opcja A – Automatyczne tworzenie (zalecane dla nowych użytkowników):**
Skrypty startowe (`start_windows.bat` / `start_mac_linux.sh`) automatycznie wykrywają brak pliku `backend/.env` i tworzą go z szablonu `.config_backend` znajdującego się w głównym folderze projektu. Po uruchomieniu aplikacji wejdź w **Ustawienia** i wprowadź własny klucz **OPENAI_API_KEY**, bez którego generowanie materiałów nie będzie możliwe.

**Opcja B – Ręczna instalacja:**
1. Znajdź główny folder projektu **EduGen** na swoim urządzeniu.
2. Otwórz w nim folder o nazwie **`backend`**.
3. Skopiuj plik **`.config_backend`** z głównego katalogu projektu do folderu `backend` i zmień jego nazwę na **`.env`**.
4. Otwórz plik `.env` w edytorze tekstowym i uzupełnij wartość `OPENAI_API_KEY=` swoim kluczem API.

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
   - utworzy plik `backend/.env` z szablonu `.config_backend`, jeśli go brakuje,
   - zbuduje i uruchomi kontenery poleceniem `docker compose up --build`.
5. Przeglądarka otworzy się automatycznie po **15 sekundach** od uruchomienia skryptu pod adresem **http://localhost:3000**. Jeśli tak się nie stanie, wpisz adres ręcznie. Backend działa pod adresem **http://localhost:8000**.

> **Ważne:** Pierwsze uruchomienie aplikacji zajmuje znacznie więcej czasu ze względu na potrzebę ściągnięcia obrazów instalacyjnych z Internetu (w zależności od przepustowości pobierania nierzadko proces wymaga nawet kilkunastu minut). Następne uruchomienia sprowadzać się będą zaledwie do kilkunastu sekund.

### Komputery macOS / Linux

1. Upewnij się, że narzędzie **Docker Desktop jest włączone**.

Dostępne są dwie metody uruchomienia – wybierz tę wygodniejszą dla siebie:

#### Metoda A – Dwukrotne kliknięcie (zalecana dla macOS)

> Wyłącznie dla **macOS** (nie działa na Linuxie).

1. Wejdź do folderu **EduGen** w Finderze.
2. Dwukrotnie kliknij plik **`Uruchom_Mac.command`**.
3. Jeśli macOS zapyta o zezwolenie na uruchomienie, potwierdź. Skrypt automatycznie przejdzie do odpowiedniego katalogu i wywoła `start_mac_linux.sh`.
4. Otworzy się okno terminala, a przeglądarka uruchomi się automatycznie po **15 sekundach** od uruchomienia skryptu pod adresem **http://localhost:3000**.

> **Uwaga:** Plik `Uruchom_Mac.command` musi mieć nadane uprawnienia wykonywania (`chmod +x`) zgodnie z Krokiem 1 punkt 3, inaczej macOS odmówi uruchomienia.

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

## Krok 5 – Logowanie

Z chwilą zalogowania użytkownika na docelową platformę internetową pod wspomnianym adresem, Twoim oczom natychmiastowo zaoferuje się widok panelu autoryzacji. Pierwsze uruchomienie wymaga podania hasła startowego. Domyślne hasło to: **Start1234!**. Następnie trzeba je zmienić. 

---

## Zatrzymywanie aplikacji

Aplikacja pozostaje uruchomiona w tle tak długo, jak aktywne jest okno konsoli terminala. Krok jej bezproblemowego zatrzymania po zakończeniu pracy należy wdrożyć według wytycznych poniżej. Pomyślne zatrzymywanie procesów zachowuje pełną sprawność procesora RAM dla Twojego sprzętu podczas zakończenia projektów na daną sesję roboczą platformy.

### Komputery Windows:
1. Przejdź z powrotem do użytego wcześniej, otwartego wiersza poleceń (konsoli) wewnątrz którego załadowany został i uruchomiony plik **`start_windows.bat`**.
2. Na klawiaturze naciśnij jednocześnie klawisze **CTRL + C**.
3. Gdy konsola zapyta o potwierdzenie procedury zamknięcia środowiskowego procesu wykonawczego pytaniem ("Przerwanie działania skryptu wsadowego? / Terminate batch job?") wpisz w dolnej podpowiedzi pole konsoli wiersza na znak **T** (lub **Y** w zależności od języka systemu) i ostatecznie wciśnij akceptację poleceniem **Enter**. Skrypt samodzielnie zatrzyma wyodrębnione kontenery i bezpiecznie odłoży środowisko w stan wstrzymania.

### Komputery macOS / Linux:
1. Przełącz do otwartego okna **Terminal**, w którym działa **`start_mac_linux.sh`** lub **`Uruchom_Mac.command`**.
2. Na klawiaturze naciśnij jednocześnie klawisze **CTRL + C**.
3. Kontenery automatycznie rozpoczną się zatrzymywać dzięki obsłudze tzw. "trapa", informując w terminalu o rozpoczęciu domyślnego wyłączania procesu dla całych architektur aplikacji poprzez funkcje deweloperskie zachowujące pełną niezależność, np. _"Zatrzymywanie kontenerow..."_.

---

## Rozwiązywanie problemów

Jeśli napotkasz błędy podczas uruchomienia, zapoznaj się z listą najczęstszych usterek:

### „Docker nie jest zainstalowany"
Aplikacja EduGen wymaga do poprawnego działania środowiska Docker. Upewnij się, że Docker Desktop jest zainstalowany i działa poprawnie. Jeśli nie jest zainstalowany, zainstaluj go i spróbuj ponownie.

### „Docker Desktop nie jest uruchomiony"
Aplikacja EduGen wymaga do poprawnego działania aktywnego środowiska Docker. Upewnij się, że Docker Desktop jest uruchomiony i działa poprawnie. Jeśli nie jest uruchomiony, uruchom go i spróbuj ponownie.

### Komunikat z brakiem pliku konfiguracyjnego backend/.env
Skrypty startowe automatycznie tworzą plik `backend/.env` z szablonu `.config_backend`, jeśli go brakuje. Jeżeli mimo to pojawi się błąd, upewnij się, że plik `.config_backend` znajduje się w głównym folderze projektu EduGen. Pamiętaj, że klucz `OPENAI_API_KEY` w pliku `.env` musi być uzupełniony, aby móc korzystać z generowania materiałów.

### Strona WWW nie odpowiada i generuje się w nieskończoność 
- Początkowe uruchomienie aplikacji może trwać dłużej ze względu na potrzebę pobrania obrazów instalacyjnych z Internetu. Poczekaj cierpliwie, aż proces się zakończy.
- Upewnij się, że wpisujesz poprawny adres URL w przeglądarce: **http://localhost:3000**. Sprawdź, czy nie ma literówek i czy nie próbujesz połączyć się przez HTTPS.
- Sprawdź komunikaty w oknie konsoli, aby zidentyfikować problem. Jeśli widzisz błędy, zrób zrzut ekranu i skontaktuj się z administratorem.
