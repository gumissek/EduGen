"""Tests for files router — upload, list, download, delete source files."""

from __future__ import annotations

import io
from unittest.mock import patch
from uuid import uuid4

from app.models.source_file import SourceFile
from app.models.subject import Subject


class TestFilesRouter:
    """Tests for /api/files endpoints."""

    def _seed_subject(self, db, user) -> Subject:
        subject = Subject(name="Math", is_custom=0, user_id=user.id)
        db.add(subject)
        db.commit()
        db.refresh(subject)
        return subject

    def _seed_file(self, db, user, subject, **overrides) -> SourceFile:
        defaults = dict(
            id=str(uuid4()),
            user_id=user.id,
            subject_id=subject.id,
            filename="test.pdf",
            original_path="/fake/path/test.pdf",
            file_type="pdf",
            file_size=1024,
            file_hash="abc123",
        )
        defaults.update(overrides)
        sf = SourceFile(**defaults)
        db.add(sf)
        db.commit()
        db.refresh(sf)
        return sf

    # ── LIST ──

    def test_list_files_empty(self, client):
        resp = client.get("/api/files")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["files"] == []

    def test_list_files_returns_own(self, client, db, test_user):
        subject = self._seed_subject(db, test_user)
        self._seed_file(db, test_user, subject)
        resp = client.get("/api/files")
        assert resp.status_code == 200
        assert resp.json()["total"] == 1

    def test_list_files_filtered_by_subject(self, client, db, test_user):
        s1 = self._seed_subject(db, test_user)
        s2 = Subject(name="Physics", is_custom=0, user_id=test_user.id)
        db.add(s2)
        db.commit()
        db.refresh(s2)

        self._seed_file(db, test_user, s1, filename="math.pdf")
        self._seed_file(db, test_user, s2, filename="phys.pdf")

        resp = client.get(f"/api/files?subject_id={s1.id}")
        assert resp.status_code == 200
        assert resp.json()["total"] == 1
        assert resp.json()["files"][0]["filename"] == "math.pdf"

    def test_list_files_excludes_deleted(self, client, db, test_user):
        subject = self._seed_subject(db, test_user)
        self._seed_file(db, test_user, subject, deleted_at="2025-01-01T00:00:00+00:00")
        resp = client.get("/api/files")
        assert resp.status_code == 200
        assert resp.json()["total"] == 0

    # ── UPLOAD ──

    @patch("app.routers.files.validate_file", return_value=("application/pdf", "pdf"))
    @patch("app.routers.files.save_file", return_value=("uuid-123", "/fake/path/uuid-123.pdf"))
    @patch("app.routers.files.compute_file_hash", return_value="hash123")
    @patch("app.routers.files.process_file_extraction")
    def test_upload_file_success(self, mock_extract, mock_hash, mock_save, mock_validate, client, db, test_user):
        subject = self._seed_subject(db, test_user)
        file_content = b"fake pdf content"
        resp = client.post(
            "/api/files",
            data={"subject_id": subject.id},
            files={"file": ("test.pdf", io.BytesIO(file_content), "application/pdf")},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["filename"] == "test.pdf"
        assert data["file_type"] == "pdf"

    def test_upload_file_invalid_subject(self, client):
        resp = client.post(
            "/api/files",
            data={"subject_id": "nonexistent"},
            files={"file": ("test.pdf", io.BytesIO(b"data"), "application/pdf")},
        )
        assert resp.status_code == 404

    @patch("app.routers.files.validate_file", side_effect=ValueError("Unsupported file type"))
    def test_upload_file_invalid_type(self, mock_validate, client, db, test_user):
        subject = self._seed_subject(db, test_user)
        resp = client.post(
            "/api/files",
            data={"subject_id": subject.id},
            files={"file": ("test.exe", io.BytesIO(b"data"), "application/octet-stream")},
        )
        assert resp.status_code == 400

    # ── DOWNLOAD ──

    def test_download_nonexistent_file(self, client):
        resp = client.get("/api/files/nonexistent/download")
        assert resp.status_code == 404

    @patch("app.routers.files.Path.exists", return_value=False)
    def test_download_file_missing_on_disk(self, mock_exists, client, db, test_user):
        subject = self._seed_subject(db, test_user)
        sf = self._seed_file(db, test_user, subject)
        resp = client.get(f"/api/files/{sf.id}/download")
        assert resp.status_code == 404

    # ── DELETE ──

    def test_delete_file_success(self, client, db, test_user):
        subject = self._seed_subject(db, test_user)
        sf = self._seed_file(db, test_user, subject)
        resp = client.delete(f"/api/files/{sf.id}")
        assert resp.status_code == 204

        db.refresh(sf)
        assert sf.deleted_at is not None

    def test_delete_nonexistent_file(self, client):
        resp = client.delete("/api/files/nonexistent")
        assert resp.status_code == 404

    # ── EXTRACTION ERROR PARSING ──

    def test_extraction_error_in_response(self, client, db, test_user):
        subject = self._seed_subject(db, test_user)
        sf = self._seed_file(db, test_user, subject, extracted_text="[OCR_ERROR:NO_TEXT_FOUND]")
        resp = client.get("/api/files")
        assert resp.status_code == 200
        file_data = resp.json()["files"][0]
        assert file_data["has_extracted_text"] is False
        assert file_data["extraction_error"] == "NO_TEXT_FOUND"

    def test_successful_extraction_in_response(self, client, db, test_user):
        subject = self._seed_subject(db, test_user)
        self._seed_file(db, test_user, subject, extracted_text="Some extracted text")
        resp = client.get("/api/files")
        assert resp.status_code == 200
        file_data = resp.json()["files"][0]
        assert file_data["has_extracted_text"] is True
        assert file_data["extraction_error"] is None
