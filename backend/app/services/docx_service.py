"""Document export service — HTML → Markdown → DOCX / PDF pipeline.

Uses BeautifulSoup to clean TipTap HTML, markdownify to convert to Markdown,
and pypandoc (Pandoc) to produce DOCX and PDF output files.
"""

from __future__ import annotations

import copy
import json
import logging
import random
import re
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import pypandoc
from bs4 import BeautifulSoup
from markdownify import markdownify as md_convert
from sqlalchemy.orm import Session as DBSession

from app.config import settings
from app.models.generation import Generation
from app.models.prototype import Prototype
from app.models.document import Document
from app.models.subject import Subject
from app.services.ai_service import TYPES_WITHOUT_QUESTIONS

logger = logging.getLogger(__name__)

# ── Folder name mappings ────────────────────────────────────────────────────

CONTENT_TYPE_FOLDER_NAMES = {
    "worksheet": "Karta_pracy",
    "test": "Sprawdzian",
    "quiz": "Kartkowka",
    "exam": "Test",
    "lesson_materials": "Materialy_na_zajeciach",
}

EDUCATION_LEVEL_FOLDER_NAMES = {
    "primary": "Szkola_podstawowa",
    "secondary": "Szkola_srednia",
}

_OPTION_LETTERS = {0: "a", 1: "b", 2: "c", 3: "d", 4: "e", 5: "f"}

# Unique marker replaced with Pandoc page break after Markdown conversion
_PAGE_BREAK_MARKER = "<!--PAGEBREAK-->"


# ── HTML cleaning ───────────────────────────────────────────────────────────


def _clean_tiptap_html(html: str) -> str:
    """Clean TipTap editor HTML for conversion.

    Removes scripts, styles, navigation, TipTap-specific artifacts,
    and unwraps comment marks while preserving their text content.
    """
    soup = BeautifulSoup(html, "html.parser")

    # Remove unwanted tags entirely
    for tag_name in ("script", "style", "nav", "footer", "colgroup"):
        for tag in soup.find_all(tag_name):
            tag.decompose()

    # Unwrap comment marks — keep text, remove the <mark> wrapper
    for mark in soup.find_all("mark", class_="tiptap-comment"):
        mark.unwrap()

    # Remove colspan="1" and rowspan="1" attributes (TipTap defaults)
    for tag in soup.find_all(["td", "th"]):
        if tag.get("colspan") == "1":
            del tag["colspan"]
        if tag.get("rowspan") == "1":
            del tag["rowspan"]

    # Remove truly empty paragraphs (no text, no child elements)
    for p in soup.find_all("p"):
        if not p.get_text(strip=True) and not p.find_all(True):
            p.decompose()

    return str(soup)


def _html_to_markdown(html: str) -> str:
    """Convert cleaned HTML to Markdown using markdownify."""
    markdown = md_convert(
        html,
        heading_style="ATX",
        bullets="-",
        strip=["img"],
    )
    # Replace page break markers with Pandoc \newpage command
    markdown = markdown.replace(_PAGE_BREAK_MARKER, "\n\\newpage\n")
    return markdown.strip()


# ── Question parsing (preserved from original) ─────────────────────────────


def _parse_content_to_questions(content: str) -> list[dict]:
    """Parse HTML content or JSON back to a list of question dicts.

    Tries JSON first, then falls back to a basic HTML parser.
    """
    try:
        data = json.loads(content)
        if isinstance(data, dict) and "questions" in data:
            return data["questions"]
        if isinstance(data, list):
            return data
    except (json.JSONDecodeError, TypeError):
        pass

    questions: list[dict] = []
    parts = re.split(r"<p><strong>Pytanie (\d+)\.</strong>", content)

    for i in range(1, len(parts), 2):
        number = int(parts[i])
        rest = parts[i + 1] if i + 1 < len(parts) else ""

        match = re.match(r"\s*\((\d+) pkt\)\s*(.*?)</p>", rest, re.DOTALL)
        if match:
            points = int(match.group(1))
            q_content = re.sub(r"<[^>]+>", "", match.group(2)).strip()
        else:
            points = 1
            q_content = re.sub(r"<[^>]+>", "", rest).strip()

        options: list[str] = []
        option_matches = re.findall(r"<li>(.*?)</li>", rest, re.DOTALL)
        if option_matches:
            options = [re.sub(r"<[^>]+>", "", opt).strip() for opt in option_matches]

        q_type = "closed" if options else "open"

        questions.append({
            "number": number,
            "type": q_type,
            "content": q_content,
            "options": options,
            "correct_answer": "",
            "points": points,
        })

    return questions


