@echo off
setlocal EnableExtensions DisableDelayedExpansion

pushd "%~dp0" >nul 2>&1
if errorlevel 1 (
    echo [BLAD] Nie mozna przejsc do katalogu projektu.
    pause
    exit /b 1
)

echo ============================================
echo   EduGen - Tryb Deweloperski - Windows
echo ============================================
echo.

:: ── Sprawdzenie pliku .env ───────────────────────────────────────────────────
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
echo [OK] Plik .env istnieje.
echo.

:: ── Wczytanie zmiennych z .env ───────────────────────────────────────────────
for /f "usebackq tokens=1,* delims==" %%a in (`findstr /v "^#" .env 2^>nul ^| findstr /r /v "^$"`) do (
    set "%%a=%%b"
)

:: Podstawowe wartosci domyslne dla lokalnego developmentu
if not defined POSTGRES_USER set "POSTGRES_USER=postgres"
if not defined POSTGRES_DB set "POSTGRES_DB=edugen"
if not defined POSTGRES_PORT set "POSTGRES_PORT=5432"

if not defined POSTGRES_PASSWORD (
    echo [BLAD] Brak zmiennej POSTGRES_PASSWORD w pliku .env.
    echo Uzupelnij plik .env i uruchom skrypt ponownie.
    echo.
    pause
    popd
    exit /b 1
)

:: Skonstruuj DATABASE_URL wskazujacy na localhost (zamiast nazwy serwisu Docker)
set "DATABASE_URL=postgresql+psycopg://%POSTGRES_USER%:%POSTGRES_PASSWORD%@localhost:%POSTGRES_PORT%/%POSTGRES_DB%"

:: ── Sprawdzenie i instalacja uv ──────────────────────────────────────────────
echo Sprawdzanie uv...
where uv >nul 2>&1
if errorlevel 1 (
    echo [INFO] uv nie jest zainstalowany. Instalowanie przez PowerShell...
    powershell -ExecutionPolicy Bypass -Command "irm https://astral.sh/uv/install.ps1 | iex"

    :: Odswiezenie PATH dla biezacej sesji
    set "PATH=%USERPROFILE%\.local\bin;%USERPROFILE%\.cargo\bin;%PATH%"

    where uv >nul 2>&1
    if errorlevel 1 (
        echo.
        echo [BLAD] Nie mozna uruchomic uv po instalacji.
        echo Uruchom skrypt ponownie w nowym oknie terminala.
        echo Dokumentacja: https://docs.astral.sh/uv/getting-started/installation/
        echo.
        pause
        exit /b 1
    )
    echo [OK] uv zainstalowany pomyslnie.
) else (
    for /f "tokens=*" %%v in ('uv --version 2^>nul') do echo [OK] %%v
)
echo.

:: ── Tworzenie/aktualizacja .venv backendu ────────────────────────────────────
echo Konfiguracja srodowiska Python (backend)...
cd /d backend

if not exist ".venv" (
    echo Tworzenie srodowiska wirtualnego .venv...
    uv venv
    if errorlevel 1 (
        echo [BLAD] Nie udalo sie utworzyc .venv.
        cd ..
        pause
        exit /b 1
    )
    echo [OK] .venv utworzone.
) else (
    echo [OK] .venv juz istnieje.
)

echo Synchronizacja zaleznosci Python (uv sync)...
uv sync
if errorlevel 1 (
    echo [BLAD] Blad podczas uv sync.
    cd ..
    pause
    exit /b 1
)

cd ..
echo [OK] Srodowisko backendu gotowe.
echo.

:: ── Sprawdzenie i instalacja Pandoc (wymagane do eksportu DOCX/PDF) ─────────
echo Sprawdzanie Pandoc...
where pandoc >nul 2>&1
if errorlevel 1 (
    echo [INFO] Pandoc nie jest zainstalowany. Rozpoczynam instalacje...

    set "PANDOC_TMP_MSI=%TEMP%\pandoc-3.9-windows-x86_64.msi"
    set "PANDOC_URL=https://github.com/jgm/pandoc/releases/download/3.9/pandoc-3.9-windows-x86_64.msi"

    echo [INFO] Pobieranie instalatora Pandoc z:
    echo        %PANDOC_URL%
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri '%PANDOC_URL%' -OutFile '%PANDOC_TMP_MSI%'"
    if errorlevel 1 (
        echo [BLAD] Nie udalo sie pobrac instalatora Pandoc.
        echo Pobierz recznie: https://pandoc.org/installing.html
        echo.
        pause
        popd
        exit /b 1
    )
    set "PANDOC_INSTALLER=%PANDOC_TMP_MSI%"

    echo [INFO] Uruchamianie instalatora Pandoc...
    start /wait "Pandoc Installer" msiexec /i "%PANDOC_INSTALLER%" /passive /norestart
    if errorlevel 1 (
        echo [BLAD] Instalacja Pandoc zakonczona niepowodzeniem.
        echo.
        pause
        popd
        exit /b 1
    )

    :: Odswiezenie PATH dla biezacej sesji (czesto potrzebne po instalacji MSI)
    set "PATH=%ProgramFiles%\Pandoc;%ProgramFiles(x86)%\Pandoc;%PATH%"

    where pandoc >nul 2>&1
    if errorlevel 1 (
        echo [BLAD] Pandoc nadal nie jest dostepny w PATH po instalacji.
        echo Uruchom skrypt ponownie w nowym oknie terminala.
        echo.
        pause
        popd
        exit /b 1
    )

    for /f "tokens=*" %%v in ('pandoc --version 2^>nul ^| findstr /b "pandoc"') do echo [OK] %%v
) else (
    for /f "tokens=*" %%v in ('pandoc --version 2^>nul ^| findstr /b "pandoc"') do echo [OK] %%v
)
echo.

