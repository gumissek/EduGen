from datetime import UTC, datetime

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.db.models import Session as UserSession
from app.db.models import User
from app.db.session import get_db


def get_current_user(
    db: Session = Depends(get_db),
    authorization: str | None = Header(default=None),
    x_session_token: str | None = Header(default=None),
) -> User:
    token = x_session_token
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Brak tokenu")

    session = db.query(UserSession).filter(UserSession.token == token).first()
    if not session:
        raise HTTPException(status_code=401, detail="Nieprawidłowa sesja")
    if session.expires_at < datetime.now(UTC):
        raise HTTPException(status_code=401, detail="Sesja wygasła")

    session.last_activity_at = datetime.now(UTC)
    db.commit()

    user = db.query(User).filter(User.id == session.user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="Nie znaleziono użytkownika")
    return user