def _parse_answer_key(answer_key_text: str) -> dict[int, str]:
    """Parse answer key text to a dict mapping question number → answer."""
    answers: dict[int, str] = {}
    for line in answer_key_text.splitlines():
        match = re.match(r"(\d+)\.\s*(.+)", line.strip())
        if match:
            answers[int(match.group(1))] = match.group(2).strip()
    return answers


# ── Variant shuffling (preserved from original) ────────────────────────────


def _strip_letter_prefix(text: str) -> str:
    """Strip option letter prefix like 'a) ' from answer text."""
    m = re.match(r"^[a-f]\)\s*(.*)", text.strip())
    return m.group(1).strip() if m else text.strip()


def _shuffle_variant(
    questions: list[dict], answer_map: dict[int, str],
) -> tuple[list[dict], dict[int, str]]:
    """Shuffle questions and options within closed questions for a variant."""
    shuffled = copy.deepcopy(questions)
    current_map = dict(answer_map)

    open_qs = [q for q in shuffled if q["type"] == "open"]
    closed_qs = [q for q in shuffled if q["type"] == "closed"]

    random.shuffle(open_qs)
    random.shuffle(closed_qs)

    for q in closed_qs:
        if q.get("options"):
            original_number = q["number"]
            correct_answer = current_map.get(original_number, "")
            correct_text = _strip_letter_prefix(correct_answer)

            random.shuffle(q["options"])

            if correct_text:
                for idx, opt in enumerate(q["options"]):
                    if _strip_letter_prefix(opt).lower() == correct_text.lower():
                        new_letter = _OPTION_LETTERS.get(idx, str(idx + 1))
                        current_map[original_number] = f"{new_letter}) {correct_text}"
                        break

    merged = closed_qs + open_qs

    new_answer_map: dict[int, str] = {}
    for i, q in enumerate(merged, 1):
        old_number = q["number"]
        q["number"] = i
        if old_number in current_map:
            new_answer_map[i] = current_map[old_number]

    return merged, new_answer_map


# ── Q&A rendering to HTML (for pipeline) ───────────────────────────────────


def _render_questions_to_html(
    questions: list[dict],
    topic: str,
    group_label: str,
) -> str:
    """Render a list of questions as HTML for one variant."""
    parts: list[str] = [
        f"<h1>{topic}</h1>",
        f"<p><strong>{group_label}</strong></p>",
        "<p>Data: ___________</p>",
        "<hr>",
    ]

    for q in questions:
        points = q.get("points", 1)
        content = q.get("content", "")
        number = q["number"]
        parts.append(
            f"<p><strong>Pytanie {number}.</strong> ({points} pkt) {content}</p>"
        )

        if q["type"] == "closed" and q.get("options"):
            parts.append("<ul>")
            for opt in q["options"]:
                parts.append(f"<li>{opt}</li>")
            parts.append("</ul>")
        elif q["type"] == "open":
            for _ in range(3):
                parts.append(f'<p>{"." * 80}</p>')

    return "\n".join(parts)


def _render_answer_key_to_html(
    all_variants_answers: list[tuple[str, dict[int, str]]],
) -> str:
    """Render answer key for all variants as HTML."""
    parts: list[str] = ["<h1>Klucz odpowiedzi</h1>"]
    for group_label, answer_map in all_variants_answers:
        parts.append(f"<h2>{group_label}</h2>")
        for num in sorted(answer_map.keys()):
            parts.append(f"<p>{num}. {answer_map[num]}</p>")
    return "\n".join(parts)


# ── Pandoc conversion wrappers ──────────────────────────────────────────────


