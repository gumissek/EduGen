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
    pkg-config \
    libcairo2-dev \
    libmagic1 \
    pandoc \
    fontconfig \
    fonts-dejavu-core \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Fail image build early if the expected Unicode font is missing.
# This guarantees that backend PDF generation has a Polish-capable fallback in Docker.
RUN test -f /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf

# install uv
RUN pip install uv

# copy dependency files first (cache layer)
COPY pyproject.toml uv.lock ./

# install dependencies
RUN uv sync --frozen

# copy source
COPY app ./app

# copy alembic migrations
COPY alembic.ini ./
COPY alembic ./alembic

# copy backend default CSV dictionaries used by routers
COPY common_filles ./common_filles

# start backend server
CMD ["uv", "run", "sh", "-c", "python app/init_app.py && uvicorn app.main:app --host 0.0.0.0 --port 8000"]