@echo off
if /i "%~1"=="--run-in-cmd" goto :main

echo %CMDCMDLINE% | findstr /i /c:" /c " >nul
if not errorlevel 1 (
    start "EduGen Startup" cmd /k ""%~f0" --run-in-cmd"
    exit /b 0
)

:main
if /i "%~1"=="--run-in-cmd" shift /1
setlocal EnableExtensions EnableDelayedExpansion

pushd "%~dp0" >nul 2>&1
if errorlevel 1 (
    echo [BLAD] Nie mozna przejsc do katalogu projektu.
    pause
    exit /b 1
)

:: Sprawdzenie aktualnej galezi Git
set CURRENT_BRANCH=
FOR /F "tokens=*" %%i IN ('git rev-parse --abbrev-ref HEAD 2^>nul') DO set CURRENT_BRANCH=%%i

if /i "!CURRENT_BRANCH!"=="master" (
    if exist "check_update.bat" (
        call check_update.bat
        if errorlevel 1 (
            echo [UWAGA] Wystapil problem podczas sprawdzania aktualizacji. Kontynuuje uruchamianie aplikacji.
            echo.
        )
    ) else (
        echo [UWAGA] Brak pliku check_update.bat - pomijam sprawdzanie aktualizacji.
        echo.
    )
) else (
    if "!CURRENT_BRANCH!"=="" (
        echo [UWAGA] Nie wykryto repozytorium Git ^(lub Git nie jest zainstalowany^). Pomijam sprawdzanie aktualizacji.
    ) else (
        echo [INFO] Aktualna galaz to '!CURRENT_BRANCH!' ^(nie 'master'^). Pomijam sprawdzanie aktualizacji.
    )
    echo.
)

echo ============================================
echo        EduGen - Uruchamianie aplikacji
echo ============================================
echo.

set "POSTGRES_PORT=5432"

:: Sprawdz czy istnieje plik .env (root — wymagany przez Docker Compose)
if not exist ".env" (
    echo [UWAGA] Brak pliku konfiguracyjnego .env
    echo.
    if exist ".env.example" (
        echo Znaleziono plik .env.example - kopiowanie do .env...
        copy ".env.example" ".env" >nul
        echo [OK] Plik .env zostal utworzony automatycznie z .env.example.
        echo [WAZNE] Przed uruchomieniem uzupelnij .env o wlasne wartosci:
        echo         - POSTGRES_PASSWORD
        echo         - JWT_SECRET_KEY
        echo.
        pause
        popd
        exit /b 0
    ) else (
        echo [BLAD] Brak pliku .env.example w glownym katalogu projektu.
        echo Pobierz ponownie projekt lub utworz plik .env recznie na podstawie dokumentacji.
        echo.
        pause
        popd
        exit /b 1
    )
)

for /f "tokens=2 delims==" %%p in ('findstr /r /b /c:"POSTGRES_PORT=" ".env" 2^>nul') do set "POSTGRES_PORT=%%p"

echo [OK] Plik konfiguracyjny .env istnieje.
echo.

where pandoc >nul 2>&1
if errorlevel 1 (
    echo [INFO] Pandoc nie jest dostepny w systemie hosta.
    echo [INFO] To nie blokuje trybu Docker; wymagane zaleznosci eksportu sa obslugiwane przez kontenery.
    echo.
)

:: Sprawdz czy Docker jest zainstalowany
where docker >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [BLAD] Docker nie jest zainstalowany lub nie jest dodany do PATH.
    echo.
    echo Pobierz Docker Desktop ze strony: https://www.docker.com/products/docker-desktop/
    echo Po instalacji uruchom ponownie ten skrypt.
    echo.
    pause
    exit /b 1
)

:: Sprawdz czy Docker Desktop dziala
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [BLAD] Docker Desktop nie jest uruchomiony.
    echo.
    echo Uruchom Docker Desktop i poczekaj az sie w pelni uruchomi,
    echo a nastepnie uruchom ponownie ten skrypt.
    echo.
    pause
    exit /b 1
)

echo [OK] Docker Desktop jest zainstalowany i uruchomiony.
echo.

