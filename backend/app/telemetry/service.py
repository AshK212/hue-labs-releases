"""Coordinates telemetry: Builder → Client → result, honoring opt-out.

The service is the single entry point for emitting an event. It is **exposed, not
invoked automatically** — nothing in the optimization/submission flow calls it.

Opt-out: when ``enabled`` is false the service does **not** submit anything and
returns a ``skipped`` result. Failures never raise; they return a ``failed``
result so a caller can ignore telemetry problems safely.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from app.telemetry.builder import TelemetryEventBuilder
from app.telemetry.client import TelemetryClient
from app.telemetry.schemas import TelemetryEvent


@dataclass
class TelemetryResult:
    """Outcome of an emit call. Backend-only."""

    status: str  # "sent" | "skipped" | "failed"
    event_name: str
    event_id: Optional[str] = None
    error: Optional[str] = None


class TelemetryService:
    """Build → send → record, gated by the opt-in ``enabled`` flag."""

    def __init__(
        self,
        builder: Optional[TelemetryEventBuilder] = None,
        client: Optional[TelemetryClient] = None,
        enabled: bool = True,
    ) -> None:
        self._builder = builder or TelemetryEventBuilder()
        self._client = client or TelemetryClient()  # defaults to the local mock
        self.enabled = enabled

    @property
    def builder(self) -> TelemetryEventBuilder:
        return self._builder

    async def emit(self, event: TelemetryEvent) -> TelemetryResult:
        """Submit one event, honoring opt-out. Never raises."""
        if not self.enabled:
            # Opt-out: do not submit. Return a skipped result.
            return TelemetryResult(status="skipped", event_name=event.event_name, event_id=event.event_id)

        try:
            response = await self._client.submit(event)
        except Exception as exc:  # noqa: BLE001 - telemetry must never break the caller
            return TelemetryResult(
                status="failed", event_name=event.event_name, event_id=event.event_id,
                error=f"{type(exc).__name__}: {exc}",
            )

        if response.ok:
            return TelemetryResult(
                status="sent", event_name=event.event_name,
                event_id=response.event_id or event.event_id,
            )
        return TelemetryResult(
            status="failed", event_name=event.event_name, event_id=event.event_id,
            error=response.error or "The telemetry endpoint rejected the event.",
        )

    # --- Convenience coordinators (build via the builder, then emit) ------

    async def capture_first_run(self) -> TelemetryResult:
        return await self.emit(self._builder.build_first_run())

    async def capture_detect_complete(self, **kwargs) -> TelemetryResult:
        return await self.emit(self._builder.build_detect_complete(**kwargs))

    async def capture_first_optimization_complete(self, **kwargs) -> TelemetryResult:
        return await self.emit(self._builder.build_first_optimization_complete(**kwargs))

    async def capture_card_shared(self, **kwargs) -> TelemetryResult:
        return await self.emit(self._builder.build_card_shared(**kwargs))

    async def capture_submission_sent(self, **kwargs) -> TelemetryResult:
        return await self.emit(self._builder.build_submission_sent(**kwargs))

    async def capture_upgrade_click(self, **kwargs) -> TelemetryResult:
        return await self.emit(self._builder.build_upgrade_click(**kwargs))
