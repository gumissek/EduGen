"""Tests for generation_service — render_content_html, build_answer_key."""

from __future__ import annotations

from app.services.generation_service import render_content_html, build_answer_key


class TestRenderContentHtml:
    def test_invalid_data_returns_error(self):
        assert "Błąd renderowania" in render_content_html("not a dict")

    def test_free_form_returns_content_html(self):
        data = {"content_html": "<h1>Lesson</h1><p>Content</p>"}
        html = render_content_html(data, "worksheet")
        assert "<h1>Lesson</h1>" in html

    def test_free_form_fallback_to_title(self):
        data = {"title": "My Title"}
        html = render_content_html(data, "lesson_materials")
        assert "<h1>My Title</h1>" in html

    def test_qa_renders_questions(self):
        data = {
            "title": "Test Quiz",
            "questions": [
                {
                    "number": 1,
                    "type": "closed",
                    "content": "What is 2+2?",
                    "options": ["3", "4", "5"],
                    "correct_answer": "4",
                    "points": 2,
                },
                {
                    "number": 2,
                    "type": "open",
                    "content": "Explain gravity.",
                    "correct_answer": "Force of attraction",
                    "points": 3,
                },
            ],
        }
        html = render_content_html(data, "test")
        assert "Test Quiz" in html
        assert "Pytanie 1" in html
        assert "What is 2+2?" in html
        assert "<li>4</li>" in html
        assert "Pytanie 2" in html
        assert "Miejsce na odpowiedź" in html

    def test_qa_empty_questions(self):
        data = {"title": "Empty", "questions": []}
        html = render_content_html(data, "quiz")
        assert "<h1>Empty</h1>" in html


class TestBuildAnswerKey:
    def test_invalid_data(self):
        assert "brak danych" in build_answer_key("not a dict")

    def test_builds_key(self):
        data = {
            "questions": [
                {"number": 1, "correct_answer": "a) Tak"},
                {"number": 2, "correct_answer": "Opis"},
            ]
        }
        key = build_answer_key(data)
        assert "1. a) Tak" in key
        assert "2. Opis" in key

    def test_empty_questions(self):
        key = build_answer_key({"questions": []})
        assert "Klucz odpowiedzi:" in key
