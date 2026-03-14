@echo off
setlocal EnableExtensions

pushd "%~dp0" >nul 2>&1
if errorlevel 1 (
    echo [BLAD] Nie mozna przejsc do katalogu projektu.
    pause
    exit /b 1
)

powershell -Command "Write-Host '' ; Write-Host '============================================' -ForegroundColor Red ; Write-Host '  UWAGA: NIEODWRACALNY HARD RESET DANYCH' -ForegroundColor Red ; Write-Host '============================================' -ForegroundColor Red ; Write-Host 'Ta akcja USUNIE wszystkie wolumeny i obrazy Docker powiazane z EduGen.' -ForegroundColor Red ; Write-Host 'Spowoduje to calkowita utrate danych aplikacji, w tym bazy PostgreSQL.' -ForegroundColor Red ; Write-Host 'Operacji nie da sie cofnac.' -ForegroundColor Red ; Write-Host ''"

echo Aby kontynuowac wpisz: USUN_DANE
set "CONFIRM="
set /p CONFIRM=Potwierdzenie: 

if /I not "%CONFIRM%"=="USUN_DANE" (
    echo.
    echo [INFO] Anulowano. Dane nie zostaly usuniete.
    popd
    pause
    exit /b 0
)

docker compose version >nul 2>&1
if errorlevel 1 (
    echo [BLAD] Brak polecenia docker compose.
    echo Zainstaluj Docker Desktop lub plugin Compose i sprobuj ponownie.
    popd
    pause
    exit /b 1
)

echo.
set "HAS_STACK="
for /f "delims=" %%i in ('docker compose -f docker-compose.yml ps -a -q 2^>nul') do set "HAS_STACK=1"

if defined HAS_STACK (
    echo [INFO] Wykryto istniejacy stack z docker-compose.yml.
    echo [INFO] Zatrzymywanie calego stacka aplikacji EduGen...
    docker compose -f docker-compose.yml down --remove-orphans
    if errorlevel 1 (
        echo.
        echo [BLAD] Nie udalo sie zatrzymac stacka Docker Compose.
        echo Sprawdz logi powyzej.
        popd
        pause
        exit /b 1
    )
) else (
    echo [INFO] Nie wykryto uruchomionego stacka z docker-compose.yml.
)

echo.
echo [INFO] Usuwanie kontenerow, wolumenow oraz obrazow projektu EduGen...
docker compose -f docker-compose.yml down --volumes --rmi all --remove-orphans
if errorlevel 1 (
    echo.
    echo [BLAD] Operacja nie powiodla sie. Sprawdz logi powyzej.
    popd
    pause
    exit /b 1
)

echo.
echo [OK] Hard reset zakonczony.
echo [OK] Wolumeny i obrazy Docker powiazane z EduGen zostaly usuniete.
echo [INFO] Ponowne uruchomienie aplikacji utworzy czyste srodowisko i pusta baze danych.

popd
pause
