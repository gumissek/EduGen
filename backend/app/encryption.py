"""Encryption utilities for API keys.

* Fernet — symmetric encryption at rest (stored keys).
* AES-256-GCM — transport encryption between frontend and backend.
"""

from __future__ import annotations

import base64
import os
from pathlib import Path

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.config import settings

# ---------------------------------------------------------------------------
# Fernet – at-rest encryption
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# AES-256-GCM – transport encryption
# ---------------------------------------------------------------------------

_TRANSPORT_KEY_FILE = Path(settings.DATA_DIR) / "transport_aes.key"
_transport_key: bytes | None = None


def _get_transport_key() -> bytes:
    """Return the 256-bit AES transport key, generating it on first use."""
    global _transport_key
    if _transport_key is not None:
        return _transport_key

    if _TRANSPORT_KEY_FILE.exists():
        raw = _TRANSPORT_KEY_FILE.read_bytes().strip()
        _transport_key = base64.b64decode(raw)
    else:
        _transport_key = os.urandom(32)  # 256-bit key
        _TRANSPORT_KEY_FILE.parent.mkdir(parents=True, exist_ok=True)
        _TRANSPORT_KEY_FILE.write_bytes(base64.b64encode(_transport_key))

    return _transport_key


def get_transport_key_b64() -> str:
    """Return the transport AES key as a base64 string (for the frontend)."""
    return base64.b64encode(_get_transport_key()).decode()


def decrypt_aes_transport(payload_b64: str) -> str:
    """Decrypt an AES-256-GCM payload produced by the frontend.

    Expected format: base64( IV[12 bytes] || ciphertext+tag )
    The Web Crypto API appends the 16-byte auth tag to the ciphertext.
    """
    raw = base64.b64decode(payload_b64)
    if len(raw) < 12 + 16:
        raise ValueError("Nieprawidłowy zaszyfrowany payload — za krótki")

    iv = raw[:12]
    ciphertext_with_tag = raw[12:]

    aesgcm = AESGCM(_get_transport_key())
    plaintext = aesgcm.decrypt(iv, ciphertext_with_tag, None)
    return plaintext.decode("utf-8")
