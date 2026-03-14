"""Tests for docx_service — HTML cleaning, Markdown conversion, question parsing."""

from __future__ import annotations

from app.services.docx_service import (
    _clean_tiptap_html,
    _html_to_markdown,
    _parse_content_to_questions,
    _parse_answer_key,
    _shuffle_variant,
    _strip_letter_prefix,
    _build_filename,
)


class TestCleanTiptapHtml:
    def test_removes_scripts_and_styles(self):
        html = "<p>Hello</p><script>alert(1)</script><style>.x{}</style>"
        result = _clean_tiptap_html(html)
        assert "<script>" not in result
        assert "<style>" not in result
        assert "Hello" in result

    def test_unwraps_comment_marks(self):
        html = '<p>Some <mark class="tiptap-comment" data-comment="note">highlighted</mark> text</p>'
        result = _clean_tiptap_html(html)
        assert "<mark" not in result
        assert "highlighted" in result

    def test_removes_default_colspan_rowspan(self):
        html = '<table><tr><td colspan="1" rowspan="1">Cell</td></tr></table>'
        result = _clean_tiptap_html(html)
        assert 'colspan' not in result
        assert 'rowspan' not in result

    def test_removes_empty_paragraphs(self):
        html = "<p></p><p>Content</p><p>  </p>"
        result = _clean_tiptap_html(html)
        assert result.count("<p>") == 1

    def test_removes_colgroup(self):
        html = "<table><colgroup><col></colgroup><tr><td>A</td></tr></table>"
        result = _clean_tiptap_html(html)
        assert "<colgroup>" not in result


class TestHtmlToMarkdown:
    def test_heading_converted(self):
        md = _html_to_markdown("<h1>Title</h1>")
        assert "# Title" in md

    def test_list_converted(self):
        md = _html_to_markdown("<ul><li>A</li><li>B</li></ul>")
        assert "- A" in md
        assert "- B" in md


class TestParseContentToQuestions:
    def test_parse_json_with_questions_key(self):
        import json
        data = json.dumps({
            "questions": [
                {"number": 1, "type": "closed", "content": "Q1", "options": ["a", "b"], "correct_answer": "a", "points": 1}
            ]
        })
        result = _parse_content_to_questions(data)
        assert len(result) == 1
        assert result[0]["content"] == "Q1"

    def test_parse_json_list(self):
        import json
        data = json.dumps([
            {"number": 1, "type": "open", "content": "Q?", "options": [], "correct_answer": "Yes", "points": 2}
        ])
        result = _parse_content_to_questions(data)
        assert len(result) == 1

    def test_parse_html_content(self):
        html = (
            '<p><strong>Pytanie 1.</strong> (2 pkt) What is AI?</p>'
            '<ul><li>a) Machine</li><li>b) Human</li></ul>'
        )
        result = _parse_content_to_questions(html)
        assert len(result) == 1
        assert result[0]["type"] == "closed"
        assert result[0]["points"] == 2


class TestParseAnswerKey:
    def test_parse_multiline(self):
        text = "1. a) Tak\n2. Nie\n3. b) Może"
        result = _parse_answer_key(text)
        assert result[1] == "a) Tak"
        assert result[2] == "Nie"
        assert result[3] == "b) Może"

    def test_empty_text(self):
        assert _parse_answer_key("") == {}


class TestStripLetterPrefix:
    def test_strips_prefix(self):
        assert _strip_letter_prefix("a) Answer") == "Answer"
        assert _strip_letter_prefix("b) Other") == "Other"

    def test_no_prefix_unchanged(self):
        assert _strip_letter_prefix("Just text") == "Just text"


class TestShuffleVariant:
    def test_renumbers_questions(self):
        questions = [
            {"number": 1, "type": "open", "options": []},
            {"number": 2, "type": "open", "options": []},
        ]
        answer_map = {1: "A", 2: "B"}
        shuffled, new_map = _shuffle_variant(questions, answer_map)
        assert len(shuffled) == 2
        numbers = {q["number"] for q in shuffled}
        assert numbers == {1, 2}

    def test_does_not_mutate_original(self):
        questions = [
            {"number": 1, "type": "closed", "options": ["a) X", "b) Y"]},
        ]
        answer_map = {1: "a) X"}
        original_opts = list(questions[0]["options"])
        _shuffle_variant(questions, answer_map)
        assert questions[0]["options"] == original_opts


class TestBuildFilename:
    def test_filename_sanitized(self):
        name = _build_filename('Test: "special" chars?')
        assert ":" not in name
        assert '"' not in name
        assert "?" not in name
        assert name.endswith(".docx")

    def test_long_topic_truncated(self):
        name = _build_filename("A" * 200)
        # Topic capped at 50 chars in the filename
        assert len(name.split("_")[0]) <= 50
