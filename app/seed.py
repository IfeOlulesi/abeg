"""Seed data + reset helpers for Abeg.

One product (JOLLOF) has qty_on_hand=1 to drive the oversell race.
"""
import asyncpg

# (sku, name, price NGN, qty_on_hand)
SEED_PRODUCTS: list[tuple[str, str, int, int]] = [
    ("JOLLOF", "Party Jollof Rice", 3500, 1),
    ("SUYA", "Beef Suya", 2000, 12),
    ("PUFFPUFF", "Puff Puff (6 pcs)", 800, 20),
    ("CHINCHIN", "Chin Chin Pack", 1200, 15),
    ("ZOBO", "Zobo Drink", 600, 18),
    ("MEATPIE", "Meat Pie", 1000, 10),
    ("PLANTAIN", "Fried Plantain", 900, 14),
    ("MOIMOI", "Moi Moi", 1100, 9),
    ("EGUSI", "Egusi Soup Bowl", 2500, 8),
    ("PEPPERSOUP", "Catfish Pepper Soup", 3000, 6),
]

_ALL_TABLES = (
    "idempotency_keys",
    "order_items",
    "orders",
    "reservation_items",
    "reservations",
    "products",
)


async def _insert_products(conn: asyncpg.Connection) -> None:
    await conn.executemany(
        "INSERT INTO products (sku, name, price, qty_on_hand) "
        "VALUES ($1, $2, $3, $4)",
        [(sku, name, price, qty) for sku, name, price, qty in SEED_PRODUCTS],
    )


async def reset_seed(pool: asyncpg.Pool) -> None:
    """Truncate all tables (RESTART IDENTITY CASCADE) and reinsert seed products."""
    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute(
                "TRUNCATE "
                + ", ".join(_ALL_TABLES)
                + " RESTART IDENTITY CASCADE"
            )
            await _insert_products(conn)


async def seed_if_empty(pool: asyncpg.Pool) -> bool:
    """Insert seed products only if the products table is empty.

    Returns True if seeding happened, False otherwise.
    """
    async with pool.acquire() as conn:
        count = await conn.fetchval("SELECT COUNT(*) FROM products")
        if count and int(count) > 0:
            return False
        async with conn.transaction():
            await _insert_products(conn)
        return True
