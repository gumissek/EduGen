@echo off
setlocal EnableDelayedExpansion

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
    if exist ".config_backend" (
        echo Znaleziono plik .config_backend - kopiowanie do backend\.env...
        copy ".config_backend" "backend\.env" >nul
        echo [OK] Plik backend\.env zostal utworzony automatycznie z .config_backend.
        echo [INFO] Uzupelnij backend\.env o wlasny klucz OPENAI_API_KEY przed generowaniem materialow.
        echo.
    ) else (
        echo [BLAD] Brak pliku .config_backend w glownym katalogu projektu.
        echo Skontaktuj sie z administratorem i umiec plik .env w folderze backend.
        echo.
        pause
        exit /b 1
    )
)

echo [OK] Plik konfiguracyjny backend\.env istnieje.
echo.
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
echo.
powershell -Command "Write-Host '============================================' -ForegroundColor Red ; Write-Host '  JAK WYLACZYC APLIKACJE:' -ForegroundColor Red ; Write-Host '  Nacisnij CTRL + C w tym oknie,' -ForegroundColor Red ; Write-Host '  a nastepnie wpisz T i zatwierdz Enterem.' -ForegroundColor Red ; Write-Host '============================================' -ForegroundColor Red"
powershell -Command "Write-Host '' ; Write-Host '  Jezeli przegladarka nie otworzyla sie automatycznie,' -ForegroundColor Cyan ; Write-Host '  odwiedz recznie ponizsze adresy:' -ForegroundColor Cyan ; Write-Host '  http://localhost:3000  (interfejs aplikacji)' -ForegroundColor Cyan ; Write-Host '  http://localhost:8000  (API backendu)' -ForegroundColor Cyan ; Write-Host ''"
echo.
echo Czekanie na logi kontenerow...
echo.

:: Uruchamianie kontenerow w trybie interaktywnym (CTRL+C zatrzyma kontenery)
docker compose up --build

powershell -Command "Write-Host '' ; Write-Host '============================================' -ForegroundColor Yellow ; Write-Host '  Aplikacja zostala zatrzymana.' -ForegroundColor Yellow ; Write-Host '============================================' -ForegroundColor Yellow"

echo.
pause