def _markdown_to_docx(markdown: str, output_path: str) -> None:
    """Convert Markdown text to DOCX using Pandoc."""
    pypandoc.convert_text(
        markdown,
        "docx",
        format="md",
        outputfile=output_path,
    )


def _find_font_path(name: str) -> str | None:
    """Find a TrueType font file by name across common system directories."""
    search_dirs = [
        # Linux (Docker / Debian)
        Path("/usr/share/fonts"),
        # Windows
        Path("C:/Windows/Fonts"),
        # macOS
        Path("/Library/Fonts"),
        Path.home() / "Library" / "Fonts",
    ]
    for d in search_dirs:
        if not d.exists():
            continue
        for p in d.rglob(name):
            return str(p).replace("\\", "/")
    return None


_pdf_font_cache: tuple[str, dict[str, str]] | None = None


def _register_pdf_fonts() -> tuple[str, dict[str, str]]:
    """Register a Unicode TTF font family with ReportLab for xhtml2pdf.

    xhtml2pdf uses ReportLab internally — fonts must be registered via
    ``pdfmetrics`` so that Polish diacritics (ąćęłńóśźż) render correctly.
    The registration is done once and cached for the process lifetime.

    Returns:
        Tuple of selected font family name and a dict with available TTF paths:
        ``{"normal": ..., "bold": ..., "italic": ..., "boldItalic": ...}``.
    """
    global _pdf_font_cache  # noqa: PLW0603

    if _pdf_font_cache is not None:
        return _pdf_font_cache

    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont

    # Try DejaVu Sans first (Docker / Linux), then Arial (Windows)
    font_sets = [
        (
            "EduGenDejaVuSans",
            "DejaVuSans.ttf",
            "DejaVuSans-Bold.ttf",
            "DejaVuSans-Oblique.ttf",
            "DejaVuSans-BoldOblique.ttf",
        ),
        (
            "EduGenArial",
            "arial.ttf",
            "arialbd.ttf",
            "ariali.ttf",
            "arialbi.ttf",
        ),
    ]

    for family, regular, bold, italic, bold_italic in font_sets:
        reg_path = _find_font_path(regular)
        if not reg_path:
            continue

        try:
            pdfmetrics.registerFont(TTFont(family, reg_path))

            bold_rlab = family
            italic_rlab = family
            bi_rlab = family

            font_paths: dict[str, str] = {"normal": reg_path}

            bold_path = _find_font_path(bold)
            if bold_path:
                bold_rlab = f"{family}-Bold"
                pdfmetrics.registerFont(TTFont(bold_rlab, bold_path))
                font_paths["bold"] = bold_path

            italic_path = _find_font_path(italic)
            if italic_path:
                italic_rlab = f"{family}-Italic"
                pdfmetrics.registerFont(TTFont(italic_rlab, italic_path))
                font_paths["italic"] = italic_path

            bi_path = _find_font_path(bold_italic)
            if bi_path:
                bi_rlab = f"{family}-BoldItalic"
                pdfmetrics.registerFont(TTFont(bi_rlab, bi_path))
                font_paths["boldItalic"] = bi_path

            pdfmetrics.registerFontFamily(
                family,
                normal=family,
                bold=bold_rlab,
                italic=italic_rlab,
                boldItalic=bi_rlab,
            )
            _pdf_font_cache = (family, font_paths)
            logger.info("Registered PDF font family: %s", family)
            return _pdf_font_cache
        except Exception:  # pragma: no cover - defensive fallback for env-specific font issues
            logger.exception("Failed to register PDF font family: %s", family)
            continue

    logger.warning("No Unicode TTF font found – PDF may lack Polish diacritics")
    _pdf_font_cache = ("Helvetica", {})
    return _pdf_font_cache


def _register_xhtml2pdf_font_alias(font_family: str) -> None:
    """Register custom font family alias in xhtml2pdf font map."""
    from xhtml2pdf.default import DEFAULT_FONT

    key = font_family.lower()
    if key not in DEFAULT_FONT:
        DEFAULT_FONT[key] = font_family


