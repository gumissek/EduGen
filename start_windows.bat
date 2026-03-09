@echo off
setlocal EnableDelayedExpansion

echo ============================================
echo         EduGen - Uruchamianie aplikacji
echo ============================================
echo.

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

:: Sprawdz czy Docker Desktop dziala (demon dockera)
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [BLAD] Docker Desktop nie jest uruchomiony.
    echo.
    echo Uruchom Docker Desktop i poczekaj az ikona w zasobniku systemowym
    echo przestanie sie animowac, a nastepnie uruchom ponownie ten skrypt.
    echo.
    pause
    exit /b 1
)

echo [OK] Docker Desktop jest zainstalowany i uruchomiony.
echo.

:: Sprawdz czy istnieje plik .env backendu
if not exist "backend\.env" (
    echo [UWAGA] Brak pliku konfiguracyjnego backend\.env
    echo.
    echo Skopiuj plik backend\.env.example do backend\.env i uzupelnij dane.
    echo Jesli nie masz pliku .env.example, skontaktuj sie z administratorem.
    echo.
    pause
    exit /b 1
)

echo [OK] Plik konfiguracyjny backend\.env istnieje.
echo.
echo Budowanie i uruchamianie aplikacji...
echo (Pierwsze uruchomienie moze trwac kilka minut - trwa pobieranie obrazow)
echo.

:: Budowanie i uruchamianie kontenerow
docker compose up --build -d

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [BLAD] Wystapil problem podczas uruchamiania aplikacji.
    echo Sprawdz powyzsze komunikaty bledow.
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   Aplikacja zostala uruchomiona pomyslnie!
echo ============================================
echo.
echo   Frontend (interfejs):  http://localhost:3000
echo   Backend  (API):        http://localhost:8000
echo.
echo Otwieranie aplikacji w przegladarce za 5 sekund...
timeout /t 5 /nobreak >nul
start http://localhost:3000
echo.
echo Aby zatrzymac aplikacje, uruchom:
echo   docker compose down
echo.
pause
