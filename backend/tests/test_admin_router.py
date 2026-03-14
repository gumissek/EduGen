"""Tests for admin router — superuser access control and user management."""

from __future__ import annotations

from uuid import uuid4

from app.models.user import User
from app.services.auth_service import hash_password


class TestAdminAccessControl:
    def test_regular_user_rejected(self, client):
        """Non-superuser should get 403 from admin endpoints."""
        resp = client.get("/api/admin/me")
        assert resp.status_code == 403

    def test_superuser_can_access(self, admin_client):
        resp = admin_client.get("/api/admin/me")
        assert resp.status_code == 200

    def test_list_users(self, admin_client):
        resp = admin_client.get("/api/admin/users")
        assert resp.status_code == 200
        data = resp.json()
        assert "users" in data
        assert "total" in data


class TestAdminUserManagement:
    """Tests for admin user CRUD operations."""

    def _create_user(self, db, email="user@example.com", **overrides):
        from datetime import datetime, timezone

        defaults = dict(
            id=str(uuid4()),
            email=email,
            password_hash=hash_password("Password123"),
            first_name="Regular",
            last_name="User",
            is_active=True,
            is_superuser=False,
            created_at=datetime.now(timezone.utc).isoformat(),
            updated_at=datetime.now(timezone.utc).isoformat(),
        )
        defaults.update(overrides)
        user = User(**defaults)
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    # ── LIST with search ──

    def test_list_users_with_search(self, admin_client, db):
        self._create_user(db, email="specific@example.com", first_name="Specific")
        resp = admin_client.get("/api/admin/users?search=specific")
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1

    def test_list_users_pagination(self, admin_client, db):
        for i in range(5):
            self._create_user(db, email=f"user{i}@example.com")
        resp = admin_client.get("/api/admin/users?page=1&per_page=2")
        assert resp.status_code == 200
        assert len(resp.json()["users"]) <= 2

    # ── UPDATE ──

    def test_update_user(self, admin_client, db):
        user = self._create_user(db)
        resp = admin_client.put(f"/api/admin/users/{user.id}", json={
            "first_name": "Updated",
            "is_active": False,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["first_name"] == "Updated"
        assert data["is_active"] is False

    def test_update_user_email(self, admin_client, db):
        user = self._create_user(db)
        resp = admin_client.put(f"/api/admin/users/{user.id}", json={
            "email": "newemail@example.com",
        })
        assert resp.status_code == 200
        assert resp.json()["email"] == "newemail@example.com"

    def test_update_user_duplicate_email(self, admin_client, db):
        u1 = self._create_user(db, email="first@example.com")
        u2 = self._create_user(db, email="second@example.com")
        resp = admin_client.put(f"/api/admin/users/{u2.id}", json={
            "email": "first@example.com",
        })
        assert resp.status_code == 409

    def test_update_nonexistent_user(self, admin_client):
        resp = admin_client.put("/api/admin/users/nonexistent", json={
            "first_name": "Ghost",
        })
        assert resp.status_code == 404

    # ── DELETE ──

    def test_delete_user(self, admin_client, db):
        user = self._create_user(db)
        resp = admin_client.delete(f"/api/admin/users/{user.id}")
        assert resp.status_code == 200
        assert db.query(User).filter(User.id == user.id).first() is None

    def test_delete_self_blocked(self, admin_client, superuser):
        resp = admin_client.delete(f"/api/admin/users/{superuser.id}")
        assert resp.status_code == 400

    def test_delete_nonexistent_user(self, admin_client):
        resp = admin_client.delete("/api/admin/users/nonexistent")
        assert resp.status_code == 404

    # ── RESET PASSWORD ──

    def test_reset_password(self, admin_client, db):
        user = self._create_user(db)
        resp = admin_client.post(f"/api/admin/users/{user.id}/reset-password", json={
            "new_password": "NewPassword123!",
        })
        assert resp.status_code == 200

        db.refresh(user)
        assert user.failed_login_attempts == 0

    def test_reset_password_nonexistent_user(self, admin_client):
        resp = admin_client.post("/api/admin/users/nonexistent/reset-password", json={
            "new_password": "Password123!",
        })
        assert resp.status_code == 404
