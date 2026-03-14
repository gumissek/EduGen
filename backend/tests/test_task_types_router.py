"""Tests for task_types router — list and create task types."""

from __future__ import annotations

import csv
from pathlib import Path
from unittest.mock import patch


class TestTaskTypesRouter:
    """Tests for /api/task-types endpoints."""

    def _create_task_csv(self, tmp_path, rows=None):
        csv_path = tmp_path / "task_types.csv"
        if rows:
            with open(csv_path, "w", encoding="utf-8", newline="") as f:
                writer = csv.writer(f)
                for r in rows:
                    writer.writerow([r])
        return csv_path

    # ── LIST ──

    def test_list_task_types_empty(self, client, tmp_path):
        csv_path = tmp_path / "task_types.csv"
        with patch("app.routers.task_types.TASK_TYPES_FILE", csv_path):
            resp = client.get("/api/task-types")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_task_types(self, client, tmp_path):
        csv_path = self._create_task_csv(tmp_path, ["multiple_choice", "open_answer", "true_false"])
        with patch("app.routers.task_types.TASK_TYPES_FILE", csv_path):
            resp = client.get("/api/task-types")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 3
        assert "multiple_choice" in data

    # ── CREATE ──

    def test_create_task_type(self, client, tmp_path):
        csv_path = self._create_task_csv(tmp_path)
        with patch("app.routers.task_types.TASK_TYPES_FILE", csv_path):
            resp = client.post("/api/task-types", json={"name": "fill_in_blank"})
        assert resp.status_code == 201
        assert resp.json() == "fill_in_blank"

    def test_create_task_type_duplicate(self, client, tmp_path):
        csv_path = self._create_task_csv(tmp_path, ["fill_in_blank"])
        with patch("app.routers.task_types.TASK_TYPES_FILE", csv_path):
            resp = client.post("/api/task-types", json={"name": "fill_in_blank"})
        assert resp.status_code == 201
        assert resp.json() == "fill_in_blank"

    def test_create_task_type_empty_name(self, client, tmp_path):
        csv_path = self._create_task_csv(tmp_path)
        with patch("app.routers.task_types.TASK_TYPES_FILE", csv_path):
            resp = client.post("/api/task-types", json={"name": "   "})
        assert resp.status_code == 400

    def test_create_task_type_creates_directory(self, client, tmp_path):
        csv_path = tmp_path / "subdir" / "task_types.csv"
        with patch("app.routers.task_types.TASK_TYPES_FILE", csv_path):
            resp = client.post("/api/task-types", json={"name": "new_type"})
        assert resp.status_code == 201
        assert csv_path.parent.exists()
