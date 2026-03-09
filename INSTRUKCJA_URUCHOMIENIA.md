# Instrukcja uruchomienia aplikacji EduGen

**EduGen** to platforma oparta na sztucznej inteligencji, pomagająca nauczycielom i edukatorom w automatycznym generowaniu materiałów dydaktycznych (m.in. testów, sprawdzianów, quizów) na bazie wgranych dokumentów.

Poniższa instrukcja krok po kroku wyjaśnia, jak uruchomić aplikację na własnym komputerze. Nie jest wymagana wiedza programistyczna – wystarczy postępować zgodnie z poniższymi punktami.

---

## Spis treści

1. [Wymagania wstępne](#1-wymagania-wstępne)
2. [Krok 1 – Instalacja Docker Desktop](#krok-1--instalacja-docker-desktop)
3. [Krok 2 – Przygotowanie pliku konfiguracyjnego](#krok-2--przygotowanie-pliku-konfiguracyjnego)
4. [Krok 3 – Uruchomienie aplikacji](#krok-3--uruchomienie-aplikacji)
5. [Krok 4 – Logowanie](#krok-4--logowanie)
6. [Zatrzymywanie aplikacji](#zatrzymywanie-aplikacji)
7. [Rozwiązywanie problemów](#rozwiązywanie-problemów)

---

## 1. Wymagania wstępne

Aby móc uruchomić aplikację EduGen, upewnij się, że posiadasz:
- Komputer z systemem **Windows 10/11**, **macOS** lub **Linux**.
- Stabilne połączenie z Internetem (niezbędne do komunikacji z modelami AI).
- Plik konfiguracyjny o nazwie **`.env`**, dostarczony przez administratora systemu. Plik ten zawiera niezbędne klucze autoryzacyjne oraz zabezpieczenia.

---

## Krok 1 – Instalacja Docker Desktop

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

## Krok 2 – Przygotowanie pliku konfiguracyjnego

Przed uruchomieniem aplikacji musisz wgrać wspomniany we Wymaganiach Wstępnych plik wymiany `.env`, aby umożliwić jej bezproblemową komunikację z usługami AI.

1. Znajdź główny folder projektu **EduGen** na swoim urządzeniu.
2. Otwórz w nim folder o nazwie **`backend`**.
3. Skopiuj otrzymany wcześniej plik **`.env`** bezpośrednio do tego nowo otwartego folderu (zwróć uwagę, że nazwa zaczyna się od kropki). Bez niego środowisko nie uruchomi się poprawnie.

---

## Krok 3 – Uruchomienie aplikacji

Mając weryfikację gotowego środowiska Docker oraz poprawne przeniesienie pliku konfiguracyjnego, możesz uruchomić program EduGen.

### Komputery Windows

1. Upewnij się, że program **Docker Desktop jest stale włączony** w tle.
2. Wejdź do głównego folderu **EduGen**.
3. Dwukrotnie kliknij plik uruchomieniowy o nazwie **`start_windows.bat`**.
4. Otworzy się okno konsoli (terminal systemowy), wykonujący proces przygotowania usług w tle.
5. Jeżeli skrypt zadziała pozytywnie -  program automatycznie otworzy kartę przeglądarki z dostępnym adresem **http://localhost:3000** w ciągu około 15 sekund . Jeśli karta nie uruchomi się automatycznie, wklej wspomniany adres widoczny powyżej w swoją przeglądarkę internetową. Backend odpowiada pod lokalnym adresem **http://localhost:8000**.

> **Ważne:** Pierwsze uruchomienie aplikacji zajmuje znacznie więcej czasu ze względu na potrzebę ściągnięcia obrazów instalacyjnych z Internetu (w zależności od przepustowości pobierania nierzadko proces wymaga nawet kilkunastu minut). Następne uruchomienia sprowadzać się będą zaledwie do kilkunastu sekund.

### Komputery macOS / Linux

1. Upewnij się, że narzędzie **Docker Desktop jest włączone**.
2. Otwórz systemowy program **Terminal** (na Macu najszybciej znajdziesz go wpisując `Terminal` po wciśnięciu komendy narzędzia wyszukiwania - `⌘ Cmd + Spacja`).
3. Przejdź do pobranego folderu (poniższy przykład zakłada lokalizację na biurku), a następnie nadaj dokumentowi skryptowania odpowiednie uprawnienia zapisu:

```bash
cd ~/Desktop/EduGen
chmod +x start_mac_linux.sh
```

4. Uruchom skrypt serwerowy wprowadzając do paska komendę:

```bash
bash start_mac_linux.sh
```

5. Skrypt automatycznie otworzy nową stronę na przeglądarce po zakończeniu procesu po upływie chwili pod adresem **http://localhost:3000**. Jeżeli tak się nie stanie automatycznie, wystarczy wpisać adres URL do swojej przeglądarki.

---

## Krok 4 – Logowanie

Z chwilą zalogowania użytkownika na docelową platformę internetową pod wspomnianym adresem, Twoim oczom natychmiastowo zaoferuje się widok panelu autoryzacji. Pierwsze uruchomienie wymaga podania hasła startowego. Domyślne hasło to: **Start1234!**. Następnie trzeba je zmienić. 

---

## Zatrzymywanie aplikacji

Aplikacja pozostaje uruchomiona w tle tak długo, jak aktywne jest okno konsoli terminala. Krok jej bezproblemowego zatrzymania po zakończeniu pracy należy wdrożyć według wytycznych poniżej. Pomyślne zatrzymywanie procesów zachowuje pełną sprawność procesora RAM dla Twojego sprzętu podczas zakończenia projektów na daną sesję roboczą platformy.

### Komputery Windows:
1. Przejdź z powrotem do użytego wcześniej, otwartego wiersza poleceń ( konsoli ) wewnątrz którego załadowana został uruchomiony plik **`start_windows.bat`**.
2. Na klawiaturze naciśnij jednocześnie klawisze **CTRL + C**.
3. Gdy konsola zapyta o potwierdzenie procedury zamknięcia środowiskowego procesu wykonawczego pytaniem (Przerwanie działania skryptu wsadowego?) wpisz w dolnej podpowiedzi pole konsoli wiersza na znak **Y** i ostatecznie wciśnij akceptacją poleceniem **Enter**.

### Komputery macOS / Linux:
1. Przejdź z powrotem do otwartego okna **Terminal**.
2. Na klawiaturze naciśnij jednocześnie i przytrzymaj klawisze **CTRL + C**.
3. Gdy konsola zapyta o potwierdzenie procedury zamknięcia wpisz w dolnej podpowiedzi pole konsoli wiersza na znak **Y** i ostatecznie wciśnij akceptacją poleceniem **Enter**.
---

## Rozwiązywanie problemów

Jeśli napotkasz błędy podczas uruchomienia, zapoznaj się z listą najczęstszych usterek:

### „Docker nie jest zainstalowany"
Aplikacja EduGen wymaga do poprawnego działania środowiska Docker. Upewnij się, że Docker Desktop jest zainstalowany i działa poprawnie. Jeśli nie jest zainstalowany, zainstaluj go i spróbuj ponownie.

### „Docker Desktop nie jest uruchomiony"
Aplikacja EduGen wymaga do poprawnego działania aktywnego środowiska Docker. Upewnij się, że Docker Desktop jest uruchomiony i działa poprawnie. Jeśli nie jest uruchomiony, uruchom go i spróbuj ponownie.

### Komunikat z brakiem pliku konfiguracyjnego backend/.env
Aplikacja EduGen wymaga do poprawnego działania pliku konfiguracyjnego backend/.env. Upewnij się, że plik jest poprawnie umieszczony w folderze backend. Jeśli nie jest, umieść go tam i spróbuj ponownie.

### Strona WWW nie odpowiada i generuje się w nieskończoność 
- Początkowe uruchomienie aplikacji może trwać dłużej ze względu na potrzebę pobrania obrazów instalacyjnych z Internetu. Poczekaj cierpliwie, aż proces się zakończy.
- Upewnij się, że wpisujesz poprawny adres URL w przeglądarce: **http://localhost:3000**. Sprawdź, czy nie ma literówek i czy nie próbujesz połączyć się przez HTTPS.
- Sprawdź komunikaty w oknie konsoli, aby zidentyfikować problem. Jeśli widzisz błędy, zrób zrzut ekranu i skontaktuj się z administratorem.
