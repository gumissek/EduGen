@echo off
set /p NEWPASS=Podaj nowe haslo: 
docker compose exec backend python -c "from passlib.context import CryptContext; print(CryptContext(schemes=['bcrypt'],deprecated='auto').hash('%NEWPASS%'))"
echo Skopiuj hash do STATIC_PASSWORD_HASH w pliku .env i uruchom ponownie kontenery.
