from __future__ import annotations

import base64
import json

from openai import OpenAI
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import decrypt_text, generate_uuid
from app.db.models import AIRequest, SettingsModel


def _client(api_key: str) -> OpenAI:
    return OpenAI(api_key=api_key, base_url=settings.openai_base_url, timeout=settings.openai_timeout_seconds)


def _log_request(
    db: Session,
    generation_id: str | None,
    model: str,
    request_type: str,
    request_payload: dict,
    response_payload: dict,
) -> None:
    usage = response_payload.get("usage", {}) if isinstance(response_payload, dict) else {}
    db.add(
        AIRequest(
            id=generate_uuid(),
            generation_id=generation_id,
            model_name=model,
            request_type=request_type,
            prompt_tokens=usage.get("prompt_tokens"),
            completion_tokens=usage.get("completion_tokens"),
            total_tokens=usage.get("total_tokens"),
            request_payload=json.dumps(request_payload, ensure_ascii=False),
            response_payload=json.dumps(response_payload, ensure_ascii=False),
        )
    )
    db.commit()


def get_active_api_key(db: Session) -> str | None:
    row = db.query(SettingsModel).first()
    if not row or not row.openai_api_key_encrypted:
        return None
    return decrypt_text(row.openai_api_key_encrypted)


def summarize_with_llm(db: Session, text: str) -> str | None:
    api_key = get_active_api_key(db)
    if not api_key:
        return None
    model = db.query(SettingsModel).first().default_model
    prompt = "Provide a 1-sentence descriptive summary of this educational material.\n\n" + text[:6000]
    req = {"model": model, "input": prompt}
    response = _client(api_key).responses.create(model=model, input=prompt)
    output = response.output_text.strip()
    _log_request(db, None, model, "summary", req, response.model_dump())
    return output


def transcribe_image_with_vision(db: Session, image_bytes: bytes) -> str | None:
    api_key = get_active_api_key(db)
    if not api_key:
        return None
    model = "gpt-5"
    image_base64 = base64.b64encode(image_bytes).decode("utf-8")
    user_input = [
        {
            "role": "user",
            "content": [
                {"type": "input_text", "text": "Transcribe all textual, structural, and mathematical components from this image exactly."},
                {"type": "input_image", "image_url": f"data:image/png;base64,{image_base64}"},
            ],
        }
    ]
    response = _client(api_key).responses.create(model=model, input=user_input)
    _log_request(db, None, model, "vision", {"input": "image"}, response.model_dump())
    return response.output_text.strip()


def generate_prototype(
    db: Session,
    generation_id: str,
    model: str,
    prompt_text: str,
    fallback_questions: int,
) -> tuple[str, str]:
    api_key = get_active_api_key(db)
    if not api_key:
        generated = "\n".join([f"{i+1}. Przykładowe pytanie otwarte" for i in range(max(fallback_questions, 1))])
        answer_key = "\n".join([f"{i+1}. Odpowiedź przykładowa" for i in range(max(fallback_questions, 1))])
        return generated, answer_key

    schema_prompt = (
        "Return JSON with keys: title, questions(list), answer_key(list). "
        "Each question has id, type(open|closed), content, options(optional), correct_answer."
    )
    full_prompt = f"{schema_prompt}\n\n{prompt_text}"
    response = _client(api_key).responses.create(model=model, input=full_prompt)
    _log_request(db, generation_id, model, "generation", {"input": full_prompt[:3000]}, response.model_dump())
    output = response.output_text
    try:
        parsed = json.loads(output)
        questions = parsed.get("questions", [])
        content = [f"{index + 1}. {q.get('content', '')}" for index, q in enumerate(questions)]
        answer_lines = [f"{index + 1}. {q.get('correct_answer', '')}" for index, q in enumerate(questions)]
        return "\n".join(content), "\n".join(answer_lines)
    except Exception:
        return output.strip(), "Klucz odpowiedzi: wygenerowany w treści"
