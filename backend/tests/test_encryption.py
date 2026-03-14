"""Tests for encryption service — Fernet encrypt/decrypt round-trip."""

from __future__ import annotations

import os
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest
from cryptography.fernet import Fernet


class TestEncryption:
    def test_encrypt_decrypt_round_trip(self):
        # Use a temp dir so we don't pollute the real DATA_DIR
        with tempfile.TemporaryDirectory() as tmpdir:
            with patch("app.encryption.settings") as mock_settings:
                mock_settings.DATA_DIR = tmpdir
                # Reset cached Fernet instance
                import app.encryption as enc_mod
                enc_mod._fernet = None
                enc_mod._KEY_FILE = Path(tmpdir) / "fernet.key"

                encrypted = enc_mod.encrypt_api_key("sk-my-secret-key")
                assert encrypted != "sk-my-secret-key"

                decrypted = enc_mod.decrypt_api_key(encrypted)
                assert decrypted == "sk-my-secret-key"

    def test_key_file_created(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            key_path = Path(tmpdir) / "fernet.key"
            with patch("app.encryption.settings") as mock_settings:
                mock_settings.DATA_DIR = tmpdir
                import app.encryption as enc_mod
                enc_mod._fernet = None
                enc_mod._KEY_FILE = key_path

                enc_mod.encrypt_api_key("test")
                assert key_path.exists()

    def test_decrypt_wrong_key_raises_value_error(self):
        """Decrypting with a different key should raise ValueError, not InvalidToken."""
        with tempfile.TemporaryDirectory() as tmpdir1, tempfile.TemporaryDirectory() as tmpdir2:
            import app.encryption as enc_mod

            # Encrypt with key from tmpdir1
            with patch("app.encryption.settings") as mock_settings:
                mock_settings.DATA_DIR = tmpdir1
                enc_mod._fernet = None
                enc_mod._KEY_FILE = Path(tmpdir1) / "fernet.key"
                encrypted = enc_mod.encrypt_api_key("sk-secret")

            # Decrypt with a different key from tmpdir2
            with patch("app.encryption.settings") as mock_settings:
                mock_settings.DATA_DIR = tmpdir2
                enc_mod._fernet = None
                enc_mod._KEY_FILE = Path(tmpdir2) / "fernet.key"
                with pytest.raises(ValueError, match="klucz szyfrowania uległ zmianie"):
                    enc_mod.decrypt_api_key(encrypted)
