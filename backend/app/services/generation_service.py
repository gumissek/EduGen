"""Generation service — orchestrates the AI generation background task."""

from __future__ import annotations

import json
import traceback
from datetime import datetime, timezone

from sqlalchemy.orm import Session as DBSession

from app.encryption import decrypt_api_key
from app.models.generation import Generation
from app.models.prototype import Prototype
from app.models.settings import UserSettings
from app.models.secret_key import SecretKey
from app.models.source_file import SourceFile
from app.models.diagnostic_log import DiagnosticLog
from app.services.ai_service import build_system_prompt, call_openai, TYPES_WITHOUT_QUESTIONS


def _render_content_html(data: dict, content_type: str = "") -> str:
    """Render AI-generated JSON into HTML content for the WYSIWYG editor."""
    if not isinstance(data, dict):
        return "<p><em>Błąd renderowania: nieprawidłowy format danych AI.</em></p>"

    # Free-form types return content_html directly
    if content_type in TYPES_WITHOUT_QUESTIONS or "content_html" in data:
        html = data.get("content_html") or ""
        if not html:
            # Fallback: wrap title if no content_html
            title = data.get("title") or "Materiał edukacyjny"
            return f"<h1>{title}</h1>"
        return html

    html_parts = []
    title = data.get("title") or "Materiał edukacyjny"
    html_parts.append(f"<h1>{title}</h1>")

    for q in data.get("questions") or []:
        if not isinstance(q, dict):
            continue
        number = q.get("number", "")
        content = q.get("content", "")
        q_type = q.get("type", "open")
        points = q.get("points", 1)

        html_parts.append(f"<p><strong>Pytanie {number}.</strong> ({points} pkt) {content}</p>")

        if q_type == "closed" and q.get("options"):
            html_parts.append("<ul>")
            for opt in q["options"]:
                html_parts.append(f"<li>{opt}</li>")
            html_parts.append("</ul>")

        if q_type == "open":
            html_parts.append('<p style="margin-left: 20px;"><em>[Miejsce na odpowiedź]</em></p>')

    return "\n".join(html_parts)


def _build_answer_key(data: dict) -> str:
    """Build an answer key from the AI response."""
    if not isinstance(data, dict):
        return "Klucz odpowiedzi: (brak danych)"
    lines = ["Klucz odpowiedzi:", ""]
    for q in data.get("questions") or []:
        if not isinstance(q, dict):
            continue
        number = q.get("number", "")
        answer = q.get("correct_answer", "")
        lines.append(f"{number}. {answer}")
    return "\n".join(lines)


def generate_prototype_task(db: DBSession, generation_id: str) -> None:
    """Background task: generate AI prototype for a given generation."""
    generation = db.query(Generation).filter(Generation.id == generation_id).first()
    if not generation:
        return

    try:
        # Update status
        generation.status = "processing"
        generation.updated_at = datetime.now(timezone.utc).isoformat()
        db.commit()

        # Get API key — prefer active secret_key, fall back to settings
        api_key = None
        model = "openai/gpt-5-mini"

        # Try to get key from secret_keys table (first active key)
        secret_key = (
            db.query(SecretKey)
            .filter(SecretKey.user_id == generation.user_id, SecretKey.is_active == True)
            .first()
        )
        if secret_key:
            api_key = decrypt_api_key(secret_key.secret_key_hash)
            # Update last_used_at
            secret_key.last_used_at = datetime.now(timezone.utc).isoformat()

        # Fall back to legacy settings
        if not api_key:
            user_settings = (
                db.query(UserSettings)
                .filter(UserSettings.user_id == generation.user_id)
                .first()
            )
            if user_settings and user_settings.openai_api_key_encrypted:
                api_key = decrypt_api_key(user_settings.openai_api_key_encrypted)

        if not api_key:
            raise ValueError("API key not configured — add a key in Settings")

        # Get model preference from settings
        user_settings_for_model = (
            db.query(UserSettings)
            .filter(UserSettings.user_id == generation.user_id)
            .first()
        )
        if user_settings_for_model and user_settings_for_model.default_model:
            model = user_settings_for_model.default_model

        # Gather source texts
        source_texts = []
        for sf in generation.source_files:
            if sf.extracted_text and sf.deleted_at is None:
                source_texts.append(sf.extracted_text)

        # Build prompt and call OpenAI
        system_prompt = build_system_prompt(generation, source_texts)
        result = call_openai(db, generation, system_prompt, api_key, model)

        # Create prototype
        is_free_form = generation.content_type in TYPES_WITHOUT_QUESTIONS
        original_content = _render_content_html(result, generation.content_type)
        answer_key = "" if is_free_form else _build_answer_key(result)
        # For free-form types, don't store raw questions JSON (there are none)
        raw_json = None if is_free_form else json.dumps(result, ensure_ascii=False)

        prototype = Prototype(
            user_id=generation.user_id,
            generation_id=generation.id,
            original_content=original_content,
            answer_key=answer_key,
            raw_questions_json=raw_json,
        )
        db.add(prototype)

        generation.status = "ready"
        generation.updated_at = datetime.now(timezone.utc).isoformat()
        db.commit()

    except Exception as e:
        generation.status = "error"
        generation.error_message = str(e)
        generation.updated_at = datetime.now(timezone.utc).isoformat()

        # Log to diagnostics
        log = DiagnosticLog(
            level="ERROR",
            message=f"Generation failed: {str(e)}",
            metadata_json=json.dumps({
                "generation_id": generation_id,
                "traceback": traceback.format_exc(),
            }),
        )
        db.add(log)
        db.commit()
