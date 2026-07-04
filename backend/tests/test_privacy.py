"""Tests for privacy settings + service gating (Milestone 2).

Runs under pytest or standalone:

    python tests/test_privacy.py   (from backend/)

Deterministic — an in-memory store replaces SQLite; telemetry/submission use
mock or injected transports (no network).
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
from typing import Optional

# Make `app` importable when run directly.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.optimization.schemas import OptimizationRun
from app.privacy.schemas import PrivacySettings
from app.privacy.service import PrivacyService
from app.submission.client import SubmissionClient, SubmissionResponse
from app.telemetry.client import TelemetryClient, TelemetryResponse


class DictStore:
    """In-memory settings store (stands in for the SQLite one)."""

    def __init__(self) -> None:
        self.data: dict[str, str] = {}

    def get(self, key: str) -> Optional[str]:
        return self.data.get(key)

    def set(self, key: str, value: str) -> None:
        self.data[key] = value


def test_privacy_serialization_and_defaults() -> None:
    settings = PrivacySettings()
    assert settings.telemetry_enabled is True
    assert settings.benchmark_submission_enabled is True
    assert settings.crash_reports_enabled is False
    decoded = json.loads(settings.model_dump_json())
    assert decoded == {
        "telemetry_enabled": True,
        "benchmark_submission_enabled": True,
        "crash_reports_enabled": False,
    }


def test_persistence_round_trip() -> None:
    service = PrivacyService(store=DictStore())
    assert service.get_settings().telemetry_enabled is True  # default
    service.update(telemetry_enabled=False)
    # Re-read (fresh service, same store) reflects the persisted change.
    reloaded = PrivacyService(store=service._store).get_settings()
    assert reloaded.telemetry_enabled is False
    assert reloaded.benchmark_submission_enabled is True


def test_telemetry_enabled_submits() -> None:
    privacy = PrivacyService(store=DictStore())  # telemetry_enabled default True
    calls = {"n": 0}

    async def counting(endpoint: str, body: dict) -> TelemetryResponse:
        calls["n"] += 1
        return TelemetryResponse(ok=True, event_id=body.get("event_id"))

    telemetry = privacy.build_telemetry_service(client=TelemetryClient(transport=counting))
    result = asyncio.run(telemetry.capture_first_run())
    assert result.status == "sent"
    assert calls["n"] == 1


def test_telemetry_disabled_skips() -> None:
    privacy = PrivacyService(store=DictStore())
    privacy.update(telemetry_enabled=False)
    calls = {"n": 0}

    async def counting(endpoint: str, body: dict) -> TelemetryResponse:
        calls["n"] += 1
        return TelemetryResponse(ok=True)

    telemetry = privacy.build_telemetry_service(client=TelemetryClient(transport=counting))
    result = asyncio.run(telemetry.capture_first_run())
    assert result.status == "skipped"
    assert calls["n"] == 0  # nothing submitted


def test_submission_disabled_opts_out() -> None:
    privacy = PrivacyService(store=DictStore())
    privacy.update(benchmark_submission_enabled=False)
    calls = {"n": 0}

    async def counting(endpoint: str, body: dict) -> SubmissionResponse:
        calls["n"] += 1
        return SubmissionResponse(ok=True, submission_id="x")

    submission = privacy.build_submission_service(client=SubmissionClient(transport=counting))
    run = asyncio.run(submission.submit_run(OptimizationRun(run_id="r1")))
    assert run.submission.state == "opted_out"
    assert calls["n"] == 0  # nothing sent


def test_submission_enabled_sends() -> None:
    privacy = PrivacyService(store=DictStore())  # submission default True
    submission = privacy.build_submission_service()  # default mock client
    run = asyncio.run(submission.submit_run(OptimizationRun(run_id="r2")))
    assert run.submission.state == "submitted"
    assert run.submission.submission_id is not None


def _run_all() -> None:
    tests = [
        test_privacy_serialization_and_defaults,
        test_persistence_round_trip,
        test_telemetry_enabled_submits,
        test_telemetry_disabled_skips,
        test_submission_disabled_opts_out,
        test_submission_enabled_sends,
    ]
    for test in tests:
        test()
        print(f"  ok  {test.__name__}")
    print(f"\n{len(tests)} passed")


if __name__ == "__main__":
    _run_all()
