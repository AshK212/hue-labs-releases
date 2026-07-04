"""Data contract for the Telemetry scaffold (Milestone 2).

A ``TelemetryEvent`` is a single, minimal product-analytics event. It carries an
opaque ``anonymous_id`` and a small ``properties`` bag of *aggregate, non-personal*
values only. It must never contain personal data, raw prompts, log lines, or full
benchmark internals — the builder is responsible for keeping properties clean.

Telemetry is opt-in and never emitted automatically (see service.py).
"""

from __future__ import annotations

from typing import Literal, get_args

from pydantic import BaseModel, Field

# Bump when the event shape changes in a breaking way.
TELEMETRY_SCHEMA_VERSION: str = "telemetry-v1"

# The closed set of events this scaffold supports.
EventName = Literal[
    "first_run",
    "detect_complete",
    "first_optimization_complete",
    "card_shared",
    "submission_sent",
    "upgrade_click",
]

EVENT_NAMES: frozenset[str] = frozenset(get_args(EventName))


class TelemetryEvent(BaseModel):
    """One telemetry event. JSON-serializable; no PII, prompts, or logs."""

    event_id: str
    event_name: EventName
    schema_version: str = TELEMETRY_SCHEMA_VERSION
    app_version: str | None = None
    created_at: str
    anonymous_id: str
    properties: dict = Field(default_factory=dict)
