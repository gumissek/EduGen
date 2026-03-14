"""Tests for prototypes router — list, get, update, delete, restore, copy drafts."""

from __future__ import annotations

from uuid import uuid4

from app.models.document import Document
from app.models.generation import Generation
from app.models.prototype import Prototype
from app.models.subject import Subject


class TestPrototypesRouter:
    """Tests for /api/prototypes endpoints."""

    def _seed_draft(self, db, user):
        """Create a generation+prototype draft (no active document)."""
        subject = Subject(name="Math", is_custom=0, user_id=user.id)
        db.add(subject)
        db.flush()

        gen = Generation(
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
            status="ready",
        )
        db.add(gen)
        db.flush()

        proto = Prototype(
            user_id=user.id,
            generation_id=gen.id,
            original_content="<h1>Original</h1>",
            answer_key="1. a\n2. b",
        )
        db.add(proto)
        db.commit()
        db.refresh(gen)
        db.refresh(proto)
        return gen, proto, subject

    def _seed_finalized(self, db, user):
        """Create a finalized generation with an active document."""
        gen, proto, subject = self._seed_draft(db, user)
        doc = Document(
            user_id=user.id,
            generation_id=gen.id,
            filename="final.docx",
            file_path="/fake/final.docx",
            variants_count=1,
        )
        db.add(doc)
        gen.status = "finalized"
        db.commit()
        db.refresh(doc)
        return gen, proto, doc, subject

    # ── LIST ──

    def test_list_prototypes_empty(self, client):
        resp = client.get("/api/prototypes")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["prototypes"] == []

    def test_list_prototypes_returns_drafts(self, client, db, test_user):
        self._seed_draft(db, test_user)
        resp = client.get("/api/prototypes")
        assert resp.status_code == 200
        assert resp.json()["total"] == 1

    def test_list_prototypes_excludes_finalized(self, client, db, test_user):
        self._seed_finalized(db, test_user)
        resp = client.get("/api/prototypes")
        assert resp.status_code == 200
        assert resp.json()["total"] == 0

    # ── GET ──

    def test_get_prototype(self, client, db, test_user):
        gen, proto, _ = self._seed_draft(db, test_user)
        resp = client.get(f"/api/prototypes/{gen.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["original_content"] == "<h1>Original</h1>"

    def test_get_nonexistent_prototype(self, client):
        resp = client.get("/api/prototypes/nonexistent")
        assert resp.status_code == 404

    # ── UPDATE ──

    def test_update_prototype(self, client, db, test_user):
        gen, proto, _ = self._seed_draft(db, test_user)
        resp = client.put(f"/api/prototypes/{gen.id}", json={
            "edited_content": "<h1>Edited</h1>",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["edited_content"] == "<h1>Edited</h1>"

    def test_update_prototype_with_comments(self, client, db, test_user):
        gen, proto, _ = self._seed_draft(db, test_user)
        resp = client.put(f"/api/prototypes/{gen.id}", json={
            "edited_content": "<h1>Edited</h1>",
            "comments_json": '{"c1": "comment text"}',
        })
        assert resp.status_code == 200
        assert resp.json()["comments_json"] == '{"c1": "comment text"}'

    def test_update_nonexistent_prototype(self, client):
        resp = client.put("/api/prototypes/nonexistent", json={
            "edited_content": "<p>test</p>",
        })
        assert resp.status_code == 404

    # ── DELETE ──

    def test_delete_draft(self, client, db, test_user):
        gen, proto, _ = self._seed_draft(db, test_user)
        resp = client.delete(f"/api/prototypes/{gen.id}")
        assert resp.status_code == 204

        # Generation should be gone
        assert db.query(Generation).filter(Generation.id == gen.id).first() is None

    def test_delete_finalized_blocked(self, client, db, test_user):
        gen, proto, doc, _ = self._seed_finalized(db, test_user)
        resp = client.delete(f"/api/prototypes/{gen.id}")
        assert resp.status_code == 400
        assert "finalized" in resp.json()["detail"].lower()

    def test_delete_nonexistent(self, client):
        resp = client.delete("/api/prototypes/nonexistent")
        assert resp.status_code == 404

    # ── RESTORE ──

    def test_restore_original(self, client, db, test_user):
        gen, proto, _ = self._seed_draft(db, test_user)
        # First edit
        proto.edited_content = "<h1>Modified</h1>"
        db.commit()

        resp = client.post(f"/api/prototypes/{gen.id}/restore")
        assert resp.status_code == 200
        assert resp.json()["edited_content"] is None

    def test_restore_nonexistent(self, client):
        resp = client.post("/api/prototypes/nonexistent/restore")
        assert resp.status_code == 404

    # ── COPY ──

    def test_copy_draft(self, client, db, test_user):
        gen, proto, _ = self._seed_draft(db, test_user)
        resp = client.post(f"/api/prototypes/{gen.id}/copy")
        assert resp.status_code == 201
        data = resp.json()
        assert data["generation_id"] != gen.id
        assert "copy" in data["title"].lower()

    def test_copy_finalized_blocked(self, client, db, test_user):
        gen, proto, doc, _ = self._seed_finalized(db, test_user)
        resp = client.post(f"/api/prototypes/{gen.id}/copy")
        assert resp.status_code == 400

    def test_copy_nonexistent(self, client):
        resp = client.post("/api/prototypes/nonexistent/copy")
        assert resp.status_code == 404
