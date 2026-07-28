"""Approved production telemetry events and their props allowlists (Stage 4).

The hosted /telemetry endpoint accepts a free-form ``event`` string, but this app
emits ONLY the four approved events and, for each, ONLY an explicit allowlist of
property keys. ``TelemetryEvent.properties`` (or any caller-supplied dict) is
never forwarded verbatim — it is filtered through :func:`allow_props`, so an
unknown or private field can never reach the network.

Nothing here ever carries raw exception text, paths, prompts, generated content,
headers, tokens, or API keys — only small, aggregate, non-identifying values.
"""

from __future__ import annotations

from typing import Any

# The only event names this app is allowed to emit.
APP_OPEN = "app_open"
OPTIMIZE_START = "optimize_start"
OPTIMIZE_COMPLETE = "optimize_complete"
ERROR = "error"

ALLOWED_EVENTS: frozenset[str] = frozenset(
    {APP_OPEN, OPTIMIZE_START, OPTIMIZE_COMPLETE, ERROR}
)

# Per-event property allowlist. A key not listed here is dropped, whatever its
# value. Keeping this explicit is what guarantees no private field leaks.
ALLOWED_PROPS: dict[str, frozenset[str]] = {
    APP_OPEN: frozenset(),  # no props
    OPTIMIZE_START: frozenset({"modelName", "optimizationProfile"}),
    OPTIMIZE_COMPLETE: frozenset(
        {"modelName", "durationMs", "tokensPerSec", "optimizationProfile"}
    ),
    ERROR: frozenset({"stage", "errorType"}),
}


def is_allowed_event(event: str) -> bool:
    return event in ALLOWED_EVENTS


def allow_props(event: str, props: dict[str, Any] | None) -> dict[str, Any]:
    """Return only the allowlisted, non-None props for ``event``.

    Unknown keys are dropped. Unknown events yield ``{}``. ``None`` values are
    dropped so an absent optional field never appears on the wire.
    """
    allowed = ALLOWED_PROPS.get(event, frozenset())
    if not props:
        return {}
    return {k: v for k, v in props.items() if k in allowed and v is not None}
