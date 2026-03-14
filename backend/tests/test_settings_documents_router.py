"""Tests for settings and documents routers."""

from __future__ import annotations

import tempfile
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

from app.models.document import Document
from app.models.generation import Generation
from app.models.prototype import Prototype
from app.models.subject import Subject


class TestSettingsRouter:
    def test_get_settings(self, client):
        resp = client.get("/api/settings")
        assert resp.status_code == 200
        data = resp.json()
        assert "default_model" in data
        assert "has_api_key" in data

    def test_update_default_model(self, client):
        resp = client.put("/api/settings", json={"default_model": "openai/gpt-4o"})
        assert resp.status_code == 200
        assert resp.json()["default_model"] == "openai/gpt-4o"


class TestDocumentsRouter:
    def _seed_document(self, db, user, **doc_overrides):
        """Helper: create a full generation → prototype → document chain."""
        subject = Subject(name="Math", is_custom=0, user_id=user.id)
        db.add(subject)
        db.flush()

        gen = Generation(
            id=str(uuid4()),
            user_id=user.id,
            subject_id=subject.id,
            content_type="test",
            education_level="primary",
            class_level="Klasa 4",
            topic="Addition",
            difficulty=1,
            total_questions=5,
            open_questions=2,
            closed_questions=3,
            variants_count=1,
            status="finalized",
        )
        db.add(gen)
        db.flush()

        proto = Prototype(
            user_id=user.id,
            generation_id=gen.id,
            original_content="<h1>Test</h1>",
            answer_key="1. a",
        )
        db.add(proto)
        db.flush()

        doc_defaults = dict(
            user_id=user.id,
            generation_id=gen.id,
            filename="test_doc.docx",
            file_path="/fake/path/test_doc.docx",
            variants_count=1,
        )
        doc_defaults.update(doc_overrides)
        doc = Document(**doc_defaults)
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return doc, gen

    def test_list_documents(self, client, db, test_user):
        self._seed_document(db, test_user)
        resp = client.get("/api/documents")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        assert len(data["documents"]) >= 1

    def test_get_document_detail(self, client, db, test_user):
        doc, _gen = self._seed_document(db, test_user)
        resp = client.get(f"/api/documents/{doc.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == doc.id
        assert data["content_type"] == "test"

    def test_get_nonexistent_document(self, client):
        resp = client.get("/api/documents/fake-id")
        assert resp.status_code == 404

    # ── UPDATE ──

    def test_update_document_content(self, client, db, test_user):
        doc, _gen = self._seed_document(db, test_user)
        resp = client.put(f"/api/documents/{doc.id}", json={
            "content": "<h1>Updated Content</h1>",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["content"] == "<h1>Updated Content</h1>"

    def test_update_document_with_comments(self, client, db, test_user):
        doc, _gen = self._seed_document(db, test_user)
        resp = client.put(f"/api/documents/{doc.id}", json={
            "content": "<h1>Content</h1>",
            "comments_json": '{"c1": "note"}',
        })
        assert resp.status_code == 200
        assert resp.json()["comments_json"] == '{"c1": "note"}'

    def test_update_nonexistent_document(self, client):
        resp = client.put("/api/documents/fake-id", json={
            "content": "<p>test</p>",
        })
        assert resp.status_code == 404

    # ── DELETE ──

    def test_delete_document(self, client, db, test_user):
        doc, _gen = self._seed_document(db, test_user)
        resp = client.delete(f"/api/documents/{doc.id}")
        assert resp.status_code == 204

        db.refresh(doc)
        assert doc.deleted_at is not None

    def test_delete_nonexistent_document(self, client):
        resp = client.delete("/api/documents/fake-id")
        assert resp.status_code == 404

    def test_deleted_document_excluded_from_list(self, client, db, test_user):
        doc, _gen = self._seed_document(db, test_user)
        client.delete(f"/api/documents/{doc.id}")
        resp = client.get("/api/documents")
        assert resp.status_code == 200
        assert resp.json()["total"] == 0

    # ── LIST FILTERS ──

    def test_list_documents_pagination(self, client, db, test_user):
        for _ in range(3):
            self._seed_document(db, test_user)
        resp = client.get("/api/documents?page=1&per_page=2")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 3
        assert len(data["documents"]) == 2

    def test_list_documents_filter_content_type(self, client, db, test_user):
        self._seed_document(db, test_user)
        resp = client.get("/api/documents?content_type=test")
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1

    # ── FINALIZE ──

    @patch("app.routers.documents.generate_docx")
    def test_finalize_document(self, mock_docx, client, db, test_user):
        doc, gen = self._seed_document(db, test_user)
        gen.status = "ready"
        db.commit()

        mock_doc = Document(
            user_id=test_user.id,
            generation_id=gen.id,
            filename="finalized.docx",
            file_path="/fake/finalized.docx",
            variants_count=1,
        )
        db.add(mock_doc)
        db.commit()
        db.refresh(mock_doc)
        mock_docx.return_value = mock_doc

        resp = client.post(f"/api/documents/{gen.id}/finalize")
        assert resp.status_code == 201

    def test_finalize_nonexistent_generation(self, client):
        resp = client.post("/api/documents/nonexistent/finalize")
        assert resp.status_code == 404

    def test_finalize_processing_generation(self, client, db, test_user):
        doc, gen = self._seed_document(db, test_user)
        gen.status = "processing"
        db.commit()
        resp = client.post(f"/api/documents/{gen.id}/finalize")
        assert resp.status_code == 400

    # ── EXPORT DOCX ──

    def test_export_docx_not_found(self, client):
        resp = client.get("/api/documents/fake-id/export/docx")
        assert resp.status_code == 404

    @patch("app.routers.documents.Path.exists", return_value=False)
    def test_export_docx_missing_file(self, mock_exists, client, db, test_user):
        doc, _gen = self._seed_document(db, test_user)
        resp = client.get(f"/api/documents/{doc.id}/export/docx")
        assert resp.status_code == 404

    # ── EXPORT PDF ──

    def test_export_pdf_not_found(self, client):
        resp = client.get("/api/documents/fake-id/export/pdf")
        assert resp.status_code == 404

    # ── MOVE TO DRAFT ──

    def test_move_to_draft(self, client, db, test_user):
        doc, gen = self._seed_document(db, test_user)
        resp = client.post(f"/api/documents/{doc.id}/move-to-draft")
        assert resp.status_code == 200
        data = resp.json()
        assert data["generation_id"] == gen.id
        assert "draft" in data["message"].lower()

        db.refresh(gen)
        assert gen.status == "ready"
        db.refresh(doc)
        assert doc.deleted_at is not None

    def test_move_to_draft_nonexistent(self, client):
        resp = client.post("/api/documents/fake-id/move-to-draft")
        assert resp.status_code == 404

    # ── COPY ──

    def test_copy_document(self, client, db, test_user):
        # Create a real temp file to copy
        with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as f:
            f.write(b"fake docx content")
            tmp_path = f.name

        try:
            doc, gen = self._seed_document(db, test_user, file_path=tmp_path)
            resp = client.post(f"/api/documents/{doc.id}/copy")
            assert resp.status_code == 201
            data = resp.json()
            assert data["id"] != doc.id
            assert "copy" in data["title"].lower()
        finally:
            Path(tmp_path).unlink(missing_ok=True)
            # Clean up the copy too
            for p in Path(tmp_path).parent.glob("*_copy_*"):
                p.unlink(missing_ok=True)

    def test_copy_nonexistent_document(self, client):
        resp = client.post("/api/documents/fake-id/copy")
        assert resp.status_code == 404

    # ── BULK DOWNLOAD ──

    def test_bulk_download_no_documents(self, client):
        resp = client.post("/api/documents/bulk-download", json={
            "document_ids": ["fake-1", "fake-2"],
        })
        assert resp.status_code == 404
