"""Tests for diagnostic_service — log retrieval."""

from __future__ import annotations

from app.models.diagnostic_log import DiagnosticLog
from app.services.diagnostic_service import get_logs


class TestGetLogs:
    def test_empty_db_returns_empty(self, db):
        logs, total = get_logs(db)
        assert logs == []
        assert total == 0

    def test_returns_logs_ordered_by_date(self, db):
        db.add(DiagnosticLog(level="INFO", message="First", created_at="2025-01-01T00:00:00"))
        db.add(DiagnosticLog(level="ERROR", message="Second", created_at="2025-01-02T00:00:00"))
        db.commit()

        logs, total = get_logs(db)
        assert total == 2
        assert logs[0].message == "Second"  # latest first

    def test_filter_by_level(self, db):
        db.add(DiagnosticLog(level="INFO", message="Info msg"))
        db.add(DiagnosticLog(level="ERROR", message="Error msg"))
        db.commit()

        logs, total = get_logs(db, level="error")
        assert total == 1
        assert logs[0].level == "ERROR"

    def test_pagination(self, db):
        for i in range(5):
            db.add(DiagnosticLog(level="INFO", message=f"Msg {i}"))
        db.commit()

        logs, total = get_logs(db, page=1, per_page=2)
        assert total == 5
        assert len(logs) == 2

        logs2, _ = get_logs(db, page=3, per_page=2)
        assert len(logs2) == 1
