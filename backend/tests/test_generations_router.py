"""Tests for generations router — create, get, list generations."""

from __future__ import annotations

from unittest.mock import patch
from uuid import uuid4

from app.models.generation import Generation
from app.models.subject import Subject
from app.models.source_file import SourceFile


class TestGenerationsRouter:
    """Tests for /api/generations endpoints."""

    def _seed_subject(self, db, user) -> Subject:
        subject = Subject(name="Math", is_custom=0, user_id=user.id)
        db.add(subject)
        db.commit()
        db.refresh(subject)
        return subject

    def _seed_generation(self, db, user, subject, **overrides) -> Generation:
        defaults = dict(
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
        defaults.update(overrides)
        gen = Generation(**defaults)
        db.add(gen)
        db.commit()
        db.refresh(gen)
        return gen

    # ── CREATE ──

    @patch("app.routers.generations.generate_prototype_task")
    def test_create_generation(self, mock_task, client, db, test_user):
        subject = self._seed_subject(db, test_user)
        resp = client.post("/api/generations", json={
            "subject_id": subject.id,
            "content_type": "test",
            "education_level": "primary",
            "class_level": "Klasa 4",
            "topic": "Addition basics",
            "difficulty": 1,
            "total_questions": 5,
            "open_questions": 2,
            "closed_questions": 3,
            "variants_count": 1,
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["topic"] == "Addition basics"
        assert data["status"] == "processing"
        mock_task.assert_called_once()  # Executed via background_tasks (TestClient runs them synchronously)

    @patch("app.routers.generations.generate_prototype_task")
    def test_create_generation_with_source_files(self, mock_task, client, db, test_user):
        subject = self._seed_subject(db, test_user)
        sf = SourceFile(
            user_id=test_user.id,
            subject_id=subject.id,
            filename="source.pdf",
            original_path="/fake/source.pdf",
            file_type="pdf",
            file_size=500,
        )
        db.add(sf)
        db.commit()
        db.refresh(sf)

        resp = client.post("/api/generations", json={
            "subject_id": subject.id,
            "content_type": "test",
            "education_level": "primary",
            "class_level": "Klasa 4",
            "topic": "Test with files",
            "difficulty": 1,
            "total_questions": 5,
            "open_questions": 2,
            "closed_questions": 3,
            "variants_count": 1,
            "source_file_ids": [sf.id],
        })
        assert resp.status_code == 201

    # ── GET ──

    def test_get_generation(self, client, db, test_user):
        subject = self._seed_subject(db, test_user)
        gen = self._seed_generation(db, test_user, subject)
        resp = client.get(f"/api/generations/{gen.id}")
        assert resp.status_code == 200
        assert resp.json()["id"] == gen.id

    def test_get_nonexistent_generation(self, client):
        resp = client.get("/api/generations/nonexistent")
        assert resp.status_code == 404

    # ── LIST ──

    def test_list_generations_empty(self, client):
        resp = client.get("/api/generations")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["generations"] == []

    def test_list_generations(self, client, db, test_user):
        subject = self._seed_subject(db, test_user)
        self._seed_generation(db, test_user, subject, topic="Gen 1")
        self._seed_generation(db, test_user, subject, topic="Gen 2")
        resp = client.get("/api/generations")
        assert resp.status_code == 200
        assert resp.json()["total"] == 2

    def test_list_generations_filter_by_subject(self, client, db, test_user):
        s1 = self._seed_subject(db, test_user)
        s2 = Subject(name="Physics", is_custom=0, user_id=test_user.id)
        db.add(s2)
        db.commit()
        db.refresh(s2)

        self._seed_generation(db, test_user, s1, topic="Math gen")
        self._seed_generation(db, test_user, s2, topic="Physics gen")

        resp = client.get(f"/api/generations?subject_id={s1.id}")
        assert resp.status_code == 200
        assert resp.json()["total"] == 1

    def test_list_generations_filter_by_status(self, client, db, test_user):
        subject = self._seed_subject(db, test_user)
        self._seed_generation(db, test_user, subject, status="ready")
        self._seed_generation(db, test_user, subject, status="processing")

        resp = client.get("/api/generations?status_filter=ready")
        assert resp.status_code == 200
        assert resp.json()["total"] == 1

    def test_list_generations_pagination(self, client, db, test_user):
        subject = self._seed_subject(db, test_user)
        for i in range(5):
            self._seed_generation(db, test_user, subject, topic=f"Gen {i}")

        resp = client.get("/api/generations?page=1&per_page=2")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 5
        assert len(data["generations"]) == 2
