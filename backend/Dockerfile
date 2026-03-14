FROM python:3.12-slim

WORKDIR /app

# system deps
# - pandoc: required by pypandoc for Markdown -> DOCX/HTML conversion
# - fonts-dejavu-core: primary Unicode font family used in PDF export (Linux/Docker)
#   includes Polish diacritics: ą ć ę ł ń ó ś ź ż
# - fontconfig: helpful for runtime font discovery/debugging in containers
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    libmagic1 \
    pandoc \
    fontconfig \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

# Fail image build early if the expected Unicode font is missing.
# This guarantees that backend PDF generation has a Polish-capable fallback in Docker.
RUN test -f /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf

# install uv
RUN pip install uv

# copy dependency files first (cache layer)
COPY pyproject.toml uv.lock ./

# install dependencies (including test extras so pytest can run at container startup)
RUN uv sync --frozen --extra test

# copy source
COPY app ./app

# copy backend tests used as startup gate
COPY tests ./tests

# copy alembic migrations
COPY alembic.ini ./
COPY alembic ./alembic

# create mount point for shared common files
RUN mkdir -p /app/common_filles

# start server with optional startup test gate (enabled by default)
CMD ["uv", "run", "sh", "-c", "if [ \"${BACKEND_RUN_TESTS_ON_STARTUP:-true}\" = \"true\" ]; then pytest tests/ --tb=short --no-header -q; fi && python app/init_app.py && uvicorn app.main:app --host 0.0.0.0 --port 8000"]