:: ── Sprawdzenie Node.js i npm ────────────────────────────────────────────────
echo Sprawdzanie Node.js...
where npm >nul 2>&1
if errorlevel 1 (
    echo [BLAD] Node.js ^(npm^) nie jest zainstalowany lub nie jest dostepny w PATH.
    echo Pobierz Node.js LTS ze strony: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version 2^>nul') do echo [OK] Node.js %%v
echo.

:: ── Instalacja zaleznosci frontendu ─────────────────────────────────────────
echo Sprawdzanie zaleznosci frontendu...
cd /d frontend

if not exist ".env.local" (
    if exist ".env.local.example" (
        echo [INFO] Tworzenie frontend/.env.local z .env.local.example...
        copy ".env.local.example" ".env.local" >nul
        echo [OK] frontend/.env.local utworzony.
    ) else (
        echo [UWAGA] Brak frontend/.env.local oraz frontend/.env.local.example.
        echo         Sprawdz, czy frontend ma poprawna konfiguracje zmiennych NEXT_PUBLIC_*
    )
)

if not exist "node_modules" (
    if exist "package-lock.json" (
        echo Instalowanie node_modules ^(npm ci^)...
        npm ci
    ) else (
        echo Instalowanie node_modules ^(npm install^)...
        npm install
    )
    if errorlevel 1 (
        echo [BLAD] Blad podczas npm install.
        cd ..
        pause
        exit /b 1
    )
    echo [OK] node_modules zainstalowane.
) else (
    echo [OK] node_modules juz istnieje.
)

cd ..
echo [OK] Frontend gotowy.
echo.

:: ── Uruchomienie bazy danych przez Docker ────────────────────────────────────
setlocal EnableDelayedExpansion
set "DOCKER_COMPOSE_CMD="

where docker >nul 2>&1
if not errorlevel 1 (
    docker compose version >nul 2>&1
    if not errorlevel 1 set "DOCKER_COMPOSE_CMD=docker compose"

    if not defined DOCKER_COMPOSE_CMD (
        where docker-compose >nul 2>&1
        if not errorlevel 1 set "DOCKER_COMPOSE_CMD=docker-compose"
    )

    docker info >nul 2>&1
    if not errorlevel 1 (
        if defined DOCKER_COMPOSE_CMD (
            echo Uruchamianie bazy danych PostgreSQL ^(!DOCKER_COMPOSE_CMD! up -d postgres^)...
            !DOCKER_COMPOSE_CMD! up -d postgres
            if errorlevel 1 (
                echo [UWAGA] Nie udalo sie uruchomic kontenera postgres.
                echo         Upewnij sie, ze PostgreSQL jest dostepny na localhost:!POSTGRES_PORT!
            ) else (
                set "POSTGRES_STARTED=1"
                echo [OK] Baza danych PostgreSQL uruchomiona na porcie !POSTGRES_PORT!.
                timeout /t 3 /nobreak >nul
            )
        ) else (
            echo [UWAGA] Brak pluginu docker compose i polecenia docker-compose.
            echo         Upewnij sie, ze PostgreSQL jest dostepny lokalnie na porcie !POSTGRES_PORT!.
        )
    ) else (
        echo [UWAGA] Docker Desktop nie jest uruchomiony.
        echo         Upewnij sie, ze PostgreSQL jest dostepny lokalnie na porcie !POSTGRES_PORT!.
    )
) else (
    echo [UWAGA] Docker nie jest zainstalowany.
    echo         Upewnij sie, ze PostgreSQL jest dostepny lokalnie na porcie !POSTGRES_PORT!.
)
endlocal
echo.

:: ── Uruchomienie backendu w nowym oknie ─────────────────────────────────────
echo Uruchamianie backendu (FastAPI + uvicorn --reload)...
set "PROJECT_ROOT=%~dp0"
if not exist "%PROJECT_ROOT%backend\.venv\Scripts\python.exe" (
    echo [BLAD] Nie znaleziono backend/.venv/Scripts/python.exe.
    echo Uruchom skrypt ponownie po poprawnej konfiguracji backendu.
    pause
    popd
    exit /b 1
)

start "EduGen-Backend [DEV]" /D "%PROJECT_ROOT%backend" cmd /k ".venv\Scripts\python.exe app\init_app.py && echo. && echo [Backend] Serwer gotowy - hot-reload wlaczony && echo. && .venv\Scripts\uvicorn.exe app.main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 2 /nobreak >nul

:: ── Uruchomienie frontendu w nowym oknie ─────────────────────────────────────
echo Uruchamianie frontendu (Next.js dev mode)...
start "EduGen-Frontend [DEV]" /D "%PROJECT_ROOT%frontend" cmd /k "npm run dev"

echo.
echo ============================================
echo   EduGen uruchomiony w trybie deweloperskim
echo ============================================
echo.
echo   Frontend:  http://localhost:3000
echo   Backend:   http://localhost:8000
echo   Baza:      localhost:%POSTGRES_PORT%
echo.
echo   Aby zatrzymac aplikacje, zamknij okna:
echo   "EduGen-Backend [DEV]" i "EduGen-Frontend [DEV]"
echo.
echo   Aby zatrzymac baze danych:
echo   docker compose stop postgres
echo   ^(lub docker-compose stop postgres^)
echo.
pause

popd
