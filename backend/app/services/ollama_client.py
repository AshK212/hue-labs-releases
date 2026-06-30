"""Thin async bridge to the local Ollama HTTP API.

We talk to Ollama over HTTP (default http://127.0.0.1:11434) rather than shelling
out, so the same code works whether Ollama was installed via the app or the CLI.

All functions degrade gracefully: if Ollama isn't running we return a clear,
non-technical status instead of raising.
"""

from __future__ import annotations

import httpx

from app import config
from app.schemas import OllamaModel, OllamaStatus


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


async def generate(model: str, prompt: str, options: dict) -> dict:
    """Run a single non-streaming generation and return Ollama's raw JSON.

    The response includes the *real* timing fields we benchmark on:
    `eval_count` (output tokens) and `eval_duration` (nanoseconds).
    """
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": options,
    }
    async with httpx.AsyncClient(timeout=config.OLLAMA_TIMEOUT_SECONDS) as client:
        resp = await client.post(f"{config.OLLAMA_HOST}/api/generate", json=payload)
        resp.raise_for_status()
        return resp.json()
