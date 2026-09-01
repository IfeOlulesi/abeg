# syntax=docker/dockerfile:1

# ---------- Stage 1: build the React + Vite frontend ----------
FROM node:22-alpine AS web
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# ---------- Stage 2: Python runtime serving API + built assets ----------
FROM python:3.12-slim AS app
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app

# uv for fast, locked dependency installs
RUN pip install --no-cache-dir uv

# Install dependencies from the lockfile into /app/.venv (cached layer)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
ENV PATH="/app/.venv/bin:$PATH"

# App source + built frontend
COPY app/ ./app
COPY static/ ./static
COPY --from=web /web/dist ./web/dist

EXPOSE 8000
# Hosts (Railway/Render/Fly) inject $PORT; default to 8000 locally.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
