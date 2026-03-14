"""Tests for backups router — create, list, download, restore, upload backups."""

from __future__ import annotations

import io
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock
from uuid import uuid4

from app.models.backup import Backup


class TestBackupsRouter:
    """Tests for /api/backups endpoints (superuser-only)."""

    def _seed_backup(self, db, **overrides) -> Backup:
        defaults = dict(
            backup_path="/fake/backups/test_backup.zip",
            size_bytes=1024,
            expires_at=(datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        )
        defaults.update(overrides)
        backup = Backup(**defaults)
        db.add(backup)
        db.commit()
        db.refresh(backup)
        return backup

    # ── ACCESS CONTROL ──

    def test_regular_user_rejected(self, client):
        resp = client.get("/api/backups")
        assert resp.status_code == 403

    def test_superuser_can_list(self, admin_client, db):
        resp = admin_client.get("/api/backups")
        assert resp.status_code == 200

    # ── LIST ──

    def test_list_backups_empty(self, admin_client):
        resp = admin_client.get("/api/backups")
        assert resp.status_code == 200
        assert resp.json()["backups"] == []

    @patch("app.routers.backups.list_backups")
    def test_list_backups(self, mock_list, admin_client, db, superuser):
        b = self._seed_backup(db)
        mock_list.return_value = [b]
        resp = admin_client.get("/api/backups")
        assert resp.status_code == 200

    # ── CREATE ──

    @patch("app.routers.backups.create_backup")
    def test_create_backup(self, mock_create, admin_client, db, superuser):
        mock_backup = Backup(
            id=str(uuid4()),
            backup_path="/fake/backup.zip",
            size_bytes=2048,
            created_at=datetime.now(timezone.utc).isoformat(),
            expires_at=(datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        )
        mock_create.return_value = mock_backup
        resp = admin_client.post("/api/backups")
        assert resp.status_code == 201

    @patch("app.routers.backups.create_backup", side_effect=FileNotFoundError("pg_dump not found"))
    def test_create_backup_missing_tool(self, mock_create, admin_client):
        resp = admin_client.post("/api/backups")
        assert resp.status_code == 404

    def test_create_backup_regular_user(self, client):
        resp = client.post("/api/backups")
        assert resp.status_code == 403

    # ── RESTORE ──

    @patch("app.routers.backups.restore_backup")
    def test_restore_backup(self, mock_restore, admin_client):
        resp = admin_client.post("/api/backups/restore", params={"backup_id": "some-id"})
        assert resp.status_code == 200

    @patch("app.routers.backups.restore_backup", side_effect=ValueError("Backup not found"))
    def test_restore_backup_not_found(self, mock_restore, admin_client):
        resp = admin_client.post("/api/backups/restore", params={"backup_id": "bad-id"})
        assert resp.status_code == 404

    @patch("app.routers.backups.restore_backup", side_effect=ValueError("Corrupted archive"))
    def test_restore_backup_invalid(self, mock_restore, admin_client):
        resp = admin_client.post("/api/backups/restore", params={"backup_id": "bad-id"})
        assert resp.status_code == 400

    # ── DOWNLOAD ──

    def test_download_nonexistent_backup(self, admin_client):
        resp = admin_client.get("/api/backups/nonexistent/download")
        assert resp.status_code == 404

    @patch("app.routers.backups.Path.exists", return_value=False)
    def test_download_backup_missing_on_disk(self, mock_exists, admin_client, db):
        b = self._seed_backup(db)
        resp = admin_client.get(f"/api/backups/{b.id}/download")
        assert resp.status_code == 404

    # ── UPLOAD ──

    def test_upload_no_filename(self, admin_client):
        resp = admin_client.post(
            "/api/backups/upload",
            files={"file": ("", io.BytesIO(b"data"), "application/zip")},
        )
        assert resp.status_code in (400, 422)

    def test_upload_non_zip(self, admin_client):
        resp = admin_client.post(
            "/api/backups/upload",
            files={"file": ("backup.tar", io.BytesIO(b"data"), "application/x-tar")},
        )
        assert resp.status_code == 400

    def test_upload_regular_user_rejected(self, client):
        resp = client.post(
            "/api/backups/upload",
            files={"file": ("backup.zip", io.BytesIO(b"data"), "application/zip")},
        )
        assert resp.status_code == 403
