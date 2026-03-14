"""Regression tests for container configuration files.

These tests protect critical Docker and Compose settings that the backend relies on:
- Unicode-capable font and pandoc availability in Docker image,
- deterministic dependency installation via uv.lock,
- backend startup command running init before uvicorn,
- required service wiring in docker-compose.
"""

from __future__ import annotations

from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[2]
DOCKERFILE_PATH = ROOT_DIR / "backend" / "Dockerfile"
COMPOSE_PATH = ROOT_DIR / "docker-compose.yml"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


class TestBackendDockerfileRegression:
    def test_uses_expected_python_base_image(self):
        content = _read(DOCKERFILE_PATH)
        assert "FROM python:3.12-slim" in content

    def test_installs_required_system_dependencies_for_exports(self):
        content = _read(DOCKERFILE_PATH)
        required_packages = [
            "pandoc",
            "fontconfig",
            "fonts-dejavu-core",
            "libmagic1",
            "build-essential",
        ]

        for package in required_packages:
            assert package in content, f"Missing package in Dockerfile: {package}"

    def test_verifies_dejavu_font_presence_during_build(self):
        content = _read(DOCKERFILE_PATH)
        assert "RUN test -f /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf" in content

    def test_uses_locked_dependency_installation(self):
        content = _read(DOCKERFILE_PATH)
        assert "COPY pyproject.toml uv.lock ./" in content
        assert "RUN uv sync --frozen --extra test" in content

    def test_copies_backend_tests_into_image(self):
        content = _read(DOCKERFILE_PATH)
        assert "COPY tests ./tests" in content

    def test_backend_startup_runs_init_before_server(self):
        content = _read(DOCKERFILE_PATH)
        assert "BACKEND_RUN_TESTS_ON_STARTUP" in content
        assert "then pytest tests/ --tb=short --no-header -q; fi &&" in content
        assert "python app/init_app.py && uvicorn app.main:app" in content


class TestDockerComposeRegression:
    def test_declares_required_services(self):
        content = _read(COMPOSE_PATH)
        for service in ("postgres:", "backend:", "frontend:"):
            assert service in content

    def test_postgres_version_is_pinned(self):
        content = _read(COMPOSE_PATH)
        assert "image: postgres:16" in content

    def test_backend_build_configuration_targets_backend_dockerfile(self):
        content = _read(COMPOSE_PATH)
        assert "context: ./backend" in content
        assert "dockerfile: Dockerfile" in content

    def test_backend_mounts_shared_common_files_read_only(self):
        content = _read(COMPOSE_PATH)
        assert "./common_filles:/app/common_filles:ro" in content

    def test_backend_waits_for_healthy_postgres(self):
        content = _read(COMPOSE_PATH)
        assert "depends_on:" in content
        assert "postgres:" in content
        assert "condition: service_healthy" in content

    def test_backend_healthcheck_targets_health_endpoint(self):
        content = _read(COMPOSE_PATH)
        assert "http://localhost:8000/api/health" in content

    def test_backend_command_runs_init_and_uvicorn(self):
        content = _read(COMPOSE_PATH)
        assert "BACKEND_RUN_TESTS_ON_STARTUP=${BACKEND_RUN_TESTS_ON_STARTUP:-true}" in content
        assert "then pytest tests/ --tb=short --no-header -q; fi &&" in content
        assert "python app/init_app.py && uvicorn app.main:app" in content

    def test_frontend_build_uses_backend_internal_url(self):
        content = _read(COMPOSE_PATH)
        assert "BACKEND_URL: http://backend:8000" in content

    def test_bridge_network_is_defined(self):
        content = _read(COMPOSE_PATH)
        assert "backend_network:" in content
        assert "driver: bridge" in content
