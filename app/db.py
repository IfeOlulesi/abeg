"""asyncpg pool management + schema application + availability helper.

Importable without a live DB: no connection is made at import time.
"""
import os
from contextlib import asynccontextmanager
from pathlib import Path

import asyncpg

from app.config import settings

_SCHEMA_PATH = Path(__file__).with_name("schema.sql")

# Module-level pool. Also mirrored onto app.state.pool by main.py.
_pool: asyncpg.Pool | None = None


async def create_pool(dsn: str | None = None) -> asyncpg.Pool:
    """Create (and store) the module-level asyncpg pool."""
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            dsn or settings.database_url,
            min_size=1,
            max_size=10,
        )
    return _pool


async def get_pool() -> asyncpg.Pool:
    """Return the module-level pool, creating it on first use."""
    if _pool is None:
        return await create_pool()
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def _load_schema_sql() -> str:
    return _SCHEMA_PATH.read_text()


async def apply_schema(pool: asyncpg.Pool) -> bool:
    """Apply schema.sql if not already applied.

    Idempotent: only runs the DDL when the `products` table is absent.
    Returns True if schema was applied, False if it already existed.
    """
    async with pool.acquire() as conn:
        exists = await conn.fetchval("SELECT to_regclass('public.products')")
        if exists is not None:
            return False
        await conn.execute(_load_schema_sql())
        return True


async def available_map(
    conn: asyncpg.Connection, skus: list[str] | None = None
) -> dict[str, int]:
    """Return {sku: available_qty} using the core availability formula.

    available = qty_on_hand - SUM(reservation_items.qty
                WHERE reservations.status='active' AND expires_at > now())
    """
    if skus is not None:
        rows = await conn.fetch(
            """
            SELECT p.sku,
                   p.qty_on_hand
                     - COALESCE(SUM(CASE WHEN r.id IS NOT NULL THEN ri.qty ELSE 0 END), 0)
                     AS available
            FROM products p
            LEFT JOIN reservation_items ri ON ri.sku = p.sku
            LEFT JOIN reservations r
                ON r.id = ri.reservation_id
               AND r.status = 'active'
               AND r.expires_at > now()
            WHERE p.sku = ANY($1::text[])
            GROUP BY p.sku, p.qty_on_hand
            """,
            skus,
        )
    else:
        rows = await conn.fetch(
            """
            SELECT p.sku,
                   p.qty_on_hand
                     - COALESCE(SUM(CASE WHEN r.id IS NOT NULL THEN ri.qty ELSE 0 END), 0)
                     AS available
            FROM products p
            LEFT JOIN reservation_items ri ON ri.sku = p.sku
            LEFT JOIN reservations r
                ON r.id = ri.reservation_id
               AND r.status = 'active'
               AND r.expires_at > now()
            GROUP BY p.sku, p.qty_on_hand
            """
        )
    return {r["sku"]: int(r["available"]) for r in rows}


@asynccontextmanager
async def tx(pool: asyncpg.Pool):
    """Acquire a connection and run inside a transaction."""
    async with pool.acquire() as conn:
        async with conn.transaction():
            yield conn


@asynccontextmanager
async def acquire(pool: asyncpg.Pool):
    """Acquire a connection (no transaction)."""
    async with pool.acquire() as conn:
        yield conn
