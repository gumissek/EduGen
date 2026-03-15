"""Fernet key management for encrypting/decrypting API keys."""

from __future__ import annotations

from pathlib import Path

from cryptography.fernet import Fernet, InvalidToken

from app.config import settings

_KEY_FILE = Path(settings.DATA_DIR) / "fernet.key"
_fernet: Fernet | None = None


def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is not None:
        return _fernet

    configured_key = getattr(settings, "FERNET_KEY", None)
    if isinstance(configured_key, str) and configured_key.strip():
        key = configured_key.strip().encode()
    elif _KEY_FILE.exists():
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
    try:
        return _get_fernet().decrypt(encrypted.encode()).decode()
    except InvalidToken:
        raise ValueError(
            "Nie można odszyfrować klucza API — klucz szyfrowania uległ zmianie. "
            "Usuń zapisany klucz API w Ustawieniach i dodaj go ponownie."
        )
