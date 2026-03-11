"""Authentication service — JWT creation/verification, user registration & login."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from sqlalchemy.orm import Session as DBSession

from app.config import settings
from app.models.user import User
from app.models.settings import UserSettings


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against a bcrypt hash."""
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())


def hash_password(plain_password: str) -> str:
    """Hash a plain-text password with bcrypt."""
    return bcrypt.hashpw(plain_password.encode(), bcrypt.gensalt()).decode()


def create_access_token(user_id: str, email: str) -> str:
    """Create a short-lived JWT access token."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "iat": now,
        "exp": now + timedelta(minutes=settings.JWT_EXPIRATION_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def verify_access_token(token: str) -> dict | None:
    """Decode and validate a JWT access token.

    Returns the decoded payload dict or None if invalid/expired.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def authenticate_user(db: DBSession, email: str, password: str) -> User | None:
    """Authenticate user by email and password. Returns the user or None."""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None
    if not user.is_active:
        return None
    if not verify_password(password, user.password_hash):
        # Track failed login attempts
        user.failed_login_attempts += 1
        db.commit()
        return None

    # Reset failed attempts on success
    user.failed_login_attempts = 0
    user.last_login_at = datetime.now(timezone.utc).isoformat()
    db.commit()
    return user


def register_user(
    db: DBSession,
    email: str,
    password: str,
    first_name: str | None = None,
    last_name: str | None = None,
) -> User:
    """Register a new user. Creates associated UserSettings and default AI models."""
    from app.models.user_ai_model import UserAIModel

    now_iso = datetime.now(timezone.utc).isoformat()

    user = User(
        email=email,
        password_hash=hash_password(password),
        first_name=first_name,
        last_name=last_name,
    )
    db.add(user)
    db.flush()

    # Create default settings for the user
    user_settings = UserSettings(user_id=user.id)
    db.add(user_settings)

    # Seed default AI models
    default_models = [
        UserAIModel(
            user_id=user.id,
            provider="openai",
            model_name="gpt-5.1",
            description="Dobry uniwersalny model",
            price_description="Umiarkowana cena",
            is_available=True,
            created_at=now_iso,
            changed_at=None,
            request_made=0,
        ),
        UserAIModel(
            user_id=user.id,
            provider="openai",
            model_name="gpt-5-mini",
            description="Dobry do tekstu",
            price_description="Tani",
            is_available=True,
            created_at=now_iso,
            changed_at=None,
            request_made=0,
        ),
    ]
    db.add_all(default_models)

    db.commit()
    db.refresh(user)
    return user

