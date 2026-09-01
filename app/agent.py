"""Agent core: run one conversational turn with a bounded tool loop.

`run_turn` streams the same event dicts it publishes to the bus, so the HTTP
layer (SSE) can forward them directly while the operator stream also sees them.
"""
import json
import re
from typing import AsyncIterator

import asyncpg

from app.config import settings
from app.events import bus, make_event
from app.providers.llm import get_llm
from app.tools import TOOL_FUNCS, TOOL_SCHEMAS

# Per-session running message history (OpenAI chat format).
SESSIONS: dict[str, list[dict]] = {}

SYSTEM_PROMPT = (
    "You are Abeg, a concise order-taking assistant for a Nigerian food vendor. "
    "You only learn about products, prices and stock by calling tools — never invent "
    "a product, price, discount or availability. "
    "If the customer's requested product or quantity is unclear or missing, ASK a short "
    "clarifying question instead of assuming. "
    "Reject items that are not on the menu rather than guessing a similar one. "
    "Order flow: once the customer names the item(s) and quantity, call reserve_items, "
    "then show them the exact items, quantities, unit prices and total and ask them to confirm. "
    "As soon as they confirm (e.g. 'yes'), IMMEDIATELY call place_order for that reservation and "
    "give them the order reference. Do not ask them to confirm twice. "
    "A customer name is OPTIONAL — never ask for it; if they did not give one, place the order without it. "
    "Keep every reply short and friendly."
)

# Heuristic for the ungrounded-answer guard: a digit near a money/stock keyword.
_UNGROUNDED_RE = re.compile(
    r"\d[\d,\.]*\s*(?:naira|ngn|₦|price|priced|cost|costs|each|per|in stock|available|left|units?|pieces?|pcs)",
    re.IGNORECASE,
)


def _system_message() -> dict:
    return {"role": "system", "content": SYSTEM_PROMPT}


def _assistant_tool_call_message(tool_calls: list[dict]) -> dict:
    return {
        "role": "assistant",
        "content": None,
        "tool_calls": [
            {
                "id": c["id"],
                "type": "function",
                "function": {"name": c["name"], "arguments": json.dumps(c.get("arguments", {}))},
            }
            for c in tool_calls
        ],
    }


async def _dispatch_tool(pool: asyncpg.Pool, session_id: str, name: str, arguments: dict) -> dict:
    func = TOOL_FUNCS.get(name)
    if func is None:
        return {"error": "unknown_tool", "name": name}
    args = dict(arguments or {})
    # Inject session_id only for reserve_items (model never supplies it).
    if name == "reserve_items":
        return await func(pool, args.get("items", []), session_id)
    if name == "check_stock":
        return await func(pool, args.get("sku", ""), session_id=session_id)
    if name == "search_inventory":
        return await func(pool, args.get("query", ""), args.get("limit", 10), session_id=session_id)
    if name == "place_order":
        return await func(
            pool,
            args.get("reservation_id", ""),
            args.get("customer_name", ""),
            args.get("idempotency_key"),
            session_id=session_id,
        )
    if name == "cancel_reservation":
        return await func(pool, args.get("reservation_id", ""), session_id=session_id)
    return await func(pool, **args)


async def run_turn(
    pool: asyncpg.Pool,
    session_id: str,
    user_text: str,
    history: list[dict] | None = None,
) -> AsyncIterator[dict]:
    # Build/resume history.
    if history is not None:
        messages = list(history)
    else:
        messages = SESSIONS.get(session_id)
        if messages is None:
            messages = [_system_message()]
    if not messages or messages[0].get("role") != "system":
        messages = [_system_message()] + messages
    messages.append({"role": "user", "content": user_text})

    llm = get_llm()
    tool_calls_this_turn = 0
    final_text_parts: list[str] = []
    bounded_hit = False
    emitted_any_text = False   # have we streamed visible text yet this turn?

    while True:
        assistant_text_parts: list[str] = []
        pending_tool_calls: list[dict] = []
        segment_started = False   # first delta of THIS reply segment?

        async for item in llm.stream(messages, TOOL_SCHEMAS):
            itype = item.get("type")
            if itype == "delta":
                text = item.get("text", "")
                if text:
                    # Separate a post-tool-call reply from earlier text with a
                    # blank line so they render as distinct Markdown paragraphs.
                    prefix = "\n\n" if (emitted_any_text and not segment_started) else ""
                    segment_started = True
                    emitted_any_text = True
                    assistant_text_parts.append(text)
                    ev = make_event("assistant_delta", {"text": prefix + text}, session_id)
                    bus.publish(ev)
                    yield ev
            elif itype == "tool_calls":
                pending_tool_calls = item.get("tool_calls", [])
            elif itype == "done":
                pass

        if assistant_text_parts:
            final_text_parts.append("".join(assistant_text_parts))

        if not pending_tool_calls:
            break

        # Record the assistant's tool-call intent in the transcript.
        messages.append(_assistant_tool_call_message(pending_tool_calls))

        stop_for_bound = False
        for call in pending_tool_calls:
            if tool_calls_this_turn >= settings.max_tool_calls:
                bounded_hit = True
                stop_for_bound = True
                break
            tool_calls_this_turn += 1
            name = call["name"]
            arguments = call.get("arguments", {})
            result = await _dispatch_tool(pool, session_id, name, arguments)
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": call["id"],
                    "name": name,
                    "content": json.dumps(result, default=str),
                }
            )

        if stop_for_bound:
            break
        # Loop again so the model can react to tool results.

    final_text = "\n\n".join(p for p in final_text_parts if p).strip()

    # Bounded tool calls exceeded: notice + graceful message.
    if bounded_hit:
        notice = make_event(
            "notice", {"message": "bounded tool-call limit reached"}, session_id
        )
        bus.publish(notice)
        yield notice
        final_text = (
            "I've done a few steps but need a hand to finish. Could you clarify what "
            "you'd like so I can complete your order?"
        )

    # Ungrounded-answer guard (only when guardrails on and no tool ran this turn).
    if settings.guardrails and tool_calls_this_turn == 0 and _UNGROUNDED_RE.search(final_text):
        notice = make_event("notice", {"message": "ungrounded answer blocked"}, session_id)
        bus.publish(notice)
        yield notice
        final_text = (
            "Let me check our live inventory before quoting anything — one moment. "
            "Could you tell me the item and quantity you want?"
        )

    # Persist assistant turn to history.
    messages.append({"role": "assistant", "content": final_text})
    SESSIONS[session_id] = messages

    done = make_event("assistant_done", {"text": final_text}, session_id)
    bus.publish(done)
    yield done
