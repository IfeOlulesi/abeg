"""Speech-to-text providers. DeepgramStt bridges a browser WebSocket to Deepgram.

The FastAPI WebSocket carries raw 16kHz linear16 PCM binary frames from the
browser mic. We forward those frames to Deepgram's streaming API and relay
interim/final transcripts back to the browser as JSON.
"""
import asyncio
import json
from abc import ABC, abstractmethod

import websockets

from app.config import settings

DEEPGRAM_URL = (
    "wss://api.deepgram.com/v1/listen"
    "?model=nova-2&encoding=linear16&sample_rate=16000"
    "&interim_results=true&punctuate=true"
)


class SttProvider(ABC):
    @abstractmethod
    async def relay(self, client_ws) -> None:
        ...


class DeepgramStt(SttProvider):
    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or settings.deepgram_api_key

    async def relay(self, client_ws) -> None:
        """Bridge `client_ws` (FastAPI WebSocket) <-> Deepgram."""
        headers = {"Authorization": f"Token {self.api_key}"}
        try:
            # websockets >= 12 uses additional_headers; older uses extra_headers.
            try:
                dg = await websockets.connect(DEEPGRAM_URL, additional_headers=headers)
            except TypeError:
                dg = await websockets.connect(DEEPGRAM_URL, extra_headers=headers)
        except Exception as exc:  # noqa: BLE001
            try:
                await client_ws.send_json({"type": "error", "message": f"stt connect failed: {exc}"})
            except Exception:  # noqa: BLE001
                pass
            return

        async def pump_client_to_dg() -> None:
            """Forward binary audio frames from browser to Deepgram."""
            try:
                while True:
                    msg = await client_ws.receive()
                    if msg.get("type") == "websocket.disconnect":
                        break
                    data = msg.get("bytes")
                    if data is not None:
                        await dg.send(data)
                        continue
                    text = msg.get("text")
                    if text is not None:
                        # Allow an explicit stop signal from the client.
                        if text.strip().lower() in {"stop", "close", "closestream"}:
                            break
            except Exception:  # noqa: BLE001
                pass
            finally:
                # Tell Deepgram no more audio is coming.
                try:
                    await dg.send(json.dumps({"type": "CloseStream"}))
                except Exception:  # noqa: BLE001
                    pass

        async def pump_dg_to_client() -> None:
            """Relay Deepgram transcripts back to the browser."""
            try:
                async for raw in dg:
                    try:
                        result = json.loads(raw)
                    except (json.JSONDecodeError, TypeError):
                        continue
                    if result.get("type") not in (None, "Results"):
                        continue
                    alt = (
                        result.get("channel", {})
                        .get("alternatives", [{}])[0]
                    )
                    transcript = alt.get("transcript", "")
                    if not transcript:
                        continue
                    is_final = bool(result.get("is_final"))
                    try:
                        await client_ws.send_json(
                            {"type": "final" if is_final else "interim", "transcript": transcript}
                        )
                    except Exception:  # noqa: BLE001
                        break
            except Exception:  # noqa: BLE001
                pass

        try:
            sender = asyncio.create_task(pump_client_to_dg())
            receiver = asyncio.create_task(pump_dg_to_client())
            done, pending = await asyncio.wait(
                {sender, receiver}, return_when=asyncio.FIRST_COMPLETED
            )
            for task in pending:
                task.cancel()
        except Exception:  # noqa: BLE001
            pass
        finally:
            try:
                await dg.close()
            except Exception:  # noqa: BLE001
                pass


def get_stt() -> SttProvider:
    return DeepgramStt()
