from __future__ import annotations

import secrets
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

from cryptography.fernet import Fernet
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def now_utc() -> datetime:
    return datetime.now(UTC)


def create_session_expiry() -> datetime:
    return now_utc() + timedelta(minutes=settings.session_timeout_minutes)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


def generate_token() -> str:
    return secrets.token_urlsafe(48)


def generate_uuid() -> str:
    return str(uuid.uuid4())


def _fernet_key_path() -> Path:
    path = Path(settings.data_dir) / "secrets"
    path.mkdir(parents=True, exist_ok=True)
    return path / "fernet.key"


def get_fernet() -> Fernet:
    key_path = _fernet_key_path()
    if not key_path.exists():
        key_path.write_bytes(Fernet.generate_key())
    return Fernet(key_path.read_bytes())


def encrypt_text(raw_text: str) -> str:
    return get_fernet().encrypt(raw_text.encode("utf-8")).decode("utf-8")


def decrypt_text(cipher_text: str) -> str:
    return get_fernet().decrypt(cipher_text.encode("utf-8")).decode("utf-8")
