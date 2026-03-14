"""Tests for auth_service — password hashing, JWT tokens, login, registration."""

from __future__ import annotations

import pytest

from app.services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    verify_access_token,
    authenticate_user,
    register_user,
)


# ── Password hashing ────────────────────────────────────────────────────────


class TestPasswordHashing:
    def test_hash_and_verify(self):
        hashed = hash_password("MySecret123")
        assert hashed != "MySecret123"
        assert verify_password("MySecret123", hashed)

    def test_wrong_password_rejected(self):
        hashed = hash_password("CorrectPassword")
        assert not verify_password("WrongPassword", hashed)

    def test_different_hashes_for_same_password(self):
        h1 = hash_password("SamePassword")
        h2 = hash_password("SamePassword")
        assert h1 != h2  # bcrypt salts differ


# ── JWT tokens ───────────────────────────────────────────────────────────────


class TestJWT:
    def test_create_and_verify_token(self):
        token = create_access_token("user-123", "user@test.com")
        payload = verify_access_token(token)
        assert payload is not None
        assert payload["sub"] == "user-123"
        assert payload["email"] == "user@test.com"

    def test_invalid_token_returns_none(self):
        assert verify_access_token("not.a.valid.token") is None

    def test_tampered_token_returns_none(self):
        token = create_access_token("user-1", "a@b.com")
        assert verify_access_token(token + "x") is None


# ── authenticate_user ────────────────────────────────────────────────────────


class TestAuthenticateUser:
    def test_valid_login(self, db, test_user):
        user = authenticate_user(db, "test@example.com", "TestPass123")
        assert user is not None
        assert user.id == test_user.id
        assert user.failed_login_attempts == 0

    def test_wrong_password_increments_failed_attempts(self, db, test_user):
        result = authenticate_user(db, "test@example.com", "WrongPass")
        assert result is None
        db.refresh(test_user)
        assert test_user.failed_login_attempts == 1

    def test_nonexistent_email_returns_none(self, db):
        assert authenticate_user(db, "nobody@test.com", "pass") is None

    def test_inactive_user_rejected(self, db, test_user):
        test_user.is_active = False
        db.commit()
        result = authenticate_user(db, "test@example.com", "TestPass123")
        assert result is None


# ── register_user ────────────────────────────────────────────────────────────


class TestRegisterUser:
    def test_register_creates_user_and_models(self, db):
        user = register_user(db, "new@example.com", "NewPass123", "Jan", "Kowalski")
        assert user.email == "new@example.com"
        assert user.first_name == "Jan"
        assert verify_password("NewPass123", user.password_hash)
        # Default AI models seeded
        assert len(user.ai_models) == 4

    def test_register_duplicate_email_fails(self, db, test_user):
        from sqlalchemy.exc import IntegrityError

        with pytest.raises(IntegrityError):
            register_user(db, "test@example.com", "SomePass123")
