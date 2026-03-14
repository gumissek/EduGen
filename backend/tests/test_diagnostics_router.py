"""Tests for diagnostics router — list and export diagnostic logs."""

from __future__ import annotations

from app.models.diagnostic_log import DiagnosticLog


class TestDiagnosticsRouter:
    """Tests for /api/diagnostics endpoints (superuser-only)."""

    def _seed_log(self, db, **overrides) -> DiagnosticLog:
        defaults = dict(
            level="ERROR",
            message="Test error message",
            metadata_json='{"url": "/api/test"}',
        )
        defaults.update(overrides)
        log = DiagnosticLog(**defaults)
        db.add(log)
        db.commit()
        db.refresh(log)
        return log

    # ── ACCESS CONTROL ──

    def test_regular_user_rejected_logs(self, client):
        resp = client.get("/api/diagnostics/logs")
        assert resp.status_code == 403

    def test_regular_user_rejected_export(self, client):
        resp = client.get("/api/diagnostics/export")
        assert resp.status_code == 403

    # ── LIST LOGS ──

    def test_list_logs_empty(self, admin_client):
        resp = admin_client.get("/api/diagnostics/logs")
        assert resp.status_code == 200
        data = resp.json()
        assert data["logs"] == []
        assert data["total"] == 0

    def test_list_logs(self, admin_client, db):
        self._seed_log(db)
        self._seed_log(db, level="WARNING", message="A warning")
        resp = admin_client.get("/api/diagnostics/logs")
        assert resp.status_code == 200
        assert resp.json()["total"] == 2

    def test_list_logs_filter_by_level(self, admin_client, db):
        self._seed_log(db, level="ERROR")
        self._seed_log(db, level="WARNING")
        resp = admin_client.get("/api/diagnostics/logs?level=ERROR")
        assert resp.status_code == 200
        assert resp.json()["total"] == 1
        assert resp.json()["logs"][0]["level"] == "ERROR"

    def test_list_logs_pagination(self, admin_client, db):
        for i in range(5):
            self._seed_log(db, message=f"Error {i}")
        resp = admin_client.get("/api/diagnostics/logs?page=1&per_page=2")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 5
        assert len(data["logs"]) == 2

    # ── EXPORT ──

    def test_export_logs(self, admin_client, db):
        self._seed_log(db)
        resp = admin_client.get("/api/diagnostics/export")
        assert resp.status_code == 200
        assert "application/json" in resp.headers["content-type"]
        assert "attachment" in resp.headers.get("content-disposition", "")

    def test_export_logs_empty(self, admin_client):
        resp = admin_client.get("/api/diagnostics/export")
        assert resp.status_code == 200

    def test_export_logs_filter_by_level(self, admin_client, db):
        self._seed_log(db, level="ERROR")
        self._seed_log(db, level="WARNING")
        resp = admin_client.get("/api/diagnostics/export?level=ERROR")
        assert resp.status_code == 200
        content = resp.content.decode("utf-8")
        assert "ERROR" in content
