@echo off
setlocal EnableExtensions DisableDelayedExpansion

cd /d "%~dp0"
if errorlevel 1 (
    echo [BLAD] Nie mozna przejsc do katalogu backend.
    pause
    exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
    echo [BLAD] Nie znaleziono backend/.venv/Scripts/python.exe.
    echo Uruchom dev_windows.bat ponownie, aby odtworzyc srodowisko.
    echo.
    pause
    exit /b 1
)

echo [Backend] Inicjalizacja bazy i katalogow...
".venv\Scripts\python.exe" app\init_app.py
set "INIT_EXIT=%ERRORLEVEL%"
if not "%INIT_EXIT%"=="0" (
    echo.
    echo [BLAD] Inicjalizacja backendu nie powiodla sie. Kod: %INIT_EXIT%
    echo Sprawdz logi powyzej.
    echo.
    pause
    exit /b %INIT_EXIT%
)

echo.
echo [Backend] Serwer gotowy - hot-reload wlaczony
echo.
".venv\Scripts\python.exe" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
set "UVICORN_EXIT=%ERRORLEVEL%"

echo.
echo [UWAGA] Proces backendu zakonczyl sie. Kod: %UVICORN_EXIT%
echo.
pause
exit /b %UVICORN_EXIT%
