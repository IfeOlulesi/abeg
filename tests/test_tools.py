"""Tool grounding + money-from-DB tests (single-connection, guarded mode).

Covers search_inventory, check_stock, reserve_items, place_order and
cancel_reservation against the seeded catalog. Exact prices/totals are asserted
from SEED_PRODUCTS so we lock in "money is recomputed server-side from the DB".
"""
from app import tools
from app.config import settings

SID = "test-session"

# Exact seed numbers we assert against.
SUYA_PRICE = 2000
JOLLOF_PRICE = 3500


# ---------------------------------------------------------------------------
# search_inventory
# ---------------------------------------------------------------------------
async def test_search_returns_seeded_products(pool):
    res = await tools.search_inventory(pool, "", limit=50)
    skus = {p["sku"] for p in res["products"]}
    assert {"JOLLOF", "SUYA", "CHINCHIN", "PUFFPUFF"} <= skus
    assert len(res["products"]) == 10  # all seed products


async def test_search_empty_query_respects_limit(pool):
    res = await tools.search_inventory(pool, "", limit=3)
    assert len(res["products"]) == 3


async def test_search_matches_name_case_insensitive(pool):
    res = await tools.search_inventory(pool, "jollof")
    assert [p["sku"] for p in res["products"]] == ["JOLLOF"]
    assert res["products"][0]["name"] == "Party Jollof Rice"


async def test_search_matches_sku_case_insensitive(pool):
    res = await tools.search_inventory(pool, "suya")
    assert [p["sku"] for p in res["products"]] == ["SUYA"]
    # available reflects seeded qty for an untouched product
    assert res["products"][0]["available"] == 12


# ---------------------------------------------------------------------------
# check_stock
# ---------------------------------------------------------------------------
async def test_check_stock_known_sku(pool):
    res = await tools.check_stock(pool, "JOLLOF")
    assert res == {"sku": "JOLLOF", "name": "Party Jollof Rice", "available": 1}


async def test_check_stock_unknown_sku(pool):
    res = await tools.check_stock(pool, "NOTREAL")
    assert res == {"error": "unknown_sku", "sku": "NOTREAL"}


# ---------------------------------------------------------------------------
# reserve_items (guarded)
# ---------------------------------------------------------------------------
async def test_reserve_success_reduces_available_not_on_hand(pool, stock):
    before = await stock("SUYA")
    res = await tools.reserve_items(pool, [{"sku": "SUYA", "qty": 2}], SID)

    assert "reservation_id" in res
    assert res.get("refused") is None
    assert res["items"] == [{"sku": "SUYA", "qty": 2, "unit_price": float(SUYA_PRICE)}]
    assert res["total"] == SUYA_PRICE * 2  # 4000, from DB price

    after = await stock("SUYA")
    assert after["qty_on_hand"] == before["qty_on_hand"]  # on-hand untouched
    assert after["available"] == before["available"] - 2  # only availability drops


async def test_reserve_unknown_sku_refused_no_fuzzy(pool):
    res = await tools.reserve_items(pool, [{"sku": "JOLOF", "qty": 1}], SID)  # typo
    assert res["refused"] is True
    assert res["error"] == "unknown_sku"
    assert "reservation_id" not in res  # never fuzzy-matched into JOLLOF


async def test_reserve_over_request_insufficient(pool, stock):
    res = await tools.reserve_items(pool, [{"sku": "JOLLOF", "qty": 5}], SID)
    assert res["refused"] is True
    assert res["error"] == "insufficient_stock"
    # nothing reserved
    assert (await stock("JOLLOF"))["available"] == 1


async def test_reserve_total_and_unit_price_from_db(pool):
    res = await tools.reserve_items(
        pool, [{"sku": "JOLLOF", "qty": 1}, {"sku": "SUYA", "qty": 2}], SID
    )
    by_sku = {i["sku"]: i for i in res["items"]}
    assert by_sku["JOLLOF"]["unit_price"] == float(JOLLOF_PRICE)
    assert by_sku["SUYA"]["unit_price"] == float(SUYA_PRICE)
    assert res["total"] == JOLLOF_PRICE * 1 + SUYA_PRICE * 2  # 3500 + 4000 = 7500


# ---------------------------------------------------------------------------
# place_order (guarded) + idempotency
# ---------------------------------------------------------------------------
async def test_place_order_success(pool, stock):
    reserve = await tools.reserve_items(pool, [{"sku": "SUYA", "qty": 2}], SID)
    before = await stock("SUYA")

    order = await tools.place_order(
        pool, reserve["reservation_id"], "Ada", idempotency_key="k-1"
    )
    assert order["reference"].startswith("ABEG-")
    assert len(order["reference"]) == len("ABEG-") + 6
    assert order["total"] == SUYA_PRICE * 2

    after = await stock("SUYA")
    assert after["qty_on_hand"] == before["qty_on_hand"] - 2  # on-hand decremented

    # reservation marked consumed
    async with pool.acquire() as conn:
        status = await conn.fetchval(
            "SELECT status FROM reservations WHERE id = $1::uuid",
            reserve["reservation_id"],
        )
    assert status == "consumed"


async def test_place_order_idempotent_replay(pool, stock):
    reserve = await tools.reserve_items(pool, [{"sku": "SUYA", "qty": 2}], SID)
    order1 = await tools.place_order(
        pool, reserve["reservation_id"], "Ada", idempotency_key="dupe-key"
    )
    after_first = await stock("SUYA")

    order2 = await tools.place_order(
        pool, reserve["reservation_id"], "Ada", idempotency_key="dupe-key"
    )
    after_second = await stock("SUYA")

    assert order2["reference"] == order1["reference"]
    assert order2["order_id"] == order1["order_id"]
    # no double decrement
    assert after_second["qty_on_hand"] == after_first["qty_on_hand"]

    # exactly one order row exists
    async with pool.acquire() as conn:
        count = await conn.fetchval("SELECT COUNT(*) FROM orders")
    assert int(count) == 1


# ---------------------------------------------------------------------------
# cancel_reservation
# ---------------------------------------------------------------------------
async def test_cancel_reservation_returns_stock(pool, stock):
    before = await stock("SUYA")
    reserve = await tools.reserve_items(pool, [{"sku": "SUYA", "qty": 3}], SID)
    assert (await stock("SUYA"))["available"] == before["available"] - 3

    res = await tools.cancel_reservation(pool, reserve["reservation_id"])
    assert res == {"ok": True}

    after = await stock("SUYA")
    assert after["available"] == before["available"]  # stock released

    async with pool.acquire() as conn:
        status = await conn.fetchval(
            "SELECT status FROM reservations WHERE id = $1::uuid",
            reserve["reservation_id"],
        )
    assert status == "cancelled"
