"""Tests for auth router — registration, login, logout, profile endpoints."""

from __future__ import annotations

from unittest.mock import patch


class TestHealthCheck:
    def test_health_ok(self, client):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


class TestRegister:
    def test_register_success(self, client):
        resp = client.post("/api/auth/register", json={
            "email": "newuser@example.com",
            "password": "StrongPass123",
            "first_name": "Jan",
            "last_name": "Nowak",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == "newuser@example.com"
        assert data["first_name"] == "Jan"

    def test_register_duplicate_email(self, client):
        # test_user already exists with test@example.com
        resp = client.post("/api/auth/register", json={
            "email": "test@example.com",
            "password": "AnyPassword123",
        })
        assert resp.status_code == 409

    def test_register_weak_password(self, client):
        resp = client.post("/api/auth/register", json={
            "email": "weak@example.com",
            "password": "short",
        })
        assert resp.status_code == 422

    def test_register_invalid_email(self, client):
        resp = client.post("/api/auth/register", json={
            "email": "not-an-email",
            "password": "StrongPass123",
        })
        assert resp.status_code == 422


class TestLogin:
    def test_login_success(self, client):
        # Register first
        client.post("/api/auth/register", json={
            "email": "login@example.com",
            "password": "LoginPass123",
        })
        resp = client.post("/api/auth/login", json={
            "email": "login@example.com",
            "password": "LoginPass123",
        })
        assert resp.status_code == 200
        assert "access_token" in resp.json()
        assert "edugen-auth" in resp.cookies

    def test_login_wrong_password(self, client):
        resp = client.post("/api/auth/login", json={
            "email": "test@example.com",
            "password": "WrongPassword",
        })
        assert resp.status_code == 401

    def test_login_nonexistent_user(self, client):
        resp = client.post("/api/auth/login", json={
            "email": "nobody@example.com",
            "password": "AnyPass123",
        })
        assert resp.status_code == 401


class TestProfile:
    def test_get_me(self, client):
        resp = client.get("/api/auth/me")
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "test@example.com"
        assert data["is_active"] is True

    def test_update_profile(self, client):
        resp = client.put("/api/auth/me", json={
            "first_name": "Updated",
            "last_name": "Name",
        })
        assert resp.status_code == 200
        assert resp.json()["first_name"] == "Updated"

    def test_update_email_duplicate(self, client, db, test_user):
        # Create another user to conflict with
        from app.services.auth_service import register_user
        register_user(db, email="other@example.com", password="Password123")

        resp = client.put("/api/auth/me", json={
            "email": "other@example.com",
        })
        assert resp.status_code == 409


class TestLogout:
    def test_logout(self, client):
        resp = client.post("/api/auth/logout")
        assert resp.status_code == 200


class TestStats:
    def test_get_stats(self, client):
        resp = client.get("/api/auth/me/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert "documents_count" in data
        assert "generations_count" in data


class TestChangePassword:
    def test_change_password_success(self, client):
        resp = client.post("/api/auth/me/change-password", json={
            "current_password": "TestPass123",
            "new_password": "NewStrongPass456",
        })
        assert resp.status_code == 204

    def test_change_password_wrong_current(self, client):
        resp = client.post("/api/auth/me/change-password", json={
            "current_password": "WrongPassword",
            "new_password": "NewPassword123",
        })
        assert resp.status_code == 400


class TestEmailChangeVerification:
    @patch("app.routers.auth.send_email_change_verification", return_value=False)
    def test_request_email_change(self, mock_send, client):
        resp = client.post("/api/auth/me/request-email-change", json={
            "new_email": "newemail@example.com",
            "password": "TestPass123",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "verification_link" in data

    @patch("app.routers.auth.send_email_change_verification", return_value=False)
    def test_request_email_change_wrong_password(self, mock_send, client):
        resp = client.post("/api/auth/me/request-email-change", json={
            "new_email": "newemail@example.com",
            "password": "WrongPassword",
        })
        assert resp.status_code == 400

    @patch("app.routers.auth.send_email_change_verification", return_value=False)
    def test_request_email_change_same_email(self, mock_send, client):
        resp = client.post("/api/auth/me/request-email-change", json={
            "new_email": "test@example.com",
            "password": "TestPass123",
        })
        assert resp.status_code == 400

    @patch("app.routers.auth.send_email_change_verification", return_value=False)
    def test_request_email_change_taken(self, mock_send, client, db, test_user):
        from app.services.auth_service import register_user
        register_user(db, email="taken@example.com", password="Password123")

        resp = client.post("/api/auth/me/request-email-change", json={
            "new_email": "taken@example.com",
            "password": "TestPass123",
        })
        assert resp.status_code == 409

    def test_verify_email_change_invalid_token(self, client):
        resp = client.get("/api/auth/verify-email-change?token=invalid-token")
        assert resp.status_code == 400

    @patch("app.routers.auth.send_email_change_verification", return_value=False)
    def test_email_change_full_flow(self, mock_send, client, db, test_user):
        # Request email change
        resp = client.post("/api/auth/me/request-email-change", json={
            "new_email": "changed@example.com",
            "password": "TestPass123",
        })
        assert resp.status_code == 200
        link = resp.json()["verification_link"]
        token = link.split("token=")[1]

        # Verify email change
        resp = client.get(f"/api/auth/verify-email-change?token={token}")
        assert resp.status_code == 200


class TestPasswordChangeVerification:
    @patch("app.routers.auth.send_password_change_code")
    def test_request_password_change(self, mock_send, client):
        resp = client.post("/api/auth/me/request-password-change", json={
            "current_password": "TestPass123",
            "new_password": "BrandNewPass789",
        })
        assert resp.status_code == 200

    @patch("app.routers.auth.send_password_change_code")
    def test_request_password_change_wrong_current(self, mock_send, client):
        resp = client.post("/api/auth/me/request-password-change", json={
            "current_password": "WrongPassword",
            "new_password": "BrandNewPass789",
        })
        assert resp.status_code == 400

    def test_confirm_password_change_invalid_code(self, client):
        resp = client.post("/api/auth/me/confirm-password-change", json={
            "code": "000000",
            "new_password": "SomeValidPass123",
        })
        assert resp.status_code == 400

    @patch("app.routers.auth.send_password_change_code")
    def test_password_change_full_flow(self, mock_send, client, db, test_user):
        # Request password change
        resp = client.post("/api/auth/me/request-password-change", json={
            "current_password": "TestPass123",
            "new_password": "FullFlowPass999",
        })
        assert resp.status_code == 200

        # Get the code from DB
        from app.models.verification_token import VerificationToken
        vt = db.query(VerificationToken).filter(
            VerificationToken.user_id == test_user.id,
            VerificationToken.token_type == "password_change",
            VerificationToken.is_used == False,
        ).first()
        assert vt is not None

        # Confirm with the code
        resp = client.post("/api/auth/me/confirm-password-change", json={
            "code": vt.token,
            "new_password": "FullFlowPass999",
        })
        assert resp.status_code == 200