def _markdown_to_pdf(markdown: str, output_path: str) -> None:
    """Convert Markdown text to PDF via HTML (Pandoc → xhtml2pdf).

    Uses Pandoc for Markdown → HTML and xhtml2pdf for HTML → PDF.
    Registers a Unicode-capable font with ReportLab so Polish diacritics
    render correctly.
    """
    from xhtml2pdf import pisa

    font_family, _font_paths = _register_pdf_fonts()
    _register_xhtml2pdf_font_alias(font_family)

    html_body = pypandoc.convert_text(markdown, "html", format="md")
    html_doc = (
        "<html><head><meta charset='utf-8'/>"
        "<style>"
        f"@page {{ size: A4; margin: 2cm; }}"
        f"body {{ font-family: '{font_family}'; font-size: 12px; line-height: 1.5; }}"
        f"h1 {{ font-family: '{font_family}'; font-size: 20px; margin-top: 0.8em; margin-bottom: 0.4em; }}"
        f"h2 {{ font-family: '{font_family}'; font-size: 16px; margin-top: 0.8em; margin-bottom: 0.4em; }}"
        f"h3 {{ font-family: '{font_family}'; font-size: 14px; margin-top: 0.6em; margin-bottom: 0.3em; }}"
        f"p, li, td, th {{ font-family: '{font_family}'; }}"
        "table { border-collapse: collapse; width: 100%; margin: 0.5em 0; }"
        "th, td { border: 1px solid #333; padding: 6px 8px; text-align: left; }"
        "th { background-color: #f0f0f0; }"
        "ul, ol { margin: 0.3em 0; padding-left: 1.5em; }"
        "hr { border: none; border-top: 1px solid #999; margin: 1em 0; }"
        "</style></head><body>"
        f"{html_body}"
        "</body></html>"
    )

    with open(output_path, "wb") as f:
        result = pisa.CreatePDF(
            html_doc,
            dest=f,
            encoding="utf-8",
        )
    if result.err:
        raise RuntimeError(f"xhtml2pdf conversion failed (error count: {result.err})")


def export_content_as_pdf(file_path: str) -> bytes:
    """Generate PDF from the Markdown source file saved alongside a DOCX.

    Reads the .md file stored next to the DOCX and converts it to PDF.
    Returns the PDF content as bytes.
    """
    md_path = Path(file_path).with_suffix(".md")
    if not md_path.exists():
        raise FileNotFoundError(f"Markdown source not found: {md_path}")

    markdown = md_path.read_text(encoding="utf-8")

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        _markdown_to_pdf(markdown, tmp_path)
        return Path(tmp_path).read_bytes()
    finally:
        Path(tmp_path).unlink(missing_ok=True)


# ── Hierarchical directory builder ──────────────────────────────────────────


def _build_output_dir(generation: Generation, db: DBSession) -> Path:
    """Build the hierarchical output directory for a generation."""
    subject = db.query(Subject).filter(Subject.id == generation.subject_id).first()
    subject_folder = re.sub(r'[<>:"/\\|?*]', "_", subject.name) if subject else generation.id

    content_type_folder = CONTENT_TYPE_FOLDER_NAMES.get(
        generation.content_type,
        re.sub(r'[<>:"/\\|?*]', "_", generation.content_type),
    )
    education_level_folder = EDUCATION_LEVEL_FOLDER_NAMES.get(
        generation.education_level,
        re.sub(r'[<>:"/\\|?*]', "_", str(generation.education_level).strip())
        if generation.education_level
        else "brak_poziomu",
    )
    class_level_folder = (
        re.sub(r'[<>:"/\\|?*]', "_", str(generation.class_level).strip())
        if generation.class_level
        else "brak_klasy"
    )

    docs_dir = (
        Path(settings.DATA_DIR)
        / "documents"
        / content_type_folder
        / education_level_folder
        / class_level_folder
        / subject_folder
    )
    docs_dir.mkdir(parents=True, exist_ok=True)
    return docs_dir


def _build_filename(topic: str) -> str:
    """Build a sanitized filename from the topic."""
    name = f"{topic[:50].replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.docx"
    return re.sub(r'[<>:"/\\|?*]', "_", name)


