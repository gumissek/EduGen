# Instrukcja uruchomienia aplikacji EduGen

Niniejsza instrukcja przeprowadzi Cię przez proces uruchomienia aplikacji EduGen krok po kroku. Nie musisz mieć wiedzy technicznej – wystarczy postępować zgodnie z poniższymi wskazówkami.

---

## Spis treści

1. [Co będzie potrzebne](#1-co-będzie-potrzebne)
2. [Krok 1 – Instalacja Docker Desktop](#krok-1--instalacja-docker-desktop)
3. [Krok 2 – Konfiguracja aplikacji](#krok-2--konfiguracja-aplikacji)
4. [Krok 3 – Uruchomienie aplikacji](#krok-3--uruchomienie-aplikacji)
5. [Jak zatrzymać aplikację](#jak-zatrzymać-aplikację)
6. [Rozwiązywanie problemów](#rozwiązywanie-problemów)

---

## 1. Co będzie potrzebne

- Komputer z systemem **Windows 10/11**, **macOS** lub **Linux**
- Połączenie z Internetem 
- Plik konfiguracyjny **`.env`** dostarczony przez administratora

---

## Krok 1 – Instalacja Docker Desktop

Docker Desktop to program, który pozwala uruchamiać aplikacje w izolowanych kontenerach. Dzięki niemu nie musisz nic instalować ręcznie – wszystko dzieje się automatycznie.

### Windows

1. Wejdź na stronę: **https://www.docker.com/products/docker-desktop/**
2. Kliknij przycisk **„Download for Windows"**
3. Uruchom pobrany plik instalacyjny i postępuj zgodnie z instrukcjami
4. Po instalacji uruchom **Docker Desktop** z menu Start
5. Poczekaj, aż ikona wieloryba 🐋 w zasobniku systemowym (prawy dolny róg ekranu) przestanie się animować – oznacza to, że Docker jest gotowy

### macOS

1. Wejdź na stronę: **https://www.docker.com/products/docker-desktop/**
2. Kliknij **„Download for Mac"** (wybierz wersję odpowiednią dla swojego procesora: Intel lub Apple Silicon)
3. Otwórz pobrany plik `.dmg` i przeciągnij Docker do folderu Aplikacje
4. Uruchom **Docker Desktop** z folderu Aplikacje
5. Poczekaj, aż ikona wieloryba 🐋 na pasku menu przestanie się animować

### Linux

1. Wejdź na stronę: **https://docs.docker.com/desktop/install/linux/**
2. Postępuj zgodnie z instrukcją odpowiednią dla swojej dystrybucji
3. Uruchom Docker Desktop po instalacji

---

## Krok 2 – Uruchomienie aplikacji

### Windows

1. Upewnij się, że **Docker Desktop jest uruchomiony** (ikona wieloryba w zasobniku)
2. Przejdź do folderu **EduGen**
3. Kliknij dwukrotnie plik **`start_windows.bat`**
4. Pojawi się okno konsoli – poczekaj, aż zobaczysz komunikat o pomyślnym uruchomieniu
5. Po 5 sekundach **przeglądarka otworzy się automatycznie** pod adresem http://localhost:3000

> Pierwsze uruchomienie może trwać **od 5 do 15 minut** – trwa pobieranie i budowanie składników aplikacji. Kolejne uruchomienia będą dużo szybsze.

### macOS / Linux

1. Upewnij się, że **Docker Desktop jest uruchomiony**
   - Na macOS skrypt spróbuje uruchomić Docker Desktop automatycznie, jeśli nie jest aktywny
2. Otwórz aplikację **Terminal**
   - macOS: `Finder → Aplikacje → Narzędzia → Terminal`
   - lub wyszukaj „Terminal" przez Spotlight (⌘ + Spacja)
3. **Tylko przy pierwszym użyciu** – nadaj skryptowi uprawnienia do uruchamiania (wpisz i naciśnij Enter):

```bash
cd ~/Desktop/EduGen
chmod +x start_mac_linux.sh
```

4. Uruchom aplikację:

```bash
bash start_mac_linux.sh
```

5. Poczekaj na komunikat o pomyślnym uruchomieniu – **przeglądarka otworzy się automatycznie** pod adresem http://localhost:3000

---

## Jak zatrzymać aplikację

### Windows

1. Otwórz folder **EduGen**
2. Kliknij prawym przyciskiem myszy w pustym miejscu, przytrzymując **Shift**, i wybierz **„Otwórz okno PowerShell tutaj"** (lub **„Otwórz terminal tutaj"**)
3. Wpisz:

```
docker compose down
```

4. Naciśnij **Enter**

### macOS / Linux

1. Otwórz **Terminal**
2. Przejdź do folderu EduGen:

```bash
cd ~/Desktop/EduGen
```

3. Wpisz:

```bash
docker compose down
```

---

## Rozwiązywanie problemów

### „Docker nie jest zainstalowany"

Upewnij się, że poprawnie zainstalowałeś Docker Desktop zgodnie z [Krokiem 1](#krok-1--instalacja-docker-desktop). Po instalacji zrestartuj komputer i spróbuj ponownie.

### „Docker Desktop nie jest uruchomiony"

Uruchom Docker Desktop z menu Start (Windows) lub z folderu Aplikacje (macOS) i poczekaj, aż ikona wieloryba przestanie się animować.

### „Brak pliku konfiguracyjnego backend/.env"

Skontaktuj się z administratorem aplikacji i poproś o plik `.env`.

### Aplikacja nie otwiera się w przeglądarce

- Poczekaj chwilę – skrypt automatycznie otworzy przeglądarkę po 5 sekundach od uruchomienia
- Jeśli przeglądarka nie otworzyła się sama, wejdź ręcznie pod adres: **http://localhost:3000**
- Przy pierwszym uruchomieniu odczekaj 1–2 minuty – aplikacja może jeszcze się inicjalizować
- Sprawdź, czy skrypt startowy zakończył się komunikatem o sukcesie

### Inne problemy

Skontaktuj się z administratorem aplikacji i przekaż mu treść komunikatów błędów wyświetlonych w oknie konsoli.

---

*Wersja instrukcji: 1.0 | EduGen*
