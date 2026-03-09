#!/usr/bin/env bash
set -euo pipefail

bash check_update.sh || true

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

# Sprawdz czy istnieje plik .env backendu
if [ ! -f "backend/.env" ]; then
    echo "[UWAGA] Brak pliku konfiguracyjnego backend/.env"
    echo ""
    echo "Skopiuj plik backend/.env.example do backend/.env i uzupelnij dane."
    echo "Jesli nie masz pliku .env.example, skontaktuj sie z administratorem."
    echo ""
    exit 1
fi

echo "[OK] Plik konfiguracyjny backend/.env istnieje."
echo ""
echo "Budowanie i uruchamianie aplikacji..."
echo "(Pierwsze uruchomienie moze trwac kilka minut - trwa pobieranie obrazow)"
echo ""

# ── Obsluga CTRL+C: zatrzymaj kontenery przy wyjsciu ─────────────────────────
trap 'echo ""; echo "Zatrzymywanie kontenerow..."; docker compose down; exit 0' INT TERM

# ── Otworz przegladarke w tle po 15 sekundach ────────────────────────────────
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