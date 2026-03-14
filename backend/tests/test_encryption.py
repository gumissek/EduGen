"""Tests for encryption service — Fernet encrypt/decrypt round-trip."""

from __future__ import annotations

import os
import tempfile
from pathlib import Path
from unittest.mock import patch


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
