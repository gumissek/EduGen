"""Tests for subjects router — CRUD operations and data isolation."""

from __future__ import annotations

from app.models.subject import Subject


class TestListSubjects:
    def test_list_empty(self, client):
        resp = client.get("/api/subjects")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_shows_own_and_predefined(self, client, db, test_user):
        from app.models.user import User
        from app.services.auth_service import hash_password
        from datetime import datetime, timezone
        from uuid import uuid4

        other_user = User(
            id=str(uuid4()),
            email="other@example.com",
            password_hash=hash_password("OtherPass123"),
            first_name="Other",
            last_name="User",
            is_active=True,
            is_superuser=False,
            created_at=datetime.now(timezone.utc).isoformat(),
            updated_at=datetime.now(timezone.utc).isoformat(),
        )
        db.add(other_user)
        db.commit()

        # Predefined subject (no user_id)
        db.add(Subject(name="Matematyka", is_custom=0, user_id=None))
        # User's custom subject
        db.add(Subject(name="Fizyka", is_custom=1, user_id=test_user.id))
        # Another user's subject (should NOT appear)
        db.add(Subject(name="Secret", is_custom=1, user_id=other_user.id))
        db.commit()

        resp = client.get("/api/subjects")
        assert resp.status_code == 200
        names = [s["name"] for s in resp.json()]
        assert "Matematyka" in names
        assert "Fizyka" in names
        assert "Secret" not in names


class TestCreateSubject:
    def test_create_custom(self, client):
        resp = client.post("/api/subjects", json={"name": "Biologia"})
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Biologia"
        assert data["is_custom"] is True

    def test_create_duplicate_rejected(self, client):
        client.post("/api/subjects", json={"name": "Chemia"})
        resp = client.post("/api/subjects", json={"name": "Chemia"})
        assert resp.status_code == 409

    def test_create_empty_name_rejected(self, client):
        resp = client.post("/api/subjects", json={"name": ""})
        assert resp.status_code == 422

    def test_create_invalid_chars_rejected(self, client):
        resp = client.post("/api/subjects", json={"name": "Bad!@#"})
        assert resp.status_code == 422


class TestDeleteSubject:
    def test_delete_own_custom(self, client, db, test_user):
        subj = Subject(name="ToDelete", is_custom=1, user_id=test_user.id)
        db.add(subj)
        db.commit()
        db.refresh(subj)

        resp = client.delete(f"/api/subjects/{subj.id}")
        assert resp.status_code == 204

    def test_delete_nonexistent_returns_404(self, client):
        resp = client.delete("/api/subjects/nonexistent-id")
        assert resp.status_code == 404

    def test_delete_predefined_forbidden(self, client, db, test_user):
        subj = Subject(name="Predefined", is_custom=0, user_id=test_user.id)
        db.add(subj)
        db.commit()
        db.refresh(subj)

        resp = client.delete(f"/api/subjects/{subj.id}")
        assert resp.status_code == 403
