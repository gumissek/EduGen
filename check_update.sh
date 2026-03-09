#!/usr/bin/env bash
set -eo pipefail

echo "============================================"
echo "  Sprawdzanie aktualizacji aplikacji..."
echo "============================================"
echo ""

if ! command -v git &>/dev/null; then
    echo "[UWAGA] Git nie jest zainstalowany. Pomijam sprawdzanie aktualizacji."
    echo ""
    exit 0
fi

echo "Pobieranie informacji o repozytorium..."
if ! git fetch &>/dev/null; then
    echo "[UWAGA] Brak polaczenia z repozytorium lub brak uprawnien. Pomijam aktualizacje."
    echo ""
    exit 0
fi

BEHIND=$(git rev-list HEAD...@{u} --count 2>/dev/null || echo "0")

if [ "$BEHIND" -eq "0" ]; then
    echo "[OK] Masz najnowsza wersje aplikacji."
    echo ""
    exit 0
fi

echo "[INFO] Dostepna jest nowa wersja aplikacji (nowych zmian: $BEHIND)."
echo ""

read -p "Czy chcesz pobrac i zainstalowac nowa wersje? (T/n): " confirm
confirm=${confirm:-T}

if [[ "$confirm" =~ ^[Tt]$ ]]; then
    echo "Pobieranie aktualizacji..."
    git pull
    echo ""
    echo "[OK] Aktualizacja zakonczona."
else
    echo "[UWAGA] Pominielo aktualizacje."
fi
echo ""
exit 0
