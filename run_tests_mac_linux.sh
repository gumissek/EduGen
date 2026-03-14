#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${SCRIPT_DIR}/backend"

if [[ ! -d "${BACKEND_DIR}" ]]; then
  echo "[ERROR] Nie znaleziono folderu backend."
  exit 1
fi

if ! command -v uv >/dev/null 2>&1; then
  echo "[ERROR] Nie znaleziono polecenia uv. Zainstaluj uv i sprobuj ponownie."
  exit 1
fi

cd "${BACKEND_DIR}"
uv run pytest tests/ -vv -ra --tb=long --durations=10 "$@"
