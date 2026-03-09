FROM python:3.12-slim AS base

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libmagic1 \
    poppler-utils \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

# Set uv environment variables
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy
ENV UV_PYTHON_DOWNLOADS=never
ENV UV_PROJECT_ENVIRONMENT=/app/.venv

WORKDIR /app

# Copy dependency files first for better Docker layer caching
COPY pyproject.toml uv.lock* ./

# Install dependencies via uv
# If uv.lock exists use --frozen, otherwise generate it
RUN if [ -f uv.lock ]; then \
      uv sync --frozen --no-dev --no-install-project; \
    else \
      uv sync --no-dev --no-install-project; \
    fi

# Copy application code
COPY . .

# Create data directories
RUN mkdir -p data/subjects data/documents data/backups

# Add .venv/bin to PATH so uvicorn is directly accessible
ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000

CMD ["uv", "run", "sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2"]
