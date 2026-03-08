#!/usr/bin/env bash
set -euo pipefail
if [ ! -f .env ]; then
  cp .env.example .env
fi
docker compose up --build -d
echo "EduGen uruchomiony: http://127.0.0.1:3000"
