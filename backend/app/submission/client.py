"""Transport for sending a SubmissionPayload to a submission endpoint.

Single responsibility: ``submit(payload) -> SubmissionResponse``. It knows how to
talk to an endpoint; it does not build payloads or touch the OptimizationRun.

There is **no hardcoded production URL**. The endpoint is configurable (argument
or ``HUE_LABS_SUBMISSION_ENDPOINT`` env var). When none is configured, the client
uses a built-in **mock transport** that accepts the payload locally and returns a
deterministic id — so the pipeline is fully exercisable with no network access.
"""

from __future__ import annotations

import hashlib
import json
import os
from dataclasses import dataclass
from typing import Awaitable, Callable, Optional

from app.submission.schemas import SubmissionPayload

ENV_ENDPOINT = "HUE_LABS_SUBMISSION_ENDPOINT"
# A clearly non-network placeholder used when no real endpoint is configured.
MOCK_ENDPOINT = "mock://hue-labs/submissions"


@dataclass
class SubmissionResponse:
    """Outcome of a submit attempt. Backend-only (not part of any API)."""

    ok: bool
    submission_id: Optional[str] = None
    error: Optional[str] = None
    status_code: Optional[int] = None


# A transport takes (endpoint, json-body) and returns a response.
Transport = Callable[[str, dict], Awaitable[SubmissionResponse]]


def _deterministic_id(body: dict) -> str:
    """Stable id derived from the payload — deterministic, no randomness."""
    raw = json.dumps(body, sort_keys=True).encode("utf-8")
    return "sub_" + hashlib.sha1(raw).hexdigest()[:12]


async def _mock_transport(endpoint: str, body: dict) -> SubmissionResponse:
    """Accept the payload locally. No network, deterministic id."""
    return SubmissionResponse(ok=True, submission_id=_deterministic_id(body), status_code=200)


def _make_http_transport(timeout: float) -> Transport:
    """Real HTTP transport (used only when a real endpoint is configured)."""

    async def _http_transport(endpoint: str, body: dict) -> SubmissionResponse:
        import httpx  # lazy import: only needed for a real submission

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(endpoint, json=body)
        except httpx.HTTPError as exc:
            return SubmissionResponse(ok=False, error=f"Network error: {exc}")

        if resp.status_code // 100 != 2:
            detail = resp.text.strip()[:300] or "no details"
            return SubmissionResponse(
                ok=False, error=f"Endpoint rejected the submission (HTTP {resp.status_code}): {detail}",
                status_code=resp.status_code,
            )
        submission_id = None
        try:
            submission_id = resp.json().get("id") or resp.json().get("submission_id")
        except ValueError:
            pass
        return SubmissionResponse(ok=True, submission_id=submission_id, status_code=resp.status_code)

    return _http_transport


class SubmissionClient:
    """Sends payloads to a configurable endpoint (mock by default)."""

    def __init__(
        self,
        endpoint: Optional[str] = None,
        transport: Optional[Transport] = None,
        timeout: float = 10.0,
    ) -> None:
        resolved = endpoint or os.getenv(ENV_ENDPOINT)
        if transport is not None:
            # Explicit transport wins (used for tests / custom senders).
            self.endpoint = resolved or MOCK_ENDPOINT
            self._transport = transport
        elif resolved is None:
            # No endpoint configured anywhere → safe local mock.
            self.endpoint = MOCK_ENDPOINT
            self._transport = _mock_transport
        else:
            self.endpoint = resolved
            self._transport = _make_http_transport(timeout)

    @property
    def is_mock(self) -> bool:
        return self._transport is _mock_transport

    async def submit(self, payload: SubmissionPayload) -> SubmissionResponse:
        return await self._transport(self.endpoint, payload.model_dump())
