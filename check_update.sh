#!/usr/bin/env bash
# Celowo bez set -e - bledy sa obsługiwane recznie, aby nie zamykac terminala

REPO_URL="https://github.com/gumissek/EduGen"
REMOTE_VERSION_URL="https://raw.githubusercontent.com/gumissek/EduGen/master/.version"
MASTER_BRANCH="master"

echo "============================================"
echo "  Sprawdzanie aktualizacji aplikacji..."
echo "============================================"
echo ""

# Odczytaj lokalna wersje z pliku .version
LOCAL_VERSION="unknown"
if [ -f ".version" ]; then
    LOCAL_VERSION=$(grep "^VERSION=" .version | cut -d'=' -f2 || echo "unknown")
fi

echo "Pobieranie informacji o repozytorium..."
REMOTE_VERSION=""
if command -v curl &>/dev/null; then
    REMOTE_VERSION=$(curl -fsSL "$REMOTE_VERSION_URL" 2>/dev/null | grep "^VERSION=" | cut -d'=' -f2 || true)
elif command -v wget &>/dev/null; then
    REMOTE_VERSION=$(wget -qO- "$REMOTE_VERSION_URL" 2>/dev/null | grep "^VERSION=" | cut -d'=' -f2 || true)
else
    echo "[UWAGA] Brak narzedzia curl/wget - pomijam sprawdzanie aktualizacji."
    echo ""
    exit 0
fi

if [ -z "$REMOTE_VERSION" ]; then
    echo "[UWAGA] Nie mozna pobrac pliku .version z: $REPO_URL ($MASTER_BRANCH)."
    echo ""
    echo ""
    exit 0
fi

echo "Lokalna wersja:  $LOCAL_VERSION"
echo "Zdalna wersja:   $REMOTE_VERSION"
echo "Zrodlo:          $REPO_URL ($MASTER_BRANCH)"
echo ""

if [ "$LOCAL_VERSION" = "$REMOTE_VERSION" ]; then
    echo "[OK] Masz najnowsza wersje aplikacji ($LOCAL_VERSION)."
    echo ""
    exit 0
fi

echo "[INFO] Dostepna jest nowa wersja aplikacji!"
echo "       Zainstalowana: $LOCAL_VERSION"
echo "       Dostepna:      $REMOTE_VERSION"
echo ""

read -p "Czy chcesz pobrac i zainstalowac nowa wersje? (T/n): " confirm
confirm=${confirm:-T}

if [[ "$confirm" =~ ^[Tt]$ ]]; then
    if ! command -v git &>/dev/null; then
        echo "[UWAGA] Git nie jest zainstalowany. Nie moge wykonac automatycznej aktualizacji."
        echo ""
        exit 0
    fi

    if ! git rev-parse --git-dir &>/dev/null; then
        echo "[UWAGA] Katalog nie jest repozytorium git - wykonaj aktualizacje recznie."
        echo ""
        exit 0
    fi

    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
    if [ "$CURRENT_BRANCH" != "$MASTER_BRANCH" ]; then
        echo "[UWAGA] Jestes na galezi '$CURRENT_BRANCH'."
        echo "        Automatyczna aktualizacja obsluguje tylko galaz '$MASTER_BRANCH'."
        echo ""
        exit 0
    fi

    echo "Pobieranie aktualizacji z $REPO_URL ($MASTER_BRANCH)..."
    if git pull "$REPO_URL" "$MASTER_BRANCH"; then
        echo ""
        echo "[OK] Aktualizacja zakonczona. Uruchom aplikacje ponownie aby zastosowac zmiany."
    else
        echo ""
        echo "[UWAGA] Nie udalo sie wykonac automatycznej aktualizacji."
    fi
else
    echo "[UWAGA] Pominieto aktualizacje."
fi
echo ""
exit 0
