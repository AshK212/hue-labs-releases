"""Builds telemetry events with safe, aggregate-only properties.

The builder owns event construction so no caller can accidentally attach personal
data, raw prompts, log text, or benchmark internals. Every ``build_*`` helper
accepts only small primitive inputs and drops ``None`` values from properties.

``event_id`` and ``created_at`` come from injectable factories so tests are
deterministic; production defaults to a random uuid + current UTC time.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Callable, Optional
from uuid import uuid4

from app.telemetry.schemas import EventName, TelemetryEvent


class TelemetryEventBuilder:
    """Create TelemetryEvents for a given install (app version + anonymous id)."""

    def __init__(
        self,
        app_version: Optional[str] = None,
        anonymous_id: str = "anonymous",
        id_factory: Optional[Callable[[], str]] = None,
        clock: Optional[Callable[[], str]] = None,
    ) -> None:
        self.app_version = app_version
        self.anonymous_id = anonymous_id
        self._id_factory = id_factory or (lambda: uuid4().hex)
        self._clock = clock or (lambda: datetime.now(timezone.utc).isoformat())

    def _event(self, name: EventName, properties: Optional[dict] = None) -> TelemetryEvent:
        clean = {k: v for k, v in (properties or {}).items() if v is not None}
        return TelemetryEvent(
            event_id=self._id_factory(),
            event_name=name,
            app_version=self.app_version,
            created_at=self._clock(),
            anonymous_id=self.anonymous_id,
            properties=clean,
        )

    # --- Event helpers (aggregate, non-personal properties only) ----------

    def build_first_run(self) -> TelemetryEvent:
        return self._event("first_run")

    def build_detect_complete(
        self,
        *,
        has_gpu: bool,
        gpu_vendor: Optional[str] = None,
        vram_bucket: Optional[str] = None,
    ) -> TelemetryEvent:
        # Coarse hardware class only — no device names/serials/paths.
        return self._event(
            "detect_complete",
            {"has_gpu": has_gpu, "gpu_vendor": gpu_vendor, "vram_bucket": vram_bucket},
        )

    def build_first_optimization_complete(
        self,
        *,
        had_winner: bool,
        improvement_percent: Optional[float] = None,
        score: Optional[float] = None,
    ) -> TelemetryEvent:
        # Headline aggregates only — no tps arrays, candidates, spill signals, prompts.
        props: dict = {"had_winner": had_winner}
        if improvement_percent is not None:
            props["improvement_percent"] = round(improvement_percent, 2)
        if score is not None:
            props["score"] = round(score, 2)
        return self._event("first_optimization_complete", props)

    def build_card_shared(self, *, provider: str) -> TelemetryEvent:
        return self._event("card_shared", {"provider": provider})

    def build_submission_sent(
        self, *, success: bool, status: Optional[str] = None
    ) -> TelemetryEvent:
        return self._event("submission_sent", {"success": success, "status": status})

    def build_upgrade_click(self, *, source: Optional[str] = None) -> TelemetryEvent:
        return self._event("upgrade_click", {"source": source})
