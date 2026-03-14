@echo off
setlocal

set "ROOT_DIR=%~dp0"
pushd "%ROOT_DIR%backend" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Nie znaleziono folderu backend.
    exit /b 1
)

where uv >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Nie znaleziono polecenia uv. Zainstaluj uv i sprobuj ponownie.
    popd
    exit /b 1
)

uv run pytest tests/ -vv -ra --tb=long --durations=10 %*
set "EXIT_CODE=%ERRORLEVEL%"

popd
exit /b %EXIT_CODE%