# ── Main generate_docx function ────────────────────────────────────────────


def generate_docx(
    db: DBSession, generation_id: str, user_id: str | None = None,
) -> Document:
    """Generate a DOCX file from a prototype using the HTML → MD → Pandoc pipeline.

    For free-form content types (worksheet, lesson_materials):
        TipTap HTML → BeautifulSoup clean → markdownify → Markdown → Pandoc → DOCX

    For Q&A content types (test, quiz, exam):
        Questions JSON/HTML → variant shuffling → render to HTML →
        BeautifulSoup clean → markdownify → Markdown → Pandoc → DOCX

    Also saves the intermediate Markdown file (.md) alongside the DOCX
    so that PDF export can later use the same source.
    """
    generation = db.query(Generation).filter(Generation.id == generation_id).first()
    if not generation:
        raise ValueError("Generation not found")

    prototype = db.query(Prototype).filter(
        Prototype.generation_id == generation_id,
    ).first()
    if not prototype:
        raise ValueError("Prototype not found")

    # ── Build Markdown content ──────────────────────────────────────────
    if generation.content_type in TYPES_WITHOUT_QUESTIONS:
        # Free-form: use editor HTML directly through the pipeline
        raw_html = prototype.edited_content or prototype.original_content or ""
        clean_html = _clean_tiptap_html(raw_html)
        markdown = _html_to_markdown(clean_html)
        variants_count = 1
    else:
        # Q&A: parse questions, shuffle variants, render to HTML, convert
        questions: list[dict] = []
        answer_map: dict[int, str] = {}

        if prototype.raw_questions_json and not prototype.edited_content:
            try:
                raw_data = json.loads(prototype.raw_questions_json)
                questions = raw_data.get("questions", [])
                answer_map = {
                    q["number"]: q.get("correct_answer", "")
                    for q in questions
                    if isinstance(q, dict) and q.get("number")
                }
            except (json.JSONDecodeError, TypeError):
                questions = []

        if not questions:
            content = prototype.edited_content or prototype.original_content
            questions = _parse_content_to_questions(content)
            answer_map = _parse_answer_key(prototype.answer_key)

        variants_count = generation.variants_count
        group_labels = [chr(65 + i) for i in range(variants_count)]
        all_variants_answers: list[tuple[str, dict[int, str]]] = []
        html_parts: list[str] = []

        for i in range(variants_count):
            group_label = f"Grupa {group_labels[i]}"

            if i > 0:
                html_parts.append(_PAGE_BREAK_MARKER)

            if variants_count > 1:
                variant_questions, variant_answers = _shuffle_variant(
                    questions, answer_map,
                )
            else:
                variant_questions = questions
                variant_answers = answer_map

            html_parts.append(
                _render_questions_to_html(
                    variant_questions, generation.topic, group_label,
                )
            )
            all_variants_answers.append((group_label, variant_answers))

        # Add answer key after a page break
        html_parts.append(_PAGE_BREAK_MARKER)
        html_parts.append(_render_answer_key_to_html(all_variants_answers))

        combined_html = "\n".join(html_parts)
        clean_html = _clean_tiptap_html(combined_html)
        markdown = _html_to_markdown(clean_html)

    # ── Build output path ───────────────────────────────────────────────
    docs_dir = _build_output_dir(generation, db)
    filename = _build_filename(generation.topic)
    file_path = docs_dir / filename
    md_path = file_path.with_suffix(".md")

    # ── Save Markdown source (for later PDF export) ─────────────────────
    md_path.write_text(markdown, encoding="utf-8")

    # ── Convert to DOCX via Pandoc ──────────────────────────────────────
    _markdown_to_docx(markdown, str(file_path))

    # ── Create DB record ────────────────────────────────────────────────
    document = Document(
        user_id=user_id or generation.user_id,
        generation_id=generation_id,
        filename=filename,
        file_path=str(file_path),
        variants_count=variants_count,
    )
    db.add(document)

    generation.status = "finalized"
    generation.updated_at = datetime.now(timezone.utc).isoformat()
    db.commit()
    db.refresh(document)

    return document
