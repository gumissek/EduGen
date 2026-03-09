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

# Maps frontend enum values → human-readable Polish labels.
# For any custom (free-form) value not found here the raw value is used as-is.
EDUCATION_LEVEL_LABELS: dict[str, str] = {
    "primary":    "szkoła podstawowa",
    "secondary":  "szkoła średnia",
    # legacy / alternative spellings kept for backwards compatibility
    "podstawowa": "szkoła podstawowa",
    "srednia":    "szkoła średnia",
    "średnia":    "szkoła średnia",
}

CONTENT_TYPE_LABELS = {
    "worksheet": "karta pracy",
    "test": "sprawdzian",
    "quiz": "kartkówka",
    "exam": "test",
    "lesson_materials": "materiały na zajęcia",
    # legacy keys
    "karta_pracy": "karta pracy",
    "sprawdzian": "sprawdzian",
    "kartkowka": "kartkówka",
    "materialy": "materiały na zajęcia",
}

# Types that don't use the questions format (no Q&A, no variants)
TYPES_WITHOUT_QUESTIONS = {"worksheet", "lesson_materials"}


def _format_education_label(education_level: str, class_level: str | None) -> str:
    """Return a human-readable education description for use in AI prompts.

    Known enum values ('primary', 'secondary') are translated to Polish labels.
    Any other value (custom string typed by the user) is passed through as-is.
    The class_level string is appended verbatim — no unit inference is done.
    """
    edu = EDUCATION_LEVEL_LABELS.get(
        (education_level or "").strip().lower(),
        (education_level or "").strip() or "nieznany poziom",
    )
    cl = (class_level or "").strip()
    if cl:
        return f"{edu}, {cl}"
    return edu


