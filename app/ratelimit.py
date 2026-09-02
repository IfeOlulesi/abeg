"""Tiny in-memory rate limiter for the public demo.

Protects the credit-spending endpoints (chat -> OpenRouter, mic -> Deepgram)
from a single abuser or a runaway script draining the API keys. Two gates per
call: a per-IP sliding window AND a global per-day counter.

Single-process only (matches the demo's single uvicorn worker). The real hard
backstop is still a spending cap set on the provider keys themselves.
"""
import time
from collections import deque
from threading import Lock


class RateLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, deque] = {}
        self._day_key: int | None = None
        self._day_count = 0
        self._lock = Lock()

    @staticmethod
    def _day() -> int:
        t = time.gmtime()
        return t.tm_year * 1000 + t.tm_yday

    def check(
        self,
        key: str,
        per_ip_limit: int,
        per_ip_window_s: float,
        global_daily_limit: int,
    ) -> tuple[bool, str]:
        """Return (allowed, reason). reason is '' | 'daily' | 'ip'.

        On an allowed call the hit is recorded (per-IP window + daily counter).
        """
        now = time.time()
        with self._lock:
            today = self._day()
            if today != self._day_key:
                self._day_key = today
                self._day_count = 0
                self._hits.clear()  # cheap daily memory reset

            if self._day_count >= global_daily_limit:
                return False, "daily"

            dq = self._hits.setdefault(key, deque())
            cutoff = now - per_ip_window_s
            while dq and dq[0] < cutoff:
                dq.popleft()
            if len(dq) >= per_ip_limit:
                return False, "ip"

            dq.append(now)
            self._day_count += 1
            return True, ""


# Module-level singleton.
limiter = RateLimiter()
