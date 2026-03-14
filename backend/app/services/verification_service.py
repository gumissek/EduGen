"""Verification service — token/code generation and validation for email & password changes."""

from __future__ import annotations

import json
import secrets
import string
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session as DBSession

from app.models.user import User
from app.models.verification_token import VerificationToken


def _generate_url_token() -> str:
    """Generate a secure random URL-safe token (48 chars)."""
    return secrets.token_urlsafe(36)


def _generate_numeric_code(length: int = 6) -> str:
    """Generate a random numeric code of the given length."""
    return "".join(secrets.choice(string.digits) for _ in range(length))


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── Email change ──


def create_email_change_token(
    db: DBSession,
    user: User,
    new_email: str,
    expiry_hours: int = 24,
) -> VerificationToken:
    """Create a verification token for email change (link-based, 24h expiry)."""
    # Invalidate any previous pending email-change tokens for this user
    db.query(VerificationToken).filter(
        VerificationToken.user_id == user.id,
        VerificationToken.token_type == "email_change",
        VerificationToken.is_used == False,  # noqa: E712
    ).update({"is_used": True})

    token_value = _generate_url_token()
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=expiry_hours)).isoformat()

    vt = VerificationToken(
        user_id=user.id,
        token=token_value,
        token_type="email_change",
        payload_json=json.dumps({"new_email": new_email}),
        expires_at=expires_at,
        is_used=False,
        created_at=_now_iso(),
    )
    db.add(vt)
    db.commit()
    db.refresh(vt)
    return vt


def confirm_email_change(db: DBSession, token: str) -> User:
    """Validate an email-change token and apply the email change.

    Returns the updated User or raises ValueError with a message.
    """
    vt = db.query(VerificationToken).filter(
        VerificationToken.token == token,
        VerificationToken.token_type == "email_change",
    ).first()

    if not vt:
        raise ValueError("Nieprawidłowy lub nieistniejący token weryfikacyjny")

    if vt.is_used:
        raise ValueError("Ten link weryfikacyjny został już wykorzystany")

    now = datetime.now(timezone.utc)
    expires_at = datetime.fromisoformat(vt.expires_at)
    if now > expires_at:
        raise ValueError("Link weryfikacyjny wygasł (ważny 24h)")

    payload = json.loads(vt.payload_json) if vt.payload_json else {}
    new_email = payload.get("new_email")
    if not new_email:
        raise ValueError("Brak nowego adresu e-mail w tokenie weryfikacyjnym")

    # Check that new email is not already taken
    existing = db.query(User).filter(User.email == new_email, User.id != vt.user_id).first()
    if existing:
        raise ValueError("Podany adres e-mail jest już zajęty przez inne konto")

    # Apply the change
    user = db.query(User).filter(User.id == vt.user_id).first()
    if not user:
        raise ValueError("Nie znaleziono użytkownika")

    user.email = new_email
    user.updated_at = _now_iso()
    vt.is_used = True
    db.commit()
    db.refresh(user)
    return user


# ── Password change ──


def create_password_change_code(
    db: DBSession,
    user: User,
    new_password_hash: str,
    expiry_minutes: int = 5,
) -> VerificationToken:
    """Create a 6-digit verification code for password change (5 min expiry)."""
    # Invalidate previous pending password-change codes for this user
    db.query(VerificationToken).filter(
        VerificationToken.user_id == user.id,
        VerificationToken.token_type == "password_change",
        VerificationToken.is_used == False,  # noqa: E712
    ).update({"is_used": True})

    code = _generate_numeric_code(6)
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=expiry_minutes)).isoformat()

    vt = VerificationToken(
        user_id=user.id,
        token=code,
        token_type="password_change",
        payload_json=json.dumps({"new_password_hash": new_password_hash}),
        expires_at=expires_at,
        is_used=False,
        created_at=_now_iso(),
    )
    db.add(vt)
    db.commit()
    db.refresh(vt)
    return vt


def confirm_password_change(db: DBSession, user_id: str, code: str) -> User:
    """Validate a password-change code and apply the new password.

    Returns the updated User or raises ValueError with a message.
    """
    vt = db.query(VerificationToken).filter(
        VerificationToken.user_id == user_id,
        VerificationToken.token == code,
        VerificationToken.token_type == "password_change",
    ).first()

    if not vt:
        raise ValueError("Nieprawidłowy kod weryfikacyjny")

    if vt.is_used:
        raise ValueError("Ten kod weryfikacyjny został już wykorzystany")

    now = datetime.now(timezone.utc)
    expires_at = datetime.fromisoformat(vt.expires_at)
    if now > expires_at:
        raise ValueError("Kod weryfikacyjny wygasł (ważny 5 minut)")

    payload = json.loads(vt.payload_json) if vt.payload_json else {}
    new_password_hash = payload.get("new_password_hash")
    if not new_password_hash:
        raise ValueError("Brak danych nowego hasła w tokenie weryfikacyjnym")

    user = db.query(User).filter(User.id == vt.user_id).first()
    if not user:
        raise ValueError("Nie znaleziono użytkownika")

    user.password_hash = new_password_hash
    user.last_password_change = _now_iso()
    user.updated_at = _now_iso()
    vt.is_used = True
    db.commit()
    db.refresh(user)
    return user
