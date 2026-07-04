"""Tests for the Telemetry scaffold (Milestone 2).

Runs under pytest or standalone:

    python tests/test_telemetry.py   (from backend/)

Deterministic — the builder uses injected id/clock factories and the default
client is the local mock (no network). Failure cases inject stub transports.
"""

from __future__ import annotations

import asyncio
import json
import os
import sys

# Make `app` importable when run directly.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.telemetry.builder import TelemetryEventBuilder
from app.telemetry.client import TelemetryClient, TelemetryResponse
from app.telemetry.schemas import EVENT_NAMES, TELEMETRY_SCHEMA_VERSION
from app.telemetry.service import TelemetryService


def _builder() -> TelemetryEventBuilder:
    # Deterministic ids/timestamps for stable assertions.
    return TelemetryEventBuilder(
        app_version="0.2.0",
        anonymous_id="anon-123",
        id_factory=lambda: "evt-1",
        clock=lambda: "2026-07-04T00:00:00+00:00",
    )


def test_event_serialization() -> None:
    event = _builder().build_first_optimization_complete(
        had_winner=True, improvement_percent=14.673, score=88.0
    )
    decoded = json.loads(event.model_dump_json())
    assert decoded["event_id"] == "evt-1"
    assert decoded["event_name"] == "first_optimization_complete"
    assert decoded["schema_version"] == TELEMETRY_SCHEMA_VERSION
    assert decoded["app_version"] == "0.2.0"
    assert decoded["anonymous_id"] == "anon-123"
    assert decoded["created_at"] == "2026-07-04T00:00:00+00:00"
    assert decoded["properties"] == {"had_winner": True, "improvement_percent": 14.67, "score": 88.0}


def test_required_event_names() -> None:
    b = _builder()
    built = {
        b.build_first_run().event_name,
        b.build_detect_complete(has_gpu=True, gpu_vendor="NVIDIA", vram_bucket="12gb").event_name,
        b.build_first_optimization_complete(had_winner=False).event_name,
        b.build_card_shared(provider="x").event_name,
        b.build_submission_sent(success=True).event_name,
        b.build_upgrade_click(source="results").event_name,
    }
    expected = {
        "first_run", "detect_complete", "first_optimization_complete",
        "card_shared", "submission_sent", "upgrade_click",
    }
    assert built == expected
    assert EVENT_NAMES == expected


def test_optout_skips_submission() -> None:
    calls = {"n": 0}

    async def counting_transport(endpoint: str, body: dict) -> TelemetryResponse:
        calls["n"] += 1
        return TelemetryResponse(ok=True, event_id=body.get("event_id"))

    service = TelemetryService(
        builder=_builder(),
        client=TelemetryClient(transport=counting_transport),
        enabled=False,  # opted out
    )
    result = asyncio.run(service.capture_first_run())
    assert result.status == "skipped"
    assert calls["n"] == 0  # nothing was submitted


def test_mock_submission_succeeds() -> None:
    service = TelemetryService(builder=_builder(), enabled=True)  # default mock client
    result = asyncio.run(service.capture_card_shared(provider="x"))
    assert result.status == "sent"
    assert result.event_name == "card_shared"
    assert result.event_id == "evt-1"
    assert result.error is None


def test_failure_does_not_raise() -> None:
    async def exploding_transport(endpoint: str, body: dict) -> TelemetryResponse:
        raise RuntimeError("telemetry endpoint down")

    service = TelemetryService(
        builder=_builder(),
        client=TelemetryClient(transport=exploding_transport),
        enabled=True,
    )
    result = asyncio.run(service.capture_first_run())  # must not raise
    assert result.status == "failed"
    assert "telemetry endpoint down" in (result.error or "")


def test_rejected_event_is_failed_not_raised() -> None:
    async def rejecting_transport(endpoint: str, body: dict) -> TelemetryResponse:
        return TelemetryResponse(ok=False, error="rejected", status_code=400)

    service = TelemetryService(
        builder=_builder(), client=TelemetryClient(transport=rejecting_transport), enabled=True
    )
    result = asyncio.run(service.capture_first_run())
    assert result.status == "failed"
    assert "rejected" in (result.error or "")


def test_no_personal_or_prompt_fields() -> None:
    b = _builder()
    events = [
        b.build_first_run(),
        b.build_detect_complete(has_gpu=True, gpu_vendor="NVIDIA", vram_bucket="12gb"),
        b.build_first_optimization_complete(had_winner=True, improvement_percent=14.7, score=88.0),
        b.build_card_shared(provider="x"),
        b.build_submission_sent(success=True, status="submitted"),
        b.build_upgrade_click(source="results"),
    ]
    allowed_top = {
        "event_id", "event_name", "schema_version", "app_version",
        "created_at", "anonymous_id", "properties",
    }
    banned = {"prompt", "prompts", "log", "logs", "email", "name", "path",
              "file", "raw", "user", "username", "ip", "tokens", "candidate", "spill"}
    for event in events:
        decoded = json.loads(event.model_dump_json())
        assert set(decoded.keys()) == allowed_top  # no extra top-level fields
        for key in decoded["properties"]:
            assert key.lower() not in banned, f"property '{key}' looks unsafe"


def test_default_client_is_mock_no_network() -> None:
    os.environ.pop("HUE_LABS_TELEMETRY_ENDPOINT", None)
    client = TelemetryClient()
    assert client.is_mock is True
    assert client.endpoint == "mock://hue-labs/telemetry"


def _run_all() -> None:
    tests = [
        test_event_serialization,
        test_required_event_names,
        test_optout_skips_submission,
        test_mock_submission_succeeds,
        test_failure_does_not_raise,
        test_rejected_event_is_failed_not_raised,
        test_no_personal_or_prompt_fields,
        test_default_client_is_mock_no_network,
    ]
    for test in tests:
        test()
        print(f"  ok  {test.__name__}")
    print(f"\n{len(tests)} passed")


if __name__ == "__main__":
    _run_all()