set "DOCKER_COMPOSE_CMD="
docker compose version >nul 2>&1
if not errorlevel 1 set "DOCKER_COMPOSE_CMD=docker compose"

if not defined DOCKER_COMPOSE_CMD (
    where docker-compose >nul 2>&1
    if not errorlevel 1 set "DOCKER_COMPOSE_CMD=docker-compose"
)

if not defined DOCKER_COMPOSE_CMD (
    echo [BLAD] Brak polecenia docker compose oraz docker-compose.
    echo Zainstaluj plugin compose lub docker-compose i uruchom skrypt ponownie.
    echo.
    pause
    popd
    exit /b 1
)

set "HAS_EXISTING_STACK="
for /f "delims=" %%i in ('%DOCKER_COMPOSE_CMD% ps -a -q 2^>nul') do set "HAS_EXISTING_STACK=1"

if defined HAS_EXISTING_STACK (
    echo [INFO] Wykryto istniejace kontenery dla projektu Docker Compose.
    echo [INFO] Usuwanie starego stacka i lokalnych obrazow budowanych przez Compose...
    %DOCKER_COMPOSE_CMD% down --remove-orphans --rmi local
    if errorlevel 1 (
        echo [BLAD] Nie udalo sie usunac istniejacego stacka Docker Compose.
        echo Sprawdz logi powyzej i uruchom skrypt ponownie.
        echo.
        pause
        popd
        exit /b 1
    )
    echo [OK] Stary stack zostal usuniety. Rozpoczynam czyste budowanie od nowa.
    echo.
)

echo Budowanie i uruchamianie aplikacji...
echo (Pierwsze uruchomienie moze trwac kilka minut - trwa pobieranie obrazow)
echo.

:: Otwarcie przegladarki po 15 sekundach
echo Przegladarka zostanie otwarta automatycznie po 15 sekundach...
start "EduGen-BrowserOpener" /B powershell -NoProfile -NonInteractive -WindowStyle Hidden -Command "Start-Sleep 15; Start-Process 'http://localhost:3000'"
echo.
echo ============================================
echo   Aplikacja uruchamia sie - czekaj na logi
echo ============================================
echo.
echo   Frontend (interfejs):  http://localhost:3000
echo   Backend  (API):        http://localhost:8000
echo   Baza danych:           localhost:%POSTGRES_PORT%
echo.
powershell -Command "Write-Host '============================================' -ForegroundColor Red ; Write-Host '  JAK WYLACZYC APLIKACJE:' -ForegroundColor Red ; Write-Host '  Nacisnij CTRL + C w tym oknie,' -ForegroundColor Red ; Write-Host '  a nastepnie wpisz T i zatwierdz Enterem.' -ForegroundColor Red ; Write-Host '============================================' -ForegroundColor Red"
powershell -Command "Write-Host '' ; Write-Host '  Jezeli przegladarka nie otworzyla sie automatycznie,' -ForegroundColor Cyan ; Write-Host '  odwiedz recznie ponizsze adresy:' -ForegroundColor Cyan ; Write-Host '  http://localhost:3000  (interfejs aplikacji)' -ForegroundColor Cyan ; Write-Host '  http://localhost:8000  (API backendu)' -ForegroundColor Cyan ; Write-Host '  localhost:%POSTGRES_PORT%  (PostgreSQL)' -ForegroundColor Cyan ; Write-Host ''"
echo.
echo Czekanie na logi kontenerow...
echo.

:: Uruchamianie kontenerow w trybie interaktywnym (CTRL+C zatrzyma kontenery)
%DOCKER_COMPOSE_CMD% up --build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ============================================
    echo  Aplikacja zostala zatrzymana pomyslnie.
    echo ============================================
    pause
    exit /b 1
)

powershell -Command "Write-Host '' ; Write-Host '============================================' -ForegroundColor Yellow ; Write-Host '  Aplikacja zostala zatrzymana.' -ForegroundColor Yellow ; Write-Host '============================================' -ForegroundColor Yellow"

echo.
echo Aby recznie zatrzymac baze danych, uzyj:
echo   %DOCKER_COMPOSE_CMD% stop postgres
echo.
pause
popd