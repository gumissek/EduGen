"""AI service — prompt builder and OpenAI calls."""

from __future__ import annotations

import json
from datetime import datetime, timezone

from openai import OpenAI
from sqlalchemy.orm import Session as DBSession

from app.encryption import decrypt_api_key
from app.models.settings import UserSettings
from app.models.ai_request import AIRequest
from app.models.generation import Generation
from app.models.source_file import SourceFile


DIFFICULTY_LABELS = {
    1: "łatwy",
    2: "średni",
    3: "trudny",
    4: "bardzo trudny",
}

CONTENT_TYPE_LABELS = {
    "karta_pracy": "karta pracy",
    "sprawdzian": "sprawdzian",
    "kartkowka": "kartkówka",
    "test": "test",
    "materialy": "materiały na zajęcia",
}


def build_system_prompt(generation: Generation, source_texts: list[str]) -> str:
    """Build the system prompt for AI generation."""
    content_label = CONTENT_TYPE_LABELS.get(generation.content_type, generation.content_type)
    difficulty_label = DIFFICULTY_LABELS.get(generation.difficulty, "średni")

    education_label = "szkoła podstawowa" if generation.education_level == "podstawowa" else "szkoła średnia (liceum/technikum)"

    prompt_parts = [
        "Jesteś ekspertem w tworzeniu materiałów edukacyjnych w języku polskim.",
        f"Tworzysz: {content_label}.",
        f"Poziom edukacyjny: {education_label}, klasa {generation.class_level}.",
        f"Poziom trudności: {difficulty_label}.",
    ]

    if generation.language_level:
        prompt_parts.append(f"Poziom językowy: {generation.language_level}.")

    prompt_parts.append(f"Temat: {generation.topic}.")

    if generation.instructions:
        prompt_parts.append(f"Dodatkowe zalecenia: {generation.instructions}")

    if source_texts:
        combined = "\n\n---\n\n".join(source_texts)
        prompt_parts.append(f"Materiał źródłowy:\n{combined}")

    prompt_parts.append(
        f"Wygeneruj dokładnie {generation.total_questions} pytań: "
        f"{generation.open_questions} pytań otwartych i {generation.closed_questions} pytań zamkniętych."
    )

    if generation.closed_questions > 0:
        prompt_parts.append(
            "Dla pytań zamkniętych podaj 4 opcje odpowiedzi (a, b, c, d) z jedną poprawną."
        )

    prompt_parts.append(
        "Odpowiedz w formacie JSON z następującą strukturą:\n"
        "{\n"
        '  "title": "Tytuł materiału",\n'
        '  "questions": [\n'
        "    {\n"
        '      "number": 1,\n'
        '      "type": "open" | "closed",\n'
        '      "content": "Treść pytania",\n'
        '      "options": ["a) ...", "b) ...", "c) ...", "d) ..."],  // tylko dla closed\n'
        '      "correct_answer": "Poprawna odpowiedź",\n'
        '      "points": 1\n'
        "    }\n"
        "  ]\n"
        "}"
    )

    return "\n\n".join(prompt_parts)


def call_openai(
    db: DBSession,
    generation: Generation,
    system_prompt: str,
    api_key: str,
    model: str,
    request_type: str = "generation",
) -> dict:
    """Call OpenAI API and log the request."""
    client = OpenAI(api_key=api_key)

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": "Wygeneruj materiał zgodnie z powyższymi wytycznymi."},
    ]

    try:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            response_format={"type": "json_object"},
        )

        content = response.choices[0].message.content or "{}"
        usage = response.usage

        # Log the request
        ai_request = AIRequest(
            generation_id=generation.id,
            model_name=model,
            prompt_tokens=usage.prompt_tokens if usage else None,
            completion_tokens=usage.completion_tokens if usage else None,
            total_tokens=usage.total_tokens if usage else None,
            request_type=request_type,
            request_payload=json.dumps({"messages": messages}, ensure_ascii=False)[:10000],
            response_payload=content[:10000],
        )
        db.add(ai_request)
        db.commit()

        return json.loads(content)

    except Exception as e:
        # Log the failed request
        ai_request = AIRequest(
            generation_id=generation.id,
            model_name=model,
            request_type=request_type,
            request_payload=json.dumps({"messages": messages, "error": str(e)}, ensure_ascii=False)[:10000],
        )
        db.add(ai_request)
        db.commit()
        raise


def call_openai_reprompt(
    db: DBSession,
    generation: Generation,
    current_content: str,
    user_prompt: str,
    api_key: str,
    model: str,
    raw_questions_json: str | None = None,
) -> dict:
    """Call OpenAI to modify existing content based on user feedback."""
    client = OpenAI(api_key=api_key)

    # Prefer structured JSON over HTML for reprompting
    if raw_questions_json:
        material_context = f"Aktualny materiał (format JSON):\n{raw_questions_json}"
    else:
        material_context = f"Aktualny materiał (HTML):\n{current_content}"

    messages = [
        {
            "role": "system",
            "content": (
                "Jesteś ekspertem w tworzeniu materiałów edukacyjnych w języku polskim. "
                "Użytkownik prosi o modyfikację istniejącego materiału. "
                "Zwróć CAŁY zmodyfikowany materiał w formacie JSON:\n"
                "{\n"
                '  "title": "Tytuł materiału",\n'
                '  "questions": [\n'
                "    {\n"
                '      "number": 1,\n'
                '      "type": "open" | "closed",\n'
                '      "content": "Treść pytania",\n'
                '      "options": ["a) ...", "b) ...", "c) ...", "d) ..."],\n'
                '      "correct_answer": "Poprawna odpowiedź",\n'
                '      "points": 1\n'
                "    }\n"
                "  ]\n"
                "}"
            ),
        },
        {
            "role": "user",
            "content": f"{material_context}\n\nUwagi do modyfikacji:\n{user_prompt}",
        },
    ]

    try:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.7,
            response_format={"type": "json_object"},
        )

        content = response.choices[0].message.content or "{}"
        usage = response.usage

        ai_request = AIRequest(
            generation_id=generation.id,
            model_name=model,
            prompt_tokens=usage.prompt_tokens if usage else None,
            completion_tokens=usage.completion_tokens if usage else None,
            total_tokens=usage.total_tokens if usage else None,
            request_type="reprompt",
            request_payload=json.dumps({"messages": messages}, ensure_ascii=False)[:10000],
            response_payload=content[:10000],
        )
        db.add(ai_request)
        db.commit()

        return json.loads(content)

    except Exception as e:
        ai_request = AIRequest(
            generation_id=generation.id,
            model_name=model,
            request_type="reprompt",
            request_payload=json.dumps({"messages": messages, "error": str(e)}, ensure_ascii=False)[:10000],
        )
        db.add(ai_request)
        db.commit()
        raise
