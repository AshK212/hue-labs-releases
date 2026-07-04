"""Telemetry scaffold (Milestone 2).

Opt-in, never-automatic product-analytics events. Builder → Client → Service,
with a configurable endpoint (mock by default) and an opt-out gate on the
service. No personal data, no raw prompts, no logs, no benchmark internals.
"""

from app.telemetry.builder import TelemetryEventBuilder
from app.telemetry.client import (
    MOCK_ENDPOINT,
    TelemetryClient,
    TelemetryResponse,
)
from app.telemetry.schemas import (
    EVENT_NAMES,
    TELEMETRY_SCHEMA_VERSION,
    TelemetryEvent,
)
from app.telemetry.service import TelemetryResult, TelemetryService

__all__ = [
    "TELEMETRY_SCHEMA_VERSION",
    "EVENT_NAMES",
    "TelemetryEvent",
    "TelemetryEventBuilder",
    "TelemetryClient",
    "TelemetryResponse",
    "TelemetryService",
    "TelemetryResult",
    "MOCK_ENDPOINT",
]
