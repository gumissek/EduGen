#!/usr/bin/env bash
set -euo pipefail

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

# Budowanie i uruchamianie kontenerow
docker compose up --build -d

echo ""
echo "============================================"
echo "  Aplikacja zostala uruchomiona pomyslnie!"
echo "============================================"
echo ""
echo "  Frontend (interfejs):  http://localhost:3000"
echo "  Backend  (API):        http://localhost:8000"
echo ""

echo "Otwieranie aplikacji w przegladarce za 5 sekund..."
sleep 5

if [[ "$(uname)" == "Darwin" ]]; then
    open "http://localhost:3000"
else
    xdg-open "http://localhost:3000" &>/dev/null || true
fi

echo ""
echo "============================================"
echo "        Jak zamknac aplikacje"
echo "============================================"
echo ""

echo "Jesli aplikacja jest uruchomiona w tym oknie terminala,"
echo "mozesz ja zatrzymac naciskajac:"
echo ""
echo "  CTRL + C"
echo ""

echo "Aby zatrzymac aplikacje i usunac kontenery:"
echo ""
echo "  docker compose down"
echo ""

echo "Jesli chcesz dodatkowo usunac wolumeny (np. baze danych):"
echo ""
echo "  docker compose down -v"
echo ""

echo "Jesli aplikacja byla uruchomiona przez ten skrypt,"
echo "wystarczy otworzyc terminal w folderze projektu"
echo "i wpisac jedna z powyzszych komend."
echo ""