"""Tests for user_ai_models router — CRUD for per-user AI model list."""

from __future__ import annotations

from uuid import uuid4

from app.models.user_ai_model import UserAIModel


class TestUserAIModelsRouter:
    """Tests for /api/user-ai-models endpoints."""

    def _seed_model(self, db, user, **overrides) -> UserAIModel:
        defaults = dict(
            user_id=user.id,
            provider="openai",
            model_name="gpt-4o",
            description="GPT-4o model",
            price_description="$5/1M tokens",
            is_available=True,
            request_made=0,
        )
        defaults.update(overrides)
        model = UserAIModel(**defaults)
        db.add(model)
        db.commit()
        db.refresh(model)
        return model

    # ── LIST ──

    def test_list_models_empty(self, client):
        resp = client.get("/api/user-ai-models")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_models(self, client, db, test_user):
        self._seed_model(db, test_user)
        resp = client.get("/api/user-ai-models")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["provider"] == "openai"
        assert data[0]["model_name"] == "gpt-4o"

    # ── CREATE ──

    def test_create_model(self, client, db, test_user):
        resp = client.post("/api/user-ai-models", json={
            "provider": "anthropic",
            "model_name": "claude-3-opus",
            "description": "Claude 3 Opus",
            "price_description": "$15/1M tokens",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["provider"] == "anthropic"
        assert data["model_name"] == "claude-3-opus"
        assert data["is_available"] is True

    def test_create_duplicate_model(self, client, db, test_user):
        self._seed_model(db, test_user, provider="openai", model_name="gpt-4o")
        resp = client.post("/api/user-ai-models", json={
            "provider": "openai",
            "model_name": "gpt-4o",
        })
        assert resp.status_code == 409

    def test_create_model_different_provider(self, client, db, test_user):
        self._seed_model(db, test_user, provider="openai", model_name="gpt-4o")
        resp = client.post("/api/user-ai-models", json={
            "provider": "anthropic",
            "model_name": "gpt-4o",
        })
        assert resp.status_code == 201

    # ── DELETE ──

    def test_delete_model(self, client, db, test_user):
        model = self._seed_model(db, test_user)
        resp = client.delete(f"/api/user-ai-models/{model.id}")
        assert resp.status_code == 204
        assert db.query(UserAIModel).filter(UserAIModel.id == model.id).first() is None

    def test_delete_nonexistent_model(self, client):
        resp = client.delete("/api/user-ai-models/nonexistent")
        assert resp.status_code == 404
