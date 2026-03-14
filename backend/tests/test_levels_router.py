"""Tests for levels router — education levels and class levels CRUD."""

from __future__ import annotations

import csv
import os
import tempfile
from pathlib import Path
from unittest.mock import patch


class TestLevelsRouter:
    """Tests for /api/levels endpoints."""

    def _patch_data_dir(self, tmp_path):
        """Returns patches for _edu_csv_path, _class_csv_path, and DATA_DIR."""
        edu_csv = tmp_path / "education_levels.csv"
        class_csv = tmp_path / "class_levels.csv"

        # Seed defaults
        edu_csv.write_text(
            "value,label,class_range_start,class_range_end\n"
            "primary,Szkoła podstawowa,1,8\n",
            encoding="utf-8",
        )
        class_csv.write_text(
            "value,label,education_level\n"
            "Klasa 4,Klasa 4,primary\n",
            encoding="utf-8",
        )
        return edu_csv, class_csv

    # ── EDUCATION LEVELS ──

    def test_list_education_levels(self, client, tmp_path):
        edu_csv, class_csv = self._patch_data_dir(tmp_path)
        with (
            patch("app.routers.levels._edu_csv_path", return_value=edu_csv),
            patch("app.routers.levels._class_csv_path", return_value=class_csv),
            patch("app.routers.levels._ensure_csvs"),
        ):
            resp = client.get("/api/levels/education")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["value"] == "primary"

    def test_add_education_level(self, client, tmp_path):
        edu_csv, class_csv = self._patch_data_dir(tmp_path)
        with (
            patch("app.routers.levels._edu_csv_path", return_value=edu_csv),
            patch("app.routers.levels._class_csv_path", return_value=class_csv),
            patch("app.routers.levels._ensure_csvs"),
        ):
            resp = client.post("/api/levels/education", json={
                "value": "secondary",
                "label": "Liceum",
                "class_range_start": 1,
                "class_range_end": 4,
            })
        assert resp.status_code == 201
        assert resp.json()["value"] == "secondary"

    def test_add_duplicate_education_level(self, client, tmp_path):
        edu_csv, class_csv = self._patch_data_dir(tmp_path)
        with (
            patch("app.routers.levels._edu_csv_path", return_value=edu_csv),
            patch("app.routers.levels._class_csv_path", return_value=class_csv),
            patch("app.routers.levels._ensure_csvs"),
        ):
            resp = client.post("/api/levels/education", json={
                "value": "primary",
                "label": "Already exists",
            })
        assert resp.status_code == 400

    def test_delete_education_level(self, client, tmp_path):
        edu_csv, class_csv = self._patch_data_dir(tmp_path)
        with (
            patch("app.routers.levels._edu_csv_path", return_value=edu_csv),
            patch("app.routers.levels._class_csv_path", return_value=class_csv),
            patch("app.routers.levels._ensure_csvs"),
        ):
            resp = client.delete("/api/levels/education/primary")
        assert resp.status_code == 204

        # Verify CSV is empty
        with open(edu_csv, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)
        assert len(rows) == 0

        # Class levels for primary should also be removed
        with open(class_csv, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)
        assert len(rows) == 0

    def test_delete_nonexistent_education_level(self, client, tmp_path):
        edu_csv, class_csv = self._patch_data_dir(tmp_path)
        with (
            patch("app.routers.levels._edu_csv_path", return_value=edu_csv),
            patch("app.routers.levels._class_csv_path", return_value=class_csv),
            patch("app.routers.levels._ensure_csvs"),
        ):
            resp = client.delete("/api/levels/education/nonexistent")
        assert resp.status_code == 404

    # ── CLASS LEVELS ──

    def test_list_class_levels(self, client, tmp_path):
        edu_csv, class_csv = self._patch_data_dir(tmp_path)
        with (
            patch("app.routers.levels._edu_csv_path", return_value=edu_csv),
            patch("app.routers.levels._class_csv_path", return_value=class_csv),
            patch("app.routers.levels._ensure_csvs"),
        ):
            resp = client.get("/api/levels/classes")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_list_class_levels_filtered(self, client, tmp_path):
        edu_csv, class_csv = self._patch_data_dir(tmp_path)
        with (
            patch("app.routers.levels._edu_csv_path", return_value=edu_csv),
            patch("app.routers.levels._class_csv_path", return_value=class_csv),
            patch("app.routers.levels._ensure_csvs"),
        ):
            resp = client.get("/api/levels/classes?education_level=primary")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_list_class_levels_filtered_empty(self, client, tmp_path):
        edu_csv, class_csv = self._patch_data_dir(tmp_path)
        with (
            patch("app.routers.levels._edu_csv_path", return_value=edu_csv),
            patch("app.routers.levels._class_csv_path", return_value=class_csv),
            patch("app.routers.levels._ensure_csvs"),
        ):
            resp = client.get("/api/levels/classes?education_level=secondary")
        assert resp.status_code == 200
        assert len(resp.json()) == 0

    def test_add_class_level(self, client, tmp_path):
        edu_csv, class_csv = self._patch_data_dir(tmp_path)
        with (
            patch("app.routers.levels._edu_csv_path", return_value=edu_csv),
            patch("app.routers.levels._class_csv_path", return_value=class_csv),
            patch("app.routers.levels._ensure_csvs"),
        ):
            resp = client.post("/api/levels/classes", json={
                "value": "Klasa 5",
                "label": "Klasa 5",
                "education_level": "primary",
            })
        assert resp.status_code == 201
        assert resp.json()["value"] == "Klasa 5"

    def test_add_duplicate_class_level(self, client, tmp_path):
        edu_csv, class_csv = self._patch_data_dir(tmp_path)
        with (
            patch("app.routers.levels._edu_csv_path", return_value=edu_csv),
            patch("app.routers.levels._class_csv_path", return_value=class_csv),
            patch("app.routers.levels._ensure_csvs"),
        ):
            resp = client.post("/api/levels/classes", json={
                "value": "Klasa 4",
                "label": "Klasa 4",
                "education_level": "primary",
            })
        assert resp.status_code == 400

    def test_delete_class_level(self, client, tmp_path):
        edu_csv, class_csv = self._patch_data_dir(tmp_path)
        with (
            patch("app.routers.levels._edu_csv_path", return_value=edu_csv),
            patch("app.routers.levels._class_csv_path", return_value=class_csv),
            patch("app.routers.levels._ensure_csvs"),
        ):
            resp = client.delete("/api/levels/classes/primary/Klasa 4")
        assert resp.status_code == 204

    def test_delete_nonexistent_class_level(self, client, tmp_path):
        edu_csv, class_csv = self._patch_data_dir(tmp_path)
        with (
            patch("app.routers.levels._edu_csv_path", return_value=edu_csv),
            patch("app.routers.levels._class_csv_path", return_value=class_csv),
            patch("app.routers.levels._ensure_csvs"),
        ):
            resp = client.delete("/api/levels/classes/primary/nonexistent")
        assert resp.status_code == 404
