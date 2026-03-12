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
    REMOTE_VERSION=$(curl -fsSL "$REMOTE_VERSION_URL" 2>/dev/null | grep "^VERSION=" | cut -d'=' -f2 || echo "")
elif command -v wget &>/dev/null; then
    REMOTE_VERSION=$(wget -qO- "$REMOTE_VERSION_URL" 2>/dev/null | grep "^VERSION=" | cut -d'=' -f2 || echo "")
else
    echo "[UWAGA] Brak narzedzia curl/wget - pomijam sprawdzanie aktualizacji."
    echo ""
    exit 0
fi

if [ -z "$REMOTE_VERSION" ]; then
    echo "[UWAGA] Nie mozna odczytac zdalnej wersji z pobranego pliku."
    echo "Sprawdz polaczenie z internetem lub dostepnosc pliku na: $REPO_URL ($MASTER_BRANCH)."
    echo ""
    exit 0
fi

echo "Lokalna wersja:  $LOCAL_VERSION"
echo "Zdalna wersja:   $REMOTE_VERSION"
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

    # [ZMIANA 1] Sprawdzenie czy sa niezatwierdzone zmiany przed wykonaniem pull
    if [ -n "$(git status --porcelain)" ]; then
        echo "[BLAD] Wykryto lokalne zmiany w plikach projektu."
        echo "[BLAD] Automatyczna aktualizacja zostala przerwana, aby nie nadpisac Twojej pracy."
        echo ""
        exit 0
    fi

    # [ZMIANA 2] Uzycie standardowego 'origin master' zamiast bezposredniego linku
    echo "Pobieranie aktualizacji z galezi $MASTER_BRANCH..."
    if git pull origin "$MASTER_BRANCH"; then
        echo ""
        echo "[OK] Aktualizacja zakonczona sukcesem. Uruchom aplikacje ponownie, aby zastosowac zmiany."
    else
        echo ""
        echo "[BLAD] Nie udalo sie wykonac automatycznej aktualizacji (Sprawdz logi gita powyzej)."
    fi
else
    echo "[UWAGA] Pominieto aktualizacje."
fi
echo ""
exit 0