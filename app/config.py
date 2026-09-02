"""Mutable runtime settings singleton for Abeg.

Fields can be mutated at runtime (no restart) by the control endpoints.
"""
import os
from dataclasses import dataclass, field

from dotenv import load_dotenv

load_dotenv()


def _env_bool(name: str, default: bool) -> bool:
    v = os.getenv(name)
    if v is None:
        return default
    return v.strip().lower() in {"1", "true", "yes", "on"}


DEFAULT_DATABASE_URL = "postgresql://abeg:abeg@localhost:5432/abeg"

# Curated, tool-calling-capable models the Workshop lets a learner swap between.
# `note` is plain-language for beginners; keep this list short and all cheap.
AVAILABLE_MODELS = [
    {
        "id": "deepseek/deepseek-v4-flash",
        "label": "DeepSeek V4 Flash",
        "note": "Fast & very cheap — the default",
    },
    {
        "id": "openai/gpt-4o-mini",
        "label": "GPT-4o mini",
        "note": "OpenAI's small model — balanced",
    },
    {
        "id": "anthropic/claude-3.5-haiku",
        "label": "Claude 3.5 Haiku",
        "note": "Fast and careful with instructions",
    },
    {
        "id": "google/gemini-2.0-flash-001",
        "label": "Gemini 2.0 Flash",
        "note": "Google's quick model",
    },
]


@dataclass
class Settings:
    guardrails: bool = True
    llm_provider: str = "openrouter"
    stt_provider: str = "deepgram"
    cached_mode: bool = False
    reservation_ttl_seconds: int = 90
    max_tool_calls: int = 5
    # How adventurous the model is (0 = focused/repeatable, higher = wilder).
    temperature: float = 0.3
    # Active system prompt. Empty string => use the agent's built-in default,
    # so "reset" is just clearing this back to "".
    system_prompt: str = ""

    # ---- abuse / credit protection for the public demo ----
    # In-memory limits (single uvicorn process). The hard backstop is still a
    # spending cap on the OpenRouter/Deepgram keys themselves.
    rate_limit_enabled: bool = _env_bool("RATE_LIMIT_ENABLED", True)
    chat_ip_limit: int = int(os.getenv("CHAT_IP_LIMIT", "30"))          # chats / IP / window
    chat_ip_window_s: int = int(os.getenv("CHAT_IP_WINDOW_S", "3600"))  # window = 1 hour
    chat_daily_limit: int = int(os.getenv("CHAT_DAILY_LIMIT", "600"))   # chats / day (all IPs)
    stt_ip_limit: int = int(os.getenv("STT_IP_LIMIT", "15"))            # mic sessions / IP / window
    stt_ip_window_s: int = int(os.getenv("STT_IP_WINDOW_S", "3600"))
    stt_daily_limit: int = int(os.getenv("STT_DAILY_LIMIT", "200"))     # mic sessions / day
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
