FROM python:3.12-slim

WORKDIR /app

# system deps
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

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

# create mount point for shared common files
RUN mkdir -p /app/common_filles

# start server
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]