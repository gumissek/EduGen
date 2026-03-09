"""Fernet key management for encrypting/decrypting API keys."""

from __future__ import annotations

from pathlib import Path

from cryptography.fernet import Fernet

from app.config import settings

_KEY_FILE = Path(settings.DATA_DIR) / "fernet.key"
_fernet: Fernet | None = None


def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is not None:
        return _fernet

    if _KEY_FILE.exists():
        key = _KEY_FILE.read_bytes().strip()
    else:
        key = Fernet.generate_key()
        _KEY_FILE.parent.mkdir(parents=True, exist_ok=True)
        _KEY_FILE.write_bytes(key)

    _fernet = Fernet(key)
    return _fernet


def encrypt_api_key(plain: str) -> str:
    """Encrypt a plain-text API key and return the ciphertext as a string."""
    return _get_fernet().encrypt(plain.encode()).decode()


def decrypt_api_key(encrypted: str) -> str:
    """Decrypt a previously encrypted API key."""
    return _get_fernet().decrypt(encrypted.encode()).decode()
