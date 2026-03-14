"""Tests for verification_service — email change tokens and password change codes."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from app.models.verification_token import VerificationToken
from app.services.auth_service import hash_password
from app.services.verification_service import (
    create_email_change_token,
    confirm_email_change,
    create_password_change_code,
    confirm_password_change,
)


class TestEmailChangeToken:
    def test_create_token(self, db, test_user):
        vt = create_email_change_token(db, test_user, "new@example.com")
        assert vt.token_type == "email_change"
        assert vt.is_used is False
        assert len(vt.token) > 10

    def test_confirm_email_change(self, db, test_user):
        vt = create_email_change_token(db, test_user, "changed@example.com")
        user = confirm_email_change(db, vt.token)
        assert user.email == "changed@example.com"

    def test_expired_token_rejected(self, db, test_user):
        vt = create_email_change_token(db, test_user, "x@example.com", expiry_hours=0)
        # Force expiry in the past
        vt.expires_at = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        db.commit()
        with pytest.raises(ValueError, match="wygasł"):
            confirm_email_change(db, vt.token)

    def test_used_token_rejected(self, db, test_user):
        vt = create_email_change_token(db, test_user, "y@example.com")
        confirm_email_change(db, vt.token)
        with pytest.raises(ValueError, match="wykorzystany"):
            confirm_email_change(db, vt.token)

    def test_invalid_token_rejected(self, db):
        with pytest.raises(ValueError, match="Nieprawidłowy"):
            confirm_email_change(db, "nonexistent-token")

    def test_previous_tokens_invalidated(self, db, test_user):
        vt1 = create_email_change_token(db, test_user, "first@example.com")
        _vt2 = create_email_change_token(db, test_user, "second@example.com")
        db.refresh(vt1)
        assert vt1.is_used is True  # invalidated by the second creation


class TestPasswordChangeCode:
    def test_create_code(self, db, test_user):
        new_hash = hash_password("NewPassword123")
        vt = create_password_change_code(db, test_user, new_hash)
        assert vt.token_type == "password_change"
        assert len(vt.token) == 6
        assert vt.token.isdigit()

    def test_confirm_password_change(self, db, test_user):
        new_hash = hash_password("ChangedPass123")
        vt = create_password_change_code(db, test_user, new_hash)
        user = confirm_password_change(db, test_user.id, vt.token)
        assert user.password_hash == new_hash

    def test_expired_code_rejected(self, db, test_user):
        new_hash = hash_password("Something123")
        vt = create_password_change_code(db, test_user, new_hash)
        vt.expires_at = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
        db.commit()
        with pytest.raises(ValueError, match="wygasł"):
            confirm_password_change(db, test_user.id, vt.token)

    def test_wrong_code_rejected(self, db, test_user):
        new_hash = hash_password("Anything123")
        create_password_change_code(db, test_user, new_hash)
        with pytest.raises(ValueError, match="Nieprawidłowy"):
            confirm_password_change(db, test_user.id, "000000")
