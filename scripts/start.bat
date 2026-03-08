@echo off
if not exist .env (
  copy .env.example .env
)
docker compose up --build -d
echo EduGen uruchomiony: http://127.0.0.1:3000
