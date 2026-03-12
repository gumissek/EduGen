#!/usr/bin/env bash
set -euo pipefail

# ── Sprawdzenie aktualnej gałęzi Git ─────────────────────────────────────────
# Używamy || echo "", aby zapobiec przerwaniu skryptu przez 'set -e', gdy nie ma repozytorium
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

if [ "$CURRENT_BRANCH" = "master" ]; then
    if [ -f "check_update.sh" ]; then
        bash check_update.sh || {
            echo "[UWAGA] Wystapil problem podczas sprawdzania aktualizacji. Kontynuuje uruchamianie aplikacji."
            echo ""
        }
    else
        echo "[UWAGA] Brak pliku check_update.sh - pomijam sprawdzanie aktualizacji."
        echo ""
    fi
else
    if [ -z "$CURRENT_BRANCH" ]; then
        echo "[UWAGA] Nie wykryto repozytorium Git (lub Git nie jest zainstalowany). Pomijam sprawdzanie aktualizacji."
    else
        echo "[INFO] Aktualna galaz to '$CURRENT_BRANCH' (nie 'master'). Pomijam sprawdzanie aktualizacji."
    fi
    echo ""
fi

echo "============================================"
echo "        EduGen - Uruchamianie aplikacji"
echo "============================================"
echo ""

# Sprawdz czy docker jest dostepny w PATH
if ! command -v docker &>/dev/null; then
    echo "[BLAD] Docker nie jest zainstalowany lub nie jest dodany do PATH."
    echo ""
    echo "Pobierz Docker Desktop ze strony: https://www.docker.com/products/docker-desktop/"
    echo "Po instalacji uruchom ponownie ten skrypt."
    echo ""
    exit 1
fi

# Sprawdz czy demon dockera dziala
if ! docker info &>/dev/null; then
    echo "[BLAD] Docker Desktop nie jest uruchomiony."
    echo ""

    # macOS
    if [[ "$(uname)" == "Darwin" ]]; then
        echo "Proba automatycznego uruchomienia Docker Desktop..."
        open -a Docker

        echo "Czekam na uruchomienie Docker Desktop (max 60 sekund)..."
        for i in $(seq 1 12); do
            sleep 5
            if docker info &>/dev/null; then
                echo "[OK] Docker Desktop uruchomiony."
                break
            fi
            echo "  Czekam... ($((i * 5))s)"
        done

        if ! docker info &>/dev/null; then
            echo ""
            echo "[BLAD] Docker Desktop nie uruchomil sie w oczekiwanym czasie."
            echo "Uruchom Docker Desktop recznie i sprobuj ponownie."
            exit 1
        fi

    else
        # Linux
        echo "Na systemie Linux uruchom:"
        echo "  sudo systemctl start docker"
        echo ""
        echo "Lub uruchom Docker Desktop recznie, a nastepnie sprobuj ponownie."
        exit 1
    fi
fi

echo "[OK] Docker Desktop jest zainstalowany i uruchomiony."
echo ""

# Sprawdz czy istnieje plik .env w glownym katalogu projektu
if [ ! -f ".env" ]; then
    echo "[UWAGA] Brak pliku konfiguracyjnego .env"
    echo ""
    if [ -f ".env.example" ]; then
        echo "Znaleziono plik .env.example - kopiowanie do .env..."
        cp ".env.example" ".env"
        echo "[OK] Plik .env zostal utworzony automatycznie z .env.example."
        echo "[WAZNE] Przed uruchomieniem uzupelnij .env o wlasne wartosci:"
        echo "        - POSTGRES_PASSWORD"
        echo "        - JWT_SECRET_KEY"
        echo ""
    else
        echo "[BLAD] Brak pliku .env.example w glownym katalogu projektu."
        echo "Pobierz ponownie projekt lub utworz plik .env recznie na podstawie dokumentacji."
        echo ""
        exit 1
    fi
fi

echo "[OK] Plik konfiguracyjny .env istnieje."
echo ""
echo "Budowanie i uruchamianie aplikacji..."
echo "(Pierwsze uruchomienie moze trwac kilka minut - trwa pobieranie obrazow)"
echo ""

# ── Obsluga CTRL+C: zatrzymaj kontenery przy wyjsciu ─────────────────────────
trap 'echo ""; echo "Zatrzymywanie kontenerow..."; docker compose down; exit 0' INT TERM

# ── Otworz przegladarke po 15 sekundach ─────────────────────────────────────
(
  sleep 15
  if [[ "$(uname)" == "Darwin" ]]; then
    open "http://localhost:3000"
  else
    xdg-open "http://localhost:3000" &>/dev/null || true
  fi
) &

echo ""
echo "============================================"
echo "  Aplikacja uruchamia sie - czekaj na logi"
echo "============================================"
echo ""
echo "  Frontend (interfejs):  http://localhost:3000"
echo "  Backend  (API):        http://localhost:8000"
echo ""

# Red stop instructions
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'
printf "${RED}============================================${NC}\n"
printf "${RED}  JAK WYLACZYC APLIKACJE:${NC}\n"
printf "${RED}  Nacisnij CTRL + C w tym terminalu.${NC}\n"
printf "${RED}  Kontenery zostana zatrzymane automatycznie.${NC}\n"
printf "${RED}============================================${NC}\n"
echo ""
printf "${CYAN}  Jezeli przeglądarka nie otworzyla sie automatycznie,${NC}\n"
printf "${CYAN}  odwiedz recznie ponizsze adresy:${NC}\n"
printf "${CYAN}  http://localhost:3000  (interfejs aplikacji)${NC}\n"
printf "${CYAN}  http://localhost:8000  (API backendu)${NC}\n"
echo ""

# Uruchamianie w trybie interaktywnym (CTRL+C zatrzyma kontenery)
docker compose up --build

echo ""
echo "============================================"
echo "  Aplikacja zostala zatrzymana."
echo "============================================"
echo ""

echo "Nacisnij Enter, aby zamknac to okno..."
read -r