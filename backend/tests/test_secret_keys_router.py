"""Tests for secret_keys router — CRUD and validation of API keys."""

from __future__ import annotations

from unittest.mock import patch, MagicMock
from uuid import uuid4

from app.models.secret_key import SecretKey


class TestSecretKeysRouter:
    """Tests for /api/secret-keys endpoints."""

    def _seed_key(self, db, user, **overrides) -> SecretKey:
        defaults = dict(
            user_id=user.id,
            platform="openrouter",
            key_name="My Test Key",
            secret_key_hash="encrypted-data",
            is_active=True,
        )
        defaults.update(overrides)
        key = SecretKey(**defaults)
        db.add(key)
        db.commit()
        db.refresh(key)
        return key

    # ── LIST ──

    def test_list_keys_empty(self, client):
        resp = client.get("/api/secret-keys")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_keys(self, client, db, test_user):
        self._seed_key(db, test_user)
        resp = client.get("/api/secret-keys")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["key_name"] == "My Test Key"
        assert data[0]["platform"] == "openrouter"

    # ── CREATE ──

    @patch("app.routers.secret_keys.encrypt_api_key", return_value="encrypted-value")
    def test_create_key(self, mock_encrypt, client, db, test_user):
        resp = client.post("/api/secret-keys", json={
            "platform": "openrouter",
            "key_name": "New Key",
            "secret_key": "sk-or-test-abc123",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["key_name"] == "New Key"
        assert data["is_active"] is True

    # ── DELETE ──

    def test_delete_key(self, client, db, test_user):
        key = self._seed_key(db, test_user)
        resp = client.delete(f"/api/secret-keys/{key.id}")
        assert resp.status_code == 204

        assert db.query(SecretKey).filter(SecretKey.id == key.id).first() is None

    def test_delete_nonexistent_key(self, client):
        resp = client.delete("/api/secret-keys/nonexistent")
        assert resp.status_code == 404

    # ── VALIDATE ──

    @patch("app.routers.secret_keys.decrypt_api_key", return_value="real-key")
    @patch("app.routers.secret_keys.http_requests.get")
    def test_validate_key_success(self, mock_get, mock_decrypt, client, db, test_user):
        key = self._seed_key(db, test_user)
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_get.return_value = mock_response

        resp = client.post(f"/api/secret-keys/{key.id}/validate")
        assert resp.status_code == 200
        assert resp.json()["valid"] is True

    @patch("app.routers.secret_keys.decrypt_api_key", return_value="bad-key")
    @patch("app.routers.secret_keys.http_requests.get")
    def test_validate_key_failure(self, mock_get, mock_decrypt, client, db, test_user):
        key = self._seed_key(db, test_user)
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.json.return_value = {"error": {"message": "Invalid key"}}
        mock_response.text = "Unauthorized"
        mock_get.return_value = mock_response

        resp = client.post(f"/api/secret-keys/{key.id}/validate")
        assert resp.status_code == 200
        assert resp.json()["valid"] is False

    def test_validate_nonexistent_key(self, client):
        resp = client.post("/api/secret-keys/nonexistent/validate")
        assert resp.status_code == 404

    @patch("app.routers.secret_keys.decrypt_api_key", side_effect=Exception("Decryption error"))
    def test_validate_key_decrypt_error(self, mock_decrypt, client, db, test_user):
        key = self._seed_key(db, test_user)
        resp = client.post(f"/api/secret-keys/{key.id}/validate")
        assert resp.status_code == 200
        assert resp.json()["valid"] is False
        assert "error" in resp.json()
