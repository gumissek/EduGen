@echo off
setlocal EnableDelayedExpansion

set REPO_URL=https://github.com/gumissek/EduGen
set REMOTE_VERSION_URL=https://raw.githubusercontent.com/gumissek/EduGen/master/.version
set MASTER_BRANCH=master

echo ============================================
echo   Sprawdzanie aktualizacji aplikacji...
echo ============================================
echo.

:: Odczytaj lokalna wersje z pliku .version
set LOCAL_VERSION=unknown
if exist ".version" (
    FOR /F "tokens=2 delims==" %%i IN ('findstr "^VERSION=" .version') DO set LOCAL_VERSION=%%i
)

echo Pobieranie informacji o repozytorium...
set REMOTE_VERSION=
set TEMP_VERSION=%TEMP%\edugen_remote_version.txt
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $resp = Invoke-WebRequest -Uri '%REMOTE_VERSION_URL%' -UseBasicParsing -TimeoutSec 10; if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 300) { [IO.File]::WriteAllText('%TEMP_VERSION%', $resp.Content) } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [UWAGA] Nie mozna pobrac pliku .version z: %REPO_URL% ^(%MASTER_BRANCH%^).
    echo.
    exit /b 0
)

if exist "%TEMP_VERSION%" (
    FOR /F "tokens=2 delims==" %%i IN ('findstr "^VERSION=" "%TEMP_VERSION%" 2^>nul') DO set REMOTE_VERSION=%%i
    del "%TEMP_VERSION%" >nul 2>&1
)

if "%REMOTE_VERSION%"=="" (
    echo [UWAGA] Nie mozna odczytac zdalnej wersji z pliku .version.
    echo.
    exit /b 0
)

echo Lokalna wersja:  %LOCAL_VERSION%
echo Zdalna wersja:   %REMOTE_VERSION%
echo Zrodlo:          %REPO_URL% ^(%MASTER_BRANCH%^) 
echo.

if "%LOCAL_VERSION%"=="%REMOTE_VERSION%" (
    echo [OK] Masz najnowsza wersje aplikacji (%LOCAL_VERSION%).
    echo.
    exit /b 0
)

echo [INFO] Dostepna jest nowa wersja aplikacji!
echo        Zainstalowana: %LOCAL_VERSION%
echo        Dostepna:      %REMOTE_VERSION%
echo.
set UPDATE=N
set /p UPDATE="Czy chcesz pobrac i zainstalowac nowa wersje? (T/N): "

if /i "%UPDATE%"=="T" (
    where git >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo [UWAGA] Git nie jest zainstalowany. Nie moge wykonac automatycznej aktualizacji.
        echo.
        exit /b 0
    )

    git rev-parse --git-dir >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo [UWAGA] Katalog nie jest repozytorium git - wykonaj aktualizacje recznie.
        echo.
        exit /b 0
    )

    set CURRENT_BRANCH=
    FOR /F "tokens=*" %%i IN ('git rev-parse --abbrev-ref HEAD 2^>nul') DO set CURRENT_BRANCH=%%i
    if /i not "%CURRENT_BRANCH%"=="%MASTER_BRANCH%" (
        echo [UWAGA] Jestes na galezi '%CURRENT_BRANCH%'.
        echo        Automatyczna aktualizacja obsluguje tylko galaz '%MASTER_BRANCH%'.
        echo.
        exit /b 0
    )

    echo Pobieranie aktualizacji z %REPO_URL% ^(%MASTER_BRANCH%^)...
    git pull %REPO_URL% %MASTER_BRANCH%
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo [OK] Aktualizacja zakonczona. Uruchom aplikacje ponownie aby zastosowac zmiany.
    ) else (
        echo.
        echo [UWAGA] Nie udalo sie wykonac automatycznej aktualizacji.
    )
) else (
    echo [UWAGA] Pominieto aktualizacje.
)
echo.
exit /b 0
