"""Mutable runtime settings singleton for Abeg.

Fields can be mutated at runtime (no restart) by the control endpoints.
"""
import os
from dataclasses import dataclass, field

from dotenv import load_dotenv

load_dotenv()

DEFAULT_DATABASE_URL = "postgresql://abeg:abeg@localhost:5432/abeg"


@dataclass
class Settings:
    guardrails: bool = True
    llm_provider: str = "openrouter"
    stt_provider: str = "deepgram"
    cached_mode: bool = False
    reservation_ttl_seconds: int = 90
    max_tool_calls: int = 5
    database_url: str = field(
        default_factory=lambda: os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)
    )
    openrouter_api_key: str = field(
        default_factory=lambda: os.getenv("OPENROUTER_API_KEY", "")
    )
    openrouter_model: str = field(
        default_factory=lambda: os.getenv(
            "OPENROUTER_MODEL", "deepseek/deepseek-v4-flash"
        )
    )
    deepgram_api_key: str = field(
        default_factory=lambda: os.getenv("DEEPGRAM_API_KEY", "")
    )


# Mutable singleton — import and mutate `settings` directly.
settings = Settings()
