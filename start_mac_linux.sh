#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

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

DOCKER_COMPOSE_CMD=""
if docker compose version &>/dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose &>/dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo "[BLAD] Brak polecenia docker compose oraz docker-compose."
    echo "Zainstaluj plugin compose lub docker-compose i uruchom skrypt ponownie."
    echo ""
    exit 1
fi

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

POSTGRES_PORT="$(grep -E '^POSTGRES_PORT=' .env 2>/dev/null | head -n1 | cut -d'=' -f2 || true)"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_HOST_PORT="$(grep -E '^POSTGRES_HOST_PORT=' .env 2>/dev/null | head -n1 | cut -d'=' -f2 || true)"
POSTGRES_HOST_PORT="${POSTGRES_HOST_PORT:-${POSTGRES_PORT}}"

is_port_busy() {
    local port="$1"
    if command -v lsof &>/dev/null; then
        lsof -iTCP:"${port}" -sTCP:LISTEN -n -P &>/dev/null && return 0
    fi
    # Fallback: nc is always available on macOS/Linux
    if command -v nc &>/dev/null; then
        nc -z 127.0.0.1 "${port}" &>/dev/null 2>&1
        return $?
    fi
    return 1
}

if is_port_busy "${POSTGRES_HOST_PORT}"; then
    echo "[UWAGA] Port ${POSTGRES_HOST_PORT} jest zajety na hoście."
    for candidate in 55432 55433 55434 55435 55436 55437 55438 55439 55440; do
        if ! is_port_busy "${candidate}"; then
            POSTGRES_HOST_PORT="${candidate}"
            echo "[INFO] Uzyje alternatywnego portu hosta dla PostgreSQL: ${POSTGRES_HOST_PORT}"
            break
        fi
    done

    if is_port_busy "${POSTGRES_HOST_PORT}"; then
        echo "[BLAD] Nie znaleziono wolnego portu PostgreSQL w zakresie 55432-55440."
        echo "Zwolnij port 5432 lub ustaw recznie POSTGRES_HOST_PORT w pliku .env."
        exit 1
    fi
    echo ""
fi

export POSTGRES_HOST_PORT

echo "[OK] Plik konfiguracyjny .env istnieje."
echo ""

if ! command -v pandoc &>/dev/null; then
    echo "[INFO] Pandoc nie jest dostepny w systemie hosta."
    echo "[INFO] To nie blokuje trybu Docker; wymagane zaleznosci eksportu sa obslugiwane przez kontenery."
    echo ""
fi

echo "Budowanie i uruchamianie aplikacji..."
echo "(Pierwsze uruchomienie moze trwac kilka minut - trwa pobieranie obrazow)"
echo ""

# ── Obsluga CTRL+C: zatrzymaj kontenery przy wyjsciu ─────────────────────────
trap 'echo ""; echo "Zatrzymywanie kontenerow..."; ${DOCKER_COMPOSE_CMD} down; exit 0' INT TERM

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
echo "  Baza danych:           localhost:${POSTGRES_HOST_PORT}"
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
printf "${CYAN}  localhost:${POSTGRES_HOST_PORT}  (PostgreSQL)${NC}\n"
echo ""

# Uruchamianie w trybie interaktywnym (CTRL+C zatrzyma kontenery)
${DOCKER_COMPOSE_CMD} up --build

echo ""
echo "============================================"
echo "  Aplikacja zostala zatrzymana."
echo "============================================"
echo ""

echo "Nacisnij Enter, aby zamknac to okno..."
read -r