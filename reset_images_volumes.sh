#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

RED='\033[0;31m'
NC='\033[0m'

echo ""
printf "${RED}============================================${NC}\n"
printf "${RED}  UWAGA: NIEODWRACALNY HARD RESET DANYCH${NC}\n"
printf "${RED}============================================${NC}\n"
printf "${RED}Ta akcja USUNIE wszystkie wolumeny i obrazy Docker powiazane z EduGen.${NC}\n"
printf "${RED}Spowoduje to calkowita utrate danych aplikacji, w tym bazy PostgreSQL.${NC}\n"
printf "${RED}Operacji nie da sie cofnac.${NC}\n"
echo ""

echo "Aby kontynuowac wpisz: USUN_DANE"
read -r -p "Potwierdzenie: " CONFIRM

if [[ "$CONFIRM" != "USUN_DANE" ]]; then
    echo ""
    echo "[INFO] Anulowano. Dane nie zostaly usuniete."
    exit 0
fi

if ! docker compose version >/dev/null 2>&1; then
    echo "[BLAD] Brak polecenia docker compose."
    echo "Zainstaluj Docker Desktop lub plugin Compose i sprobuj ponownie."
    exit 1
fi

echo ""
if docker compose -f docker-compose.yml ps -a -q 2>/dev/null | grep -q .; then
    echo "[INFO] Wykryto istniejacy stack z docker-compose.yml."
    echo "[INFO] Zatrzymywanie calego stacka aplikacji EduGen..."
    docker compose -f docker-compose.yml down --remove-orphans
else
    echo "[INFO] Nie wykryto uruchomionego stacka z docker-compose.yml."
fi

echo ""
echo "[INFO] Usuwanie kontenerow, wolumenow oraz obrazow projektu EduGen..."
docker compose -f docker-compose.yml down --volumes --rmi all --remove-orphans

echo ""
echo "[OK] Hard reset zakonczony."
echo "[OK] Wolumeny i obrazy Docker powiazane z EduGen zostaly usuniete."
echo "[INFO] Ponowne uruchomienie aplikacji utworzy czyste srodowisko i pusta baze danych."
