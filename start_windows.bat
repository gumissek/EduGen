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

:: Otwarcie przegladarki w tle po 15 sekundach
echo Przeglądarka zostanie otwarta automatycznie za ~15 sekund...
start /b cmd /c "timeout /t 15 /nobreak >nul && start http://localhost:3000"
echo.
echo ============================================
echo   Aplikacja uruchamia sie - czekaj na logi
echo ============================================
echo.
echo   Frontend (interfejs):  http://localhost:3000
echo   Backend  (API):        http://localhost:8000
echo.
echo Nacisnij CTRL + C aby zatrzymac aplikacje.
echo.

:: Uruchamianie kontenerow w trybie interaktywnym (CTRL+C zatrzyma kontenery)
docker compose up --build