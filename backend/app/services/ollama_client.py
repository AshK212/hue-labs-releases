"""Thin async bridge to the local Ollama HTTP API.

We talk to Ollama over HTTP (default http://127.0.0.1:11434) rather than shelling
out, so the same code works whether Ollama was installed via the app or the CLI.

All functions degrade gracefully: if Ollama isn't running we return a clear,
non-technical status instead of raising.
"""

from __future__ import annotations

import json
import logging
from typing import AsyncIterator

import httpx

from app import config
from app.schemas import OllamaModel, OllamaStatus

logger = logging.getLogger("local_ai_optimizer.ollama")


class OllamaError(Exception):
    """A failure talking to Ollama, carrying a message safe to show the user."""


def _bytes_to_gb(value: int | None) -> float | None:
    if not value:
        return None
    return round(value / (1024 ** 3), 2)


async def get_status() -> OllamaStatus:
    """Check whether Ollama is reachable and list installed models."""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            version_resp = await client.get(f"{config.OLLAMA_HOST}/api/version")
            version_resp.raise_for_status()
            version = version_resp.json().get("version")

            tags_resp = await client.get(f"{config.OLLAMA_HOST}/api/tags")
            tags_resp.raise_for_status()
            models = [
                OllamaModel(name=m["name"], size_gb=_bytes_to_gb(m.get("size")))
                for m in tags_resp.json().get("models", [])
            ]

        return OllamaStatus(
            installed=True,
            running=True,
            version=version,
            models=models,
            message="Ollama is running and ready.",
        )
    except (httpx.ConnectError, httpx.ConnectTimeout):
        # Port not answering — most commonly Ollama is installed but not started,
        # or not installed at all. We can't tell the difference over HTTP alone,
        # so we give guidance that covers both cases.
        return OllamaStatus(
            installed=False,
            running=False,
            message=(
                "We couldn't reach Ollama. If it's installed, start the Ollama app. "
                "If you don't have it yet, install it from ollama.com — then come back."
            ),
        )
    except Exception as exc:  # pragma: no cover - defensive
        return OllamaStatus(
            installed=False,
            running=False,
            message=f"Couldn't check Ollama right now ({exc.__class__.__name__}).",
        )


async def has_model(model: str) -> bool:
    status = await get_status()
    names = {m.name for m in status.models}
    # Ollama tags default to ":latest"; match both "name" and "name:latest".
    return model in names or f"{model}:latest" in names or any(
        n.split(":")[0] == model.split(":")[0] for n in names
    )


async def pull_model(model: str) -> None:
    """Pull a model, blocking until complete. Streams progress from Ollama.

    Used by the one-click "Download this model" action. Raises on failure so the
    route can surface a clear error.
    """
    async with httpx.AsyncClient(timeout=None) as client:
        async with client.stream(
            "POST", f"{config.OLLAMA_HOST}/api/pull", json={"name": model}
        ) as resp:
            resp.raise_for_status()
            async for _line in resp.aiter_lines():
                # We intentionally drain the stream to completion. A future
                # iteration can forward these progress events to the UI via SSE.
                pass


def classify_pull_phase(status: str) -> str:
    """Map an Ollama pull `status` string to a small, stable set of phases.

    Ollama's status text varies between versions ("pulling manifest",
    "downloading <digest>", "verifying sha256 digest", "writing manifest",
    "success"). We normalize it so the UI can show a clean label.
    """
    s = (status or "").lower()
    if "success" in s:
        return "complete"
    if "verif" in s:
        return "verifying"
    if "writing manifest" in s or "removing" in s:
        return "finalizing"
    if "download" in s or "pulling" in s and "manifest" not in s:
        return "downloading"
    if "manifest" in s or "pulling" in s:
        return "preparing"
    return "preparing"


async def pull_model_stream(model: str) -> AsyncIterator[dict]:
    """Pull a model, yielding normalized progress events as they arrive.

    Each event mirrors Ollama's real numbers (`total`/`completed` bytes per layer)
    plus a normalized `phase`. We never invent values; if Ollama doesn't report a
    size, we simply don't emit one. Closing the consumer (client disconnect)
    tears down the underlying HTTP stream.
    """
    async with httpx.AsyncClient(timeout=None) as client:
        async with client.stream(
            "POST", f"{config.OLLAMA_HOST}/api/pull", json={"name": model}
        ) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line.strip():
                    continue
                try:
                    data = json.loads(line)
                except json.JSONDecodeError:
                    continue

                if data.get("error"):
                    yield {"phase": "error", "error": data["error"]}
                    return

                status = data.get("status", "")
                event: dict = {"status": status, "phase": classify_pull_phase(status)}
                if "digest" in data:
                    event["digest"] = data["digest"]
                if isinstance(data.get("total"), int):
                    event["total"] = data["total"]
                if isinstance(data.get("completed"), int):
                    event["completed"] = data["completed"]
                yield event


async def generate(model: str, prompt: str, options: dict) -> dict:
    """Run a single non-streaming generation and return Ollama's raw JSON.

    The response includes the *real* timing fields we benchmark on:
    `eval_count` (output tokens) and `eval_duration` (nanoseconds).

    Raises `OllamaError` with a clear, user-safe message on any failure, so the
    caller never has to surface an empty error string.
    """
    url = f"{config.OLLAMA_HOST}/api/generate"
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": options,
    }

    # Be generous on read (model load + generation can be slow) but fail fast if
    # Ollama isn't even accepting connections.
    timeout = httpx.Timeout(
        connect=10.0,
        read=config.OLLAMA_TIMEOUT_SECONDS,
        write=30.0,
        pool=10.0,
    )

    logger.info("generate -> model=%s options=%s", model, options)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(url, json=payload)
    except httpx.ConnectError as exc:
        raise OllamaError(
            "Couldn't connect to Ollama. Make sure the Ollama app is running, then "
            "try again."
        ) from exc
    except httpx.TimeoutException as exc:
        raise OllamaError(
            "Ollama took too long to respond. The model may still be loading into "
            "memory. Wait a few seconds and try again."
        ) from exc
    except httpx.HTTPError as exc:
        raise OllamaError(f"Couldn't reach Ollama ({exc.__class__.__name__}).") from exc

    if resp.status_code != 200:
        # Surface Ollama's own explanation (e.g. a bad model name or option).
        body = resp.text.strip()
        detail = body[:400] if body else "no details provided"
        raise OllamaError(
            f"Ollama rejected the request (HTTP {resp.status_code}): {detail}"
        )

    try:
        return resp.json()
    except ValueError as exc:
        raise OllamaError("Ollama returned a response that couldn't be read.") from exc