def build_system_prompt(generation: Generation, source_texts: list[str]) -> str:
    """Build the system prompt for AI generation."""
    content_label = CONTENT_TYPE_LABELS.get(generation.content_type, generation.content_type)
    difficulty_label = DIFFICULTY_LABELS.get(generation.difficulty, "średni")
    education_label = _format_education_label(generation.education_level, generation.class_level)

    if generation.content_type in TYPES_WITHOUT_QUESTIONS:
        return _build_free_form_prompt(generation, source_texts, content_label, difficulty_label, education_label)

    prompt_parts = [
        "Jesteś ekspertem w tworzeniu materiałów edukacyjnych w języku polskim.",
        f"Tworzysz: {content_label}.",
        f"Poziom edukacyjny: {education_label}.",
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


def _build_free_form_prompt(
    generation: Generation,
    source_texts: list[str],
    content_label: str,
    difficulty_label: str,
    education_label: str,
) -> str:
    """Build a system prompt for worksheet or lesson_materials (no questions format)."""
    is_worksheet = generation.content_type == "worksheet"

    if is_worksheet:
        role_desc = (
            "Jesteś ekspertem w tworzeniu materiałów edukacyjnych w języku polskim. "
            "Tworzysz kartę pracy dla UCZNIÓW. "
            "Karta pracy to interaktywny arkusz ćwiczeń przeznaczony dla uczniów, "
            "który zawiera różnorodne zadania (uzupełnianie luk, dopasowywanie, opis, obliczenia, ćwiczenia praktyczne itp.). "
            "NIE twórz pytań w formacie testowym. Twórz angażujące ćwiczenia edukacyjne."
        )
        structure_desc = (
            "Struktura karty pracy powinna zawierać:\n"
            "- Tytuł i metryczkę ucznia (imię, klasa, data)\n"
            "- Cel lekcji (krótko)\n"
            "- Kilka różnorodnych sekcji z ćwiczeniami (np. Zadanie 1, Zadanie 2...)\n"
            "- Każde zadanie z jasną instrukcją i miejscem na odpowiedź\n"
            "- Opcjonalnie: ciekawostkę lub podsumowanie"
        )
    else:
        role_desc = (
            "Jesteś ekspertem w tworzeniu materiałów edukacyjnych w języku polskim. "
            "Tworzysz materiał na zajęcia (scenariusz lekcji) dla NAUCZYCIELA. "
            "Dokument powinien pomóc nauczycielowi poprowadzić lekcję — zawierać plan przebiegu lekcji, "
            "wskazówki metodyczne, propozycje aktywności i metody pracy z uczniami."
        )
        structure_desc = (
            "Struktura materiałów na zajęcia powinna zawierać:\n"
            "- Temat lekcji, czas trwania, klasa\n"
            "- Cele lekcji (ogólne i szczegółowe)\n"
            "- Metody i formy pracy\n"
            "- Potrzebne materiały/środki dydaktyczne\n"
            "- Plan przebiegu lekcji (wstęp, rozwinięcie, podsumowanie) z szacowanym czasem każdego etapu\n"
            "- Propozycje aktywności dla uczniów\n"
            "- Wskazówki dla nauczyciela\n"
            "- Praca domowa (opcjonalnie)"
        )

    prompt_parts = [
        role_desc,
        f"Poziom edukacyjny: {education_label}.",
        f"Poziom trudności materiału: {difficulty_label}.",
    ]

    if generation.language_level:
        prompt_parts.append(f"Poziom językowy: {generation.language_level}.")

    prompt_parts.append(f"Temat: {generation.topic}.")

    if generation.instructions:
        prompt_parts.append(f"Dodatkowe zalecenia: {generation.instructions}")

    if source_texts:
        combined = "\n\n---\n\n".join(source_texts)
        prompt_parts.append(f"Materiał źródłowy:\n{combined}")

    prompt_parts.append(structure_desc)

    prompt_parts.append(
        "Odpowiedz w formacie JSON z następującą strukturą:\n"
        "{\n"
        '  "title": "Tytuł materiału",\n'
        '  "content_html": "<p>Treść w formacie HTML...</p>"\n'
        "}\n"
        "Użyj tagów HTML: <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <br>. "
        "Nie używaj bloków kodu Markdown. Zwróć czyste HTML w polu content_html."
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


import json as _json
import logging as _logging
_reprompt_logger = _logging.getLogger(__name__)


def _normalize_reprompt_response(data: dict) -> dict:
    """Ensure the reprompt response has the expected structure."""
    # Sometimes the model wraps the result under a nested key
    if "questions" not in data:
        # Try to find questions under a nested key
        for key in ("material", "content", "result", "data"):
            if key in data and isinstance(data[key], dict) and "questions" in data[key]:
                data = data[key]
                break
        else:
            # Give a meaningful error so the caller can surface it
            raise ValueError(
                f"Odpowiedź AI nie zawiera klucza 'questions'. "
                f"Otrzymane klucze: {list(data.keys())}"
            )
    if not isinstance(data.get("questions"), list):
        raise ValueError(
            f"Klucz 'questions' nie jest listą: {type(data.get('questions'))}"
        )
    return data


def call_openai_reprompt_free_form(
    db: DBSession,
    generation: Generation,
    current_content: str,
    user_prompt: str,
    api_key: str,
    model: str,
) -> str:
    """Call OpenAI to modify free-form (worksheet/lesson_materials) content based on user feedback.

    Returns the modified HTML content string.
    """
    client = OpenAI(api_key=api_key)

    is_worksheet = generation.content_type == "worksheet"
    type_hint = "karta pracy (dla uczniów)" if is_worksheet else "materiał na zajęcia (dla nauczyciela)"

    messages = [
        {
            "role": "system",
            "content": (
                f"Jesteś ekspertem w tworzeniu materiałów edukacyjnych w języku polskim. "
                f"Użytkownik prosi o modyfikację istniejącego dokumentu: {type_hint}. "
                "Zwróć CAŁY zmodyfikowany materiał w formacie JSON:\n"
                '{"title": "Tytuł materiału", "content_html": "<p>Treść w HTML...</p>"}\n'
                "Użyj tagów HTML: <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <br>. "
                "Nie używaj bloków kodu Markdown."
            ),
        },
        {
            "role": "user",
            "content": f"Aktualny materiał (HTML):\n{current_content}\n\nUwagi do modyfikacji:\n{user_prompt}",
        },
    ]

    try:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            response_format={"type": "json_object"},
        )

        content = response.choices[0].message.content or "{}"
        usage = response.usage

        parsed = json.loads(content)
        html_content = parsed.get("content_html", "")

        ai_request = AIRequest(
            generation_id=generation.id,
            model_name=model,
            prompt_tokens=usage.prompt_tokens if usage else None,
            completion_tokens=usage.completion_tokens if usage else None,
            total_tokens=usage.total_tokens if usage else None,
            request_type="reprompt_free_form",
            request_payload=json.dumps({"messages": messages}, ensure_ascii=False)[:10000],
            response_payload=content[:10000],
        )
        db.add(ai_request)
        db.commit()

        return html_content

    except Exception as e:
        ai_request = AIRequest(
            generation_id=generation.id,
            model_name=model,
            request_type="reprompt_free_form",
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
            response_format={"type": "json_object"},
        )

        content = response.choices[0].message.content or "{}"
        usage = response.usage

        # Parse and validate structure before persisting
        try:
            parsed = json.loads(content)
        except json.JSONDecodeError as json_err:
            _reprompt_logger.error(
                "Reprompt JSON decode error. Raw content (first 500 chars): %s",
                content[:500],
            )
            ai_request_err = AIRequest(
                generation_id=generation.id,
                model_name=model,
                request_type="reprompt",
                request_payload=json.dumps({"messages": messages}, ensure_ascii=False)[:10000],
                response_payload=content[:10000],
            )
            db.add(ai_request_err)
            db.commit()
            raise ValueError(
                f"AI zwróciło nieprawidłowy JSON: {json_err}. "
                f"Fragment odpowiedzi: {content[:200]}"
            ) from json_err

        try:
            parsed = _normalize_reprompt_response(parsed)
        except ValueError as struct_err:
            _reprompt_logger.error("Reprompt response structure invalid: %s", struct_err)
            ai_request_err = AIRequest(
                generation_id=generation.id,
                model_name=model,
                request_type="reprompt",
                request_payload=json.dumps({"messages": messages}, ensure_ascii=False)[:10000],
                response_payload=content[:10000],
            )
            db.add(ai_request_err)
            db.commit()
            raise

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

        return parsed

    except Exception as e:
        # Only log & persist if not already handled above
        if not isinstance(e, (ValueError, json.JSONDecodeError)):
            _reprompt_logger.error("Reprompt OpenAI error: %s", e)
            try:
                ai_request = AIRequest(
                    generation_id=generation.id,
                    model_name=model,
                    request_type="reprompt",
                    request_payload=json.dumps({"messages": messages, "error": str(e)}, ensure_ascii=False)[:10000],
                )
                db.add(ai_request)
                db.commit()
            except Exception:
                pass
        raise
