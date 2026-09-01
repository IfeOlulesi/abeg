#!/usr/bin/env bash
set -euo pipefail

# Run from the directory this script lives in (project root).
cd "$(dirname "$0")"

echo "[run] Bringing up Postgres (docker compose db)..."
docker compose up -d db

echo "[run] Waiting for Postgres to become healthy..."
for i in $(seq 1 60); do
  if docker exec abeg-postgres pg_isready -U abeg >/dev/null 2>&1; then
    echo "[run] Postgres is ready."
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "[run] ERROR: Postgres did not become ready in time." >&2
    exit 1
  fi
  sleep 1
done

echo "[run] Syncing dependencies with uv..."
uv sync

# Build the React frontend if it hasn't been built yet.
if [ ! -f web/dist/index.html ]; then
  echo "[run] Building the web frontend (first run)..."
  (cd web && npm install && npm run build)
fi

echo "[run] Applying schema + seeding database..."
uv run python -c "
import asyncio
from app.db import create_pool, apply_schema
from app.seed import seed_if_empty

async def main():
    pool = await create_pool()
    await apply_schema(pool)
    await seed_if_empty(pool)
    await pool.close()

asyncio.run(main())
"

echo "[run] Starting uvicorn on port 8000..."
exec uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
