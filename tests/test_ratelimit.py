"""Rate limiter: per-IP window + global daily cap."""
from app.ratelimit import RateLimiter


def test_per_ip_window_blocks_after_limit():
    rl = RateLimiter()
    # 3 per IP within a big window, generous daily cap.
    for _ in range(3):
        ok, why = rl.check("ip:a", per_ip_limit=3, per_ip_window_s=1000, global_daily_limit=1000)
        assert ok and why == ""
    ok, why = rl.check("ip:a", per_ip_limit=3, per_ip_window_s=1000, global_daily_limit=1000)
    assert not ok and why == "ip"


def test_other_ip_unaffected():
    rl = RateLimiter()
    for _ in range(3):
        rl.check("ip:a", 3, 1000, 1000)
    # Different IP still allowed.
    ok, _ = rl.check("ip:b", 3, 1000, 1000)
    assert ok


def test_global_daily_cap():
    rl = RateLimiter()
    # High per-IP limit, but daily cap of 2 across all IPs.
    assert rl.check("ip:a", 100, 1000, 2)[0]
    assert rl.check("ip:b", 100, 1000, 2)[0]
    ok, why = rl.check("ip:c", 100, 1000, 2)
    assert not ok and why == "daily"
