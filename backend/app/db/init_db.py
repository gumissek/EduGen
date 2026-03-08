from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import generate_uuid
from app.db.models import Base, SettingsModel, Subject, User
from app.db.session import engine


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    with Session(engine) as db:
        user = db.scalar(select(User))
        if not user:
            user = User(id=generate_uuid(), password_hash=settings.static_password_hash)
            db.add(user)
            db.flush()

            db.add(
                SettingsModel(
                    id=generate_uuid(),
                    user_id=user.id,
                    openai_api_key_encrypted="",
                    default_model=settings.default_model,
                )
            )

            for subject in ["Matematyka", "Fizyka", "Język polski", "Historia"]:
                db.add(Subject(id=generate_uuid(), name=subject, is_custom=False))
            db.commit()
