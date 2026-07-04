"""Transport for sending a TelemetryEvent to a telemetry endpoint.

Single responsibility: ``submit(event) -> TelemetryResponse``. There is **no
hardcoded production endpoint**; it is configurable via argument or the
``HUE_LABS_TELEMETRY_ENDPOINT`` env var. With none configured, a built-in **mock
transport** accepts events locally (no network) so the pipeline is fully testable.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Awaitable, Callable, Optional

from app.telemetry.schemas import TelemetryEvent

ENV_ENDPOINT = "HUE_LABS_TELEMETRY_ENDPOINT"
MOCK_ENDPOINT = "mock://hue-labs/telemetry"


@dataclass
class TelemetryResponse:
    """Outcome of a submit attempt. Backend-only (not part of any API)."""

    ok: bool
    event_id: Optional[str] = None
    error: Optional[str] = None
    status_code: Optional[int] = None


Transport = Callable[[str, dict], Awaitable[TelemetryResponse]]


async def _mock_transport(endpoint: str, body: dict) -> TelemetryResponse:
    """Accept the event locally, echoing its id. No network, deterministic."""
    return TelemetryResponse(ok=True, event_id=body.get("event_id"), status_code=200)


def _make_http_transport(timeout: float) -> Transport:
    """Real HTTP transport (used only when a real endpoint is configured)."""

    async def _http_transport(endpoint: str, body: dict) -> TelemetryResponse:
        import httpx  # lazy import: only needed for a real emit

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(endpoint, json=body)
        except httpx.HTTPError as exc:
            return TelemetryResponse(ok=False, error=f"Network error: {exc}")

        if resp.status_code // 100 != 2:
            return TelemetryResponse(
                ok=False,
                error=f"Telemetry endpoint rejected the event (HTTP {resp.status_code}).",
                status_code=resp.status_code,
            )
        return TelemetryResponse(ok=True, event_id=body.get("event_id"), status_code=resp.status_code)

    return _http_transport


class TelemetryClient:
    """Sends events to a configurable endpoint (mock by default)."""

    def __init__(
        self,
        endpoint: Optional[str] = None,
        transport: Optional[Transport] = None,
        timeout: float = 5.0,
    ) -> None:
        resolved = endpoint or os.getenv(ENV_ENDPOINT)
        if transport is not None:
            self.endpoint = resolved or MOCK_ENDPOINT
            self._transport = transport
        elif resolved is None:
            self.endpoint = MOCK_ENDPOINT
            self._transport = _mock_transport
        else:
            self.endpoint = resolved
            self._transport = _make_http_transport(timeout)

    @property
    def is_mock(self) -> bool:
        return self._transport is _mock_transport

    async def submit(self, event: TelemetryEvent) -> TelemetryResponse:
        return await self._transport(self.endpoint, event.model_dump())
