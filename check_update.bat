@echo off
setlocal EnableDelayedExpansion

echo ============================================
echo   Sprawdzanie aktualizacji aplikacji...
echo ============================================
echo.

:: Sprawdź czy git jest zainstalowany
where git >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [UWAGA] Git nie jest zainstalowany. Pomijam sprawdzanie aktualizacji.
    echo.
    exit /b 0
)

echo Pobieranie informacji o repozytorium...
git fetch >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [UWAGA] Brak polaczenia z repozytorium lub brak uprawnien. Pomijam aktualizacje.
    echo.
    exit /b 0
)

FOR /F "tokens=*" %%i IN ('git rev-list HEAD...@{u} --count 2^>nul') DO set BEHIND=%%i

if "%BEHIND%"=="" set BEHIND=0

if "%BEHIND%"=="0" (
    echo [OK] Masz najnowsza wersje aplikacji.
    echo.
    exit /b 0
)

echo [INFO] Dostepna jest nowa wersja aplikacji (nowych zmian: %BEHIND%).
echo.
set UPDATE=N
set /p UPDATE="Czy chcesz pobrac i zainstalowac nowa wersje? (T/N): "

if /i "%UPDATE%"=="T" (
    echo Pobieranie aktualizacji...
    git pull
    echo.
    echo [OK] Aktualizacja zakonczona.
) else (
    echo [UWAGA] Pominielo aktualizacje.
)
echo.
exit /b 0
