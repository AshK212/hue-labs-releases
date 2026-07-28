"""Tests for Stage 4: production benchmark/telemetry wired into the app flow.

Covers the integration layer, the required-metrics gate, the event/props
allowlist, privacy gating, retry/runId reuse, lifecycle, and the safety
guarantees (no secret or private value in logs/errors).

Runs under pytest or standalone:

    python tests/test_production_stage4.py   (from backend/)

Deterministic and offline: the transport is injected (or a recording service is
substituted), so there is no network and no real database is touched.
"""

from __future__ import annotations

import asyncio
import io
import logging
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.privacy.schemas import PrivacySettings
from app.production import events
from app.production.client import ProductionApiClient, _RawResponse
from app.production.integration import ProductionIntegration
from app.production.mapper import ProductionRequestMapper
from app.production.service import ProductionSubmissionService
from app.schemas import BenchmarkResult, GpuInfo, HardwareInfo


# --- builders --------------------------------------------------------------

def _result(*, first_token=120.0, vram=4096.0, tps=50.0, seconds=2.0) -> BenchmarkResult:
    return BenchmarkResult(
        model="llama3.2:3b",
        profile="optimized",
        tokens_per_sec=tps,
        output_tokens=100,
        total_seconds=seconds,
        prompt="p",
        options={},
        created_at="2026-07-28T00:00:00+00:00",
        first_token_latency_ms=first_token,
        vram_used_mb=vram,
    )


def _hardware() -> HardwareInfo:
    return HardwareInfo(
        os_name="Windows",
        os_version="11",
        cpu_name="AMD Ryzen 9",
        cpu_cores_physical=8,
        cpu_cores_logical=16,
        memory_total_gb=32.0,
        memory_available_gb=20.0,
        gpus=[GpuInfo(name="NVIDIA RTX 4090", vendor="NVIDIA", vram_gb=24.0)],
    )


class _RecordingService:
    """Stands in for ProductionSubmissionService, capturing built requests.

    Records the exact request objects the integration constructs, so tests can
    assert event names, allowlisted props, runId, and counts synchronously —
    without a running loop or network.
    """

    def __init__(self) -> None:
        self.benchmark: list = []
        self.telemetry: list = []

    def submit_benchmark_request_background(self, req) -> None:
        self.benchmark.append(req)

    def submit_telemetry_request_background(self, req) -> None:
        self.telemetry.append(req)

    async def flush(self, timeout: float = 3.0) -> None:  # pragma: no cover - trivial
        return None


def _integration(service, *, telemetry=True, benchmark=True, run_id="run-1"):
    settings = PrivacySettings(
        telemetry_enabled=telemetry, benchmark_submission_enabled=benchmark
    )
    return ProductionIntegration(
        service=service,
        settings_provider=lambda: settings,
        app_version="1.0.0",
        device_id_provider=lambda: "device-1",
        session_id_provider=lambda: "session-1",
        os_provider=lambda: "Windows 11",
        run_id_factory=lambda: run_id,
    )


def _recording_transport():
    calls: list = []

    async def transport(method, url, headers, json, timeout):
        calls.append({"method": method, "url": url, "headers": dict(headers), "json": json})
        return _RawResponse(status_code=200, body={"status": "ok"})

    return transport, calls


def _real_integration(transport, *, telemetry=True, benchmark=True, api_key="test-key", run_id="run-1"):
    client = ProductionApiClient(
        base_url="https://example.test", api_key=api_key, retry_delay=0, transport=transport
    )
    service = ProductionSubmissionService(client=client)
    return service, _integration(service, telemetry=telemetry, benchmark=benchmark, run_id=run_id)


_cases = []


def case(fn):
    _cases.append(fn)
    return fn


# --- A. benchmark submission behavior -------------------------------------

@case
def test_success_schedules_exactly_one_submission():
    svc = _RecordingService()
    integ = _integration(svc)
    integ.on_optimize_complete(
        model="llama3.2:3b", profile="optimized", hardware=_hardware(), result=_result()
    )
    assert len(svc.benchmark) == 1  # exactly one benchmark submission
    req = svc.benchmark[0]
    assert req.run_id == "run-1"
    assert req.tokens_per_sec == 50.0
    assert req.ram_gb == 32.0
    assert req.first_token_latency_ms == 120.0
    assert req.vram_used_mb == 4096.0


@case
def test_required_missing_metric_causes_safe_skip():
    # vram unavailable (CPU-only machine) → required metric missing → skip.
    svc = _RecordingService()
    integ = _integration(svc)
    integ.on_optimize_complete(
        model="m", profile="baseline", hardware=_hardware(), result=_result(vram=None)
    )
    assert svc.benchmark == []  # no submission
    # optimize_complete telemetry still fires (independent of the skip).
    assert any(r.event == events.OPTIMIZE_COMPLETE for r in svc.telemetry)


@case
def test_missing_first_token_latency_also_skips():
    svc = _RecordingService()
    integ = _integration(svc)
    integ.on_optimize_complete(
        model="m", profile="baseline", hardware=_hardware(), result=_result(first_token=None)
    )
    assert svc.benchmark == []


@case
def test_error_path_does_not_submit_benchmark():
    svc = _RecordingService()
    integ = _integration(svc)
    integ.on_error(stage="benchmark", exc=RuntimeError("boom"))
    assert svc.benchmark == []


@case
def test_disabled_benchmark_submission_builds_no_request():
    svc = _RecordingService()
    integ = _integration(svc, benchmark=False)
    integ.on_optimize_complete(
        model="m", profile="optimized", hardware=_hardware(), result=_result()
    )
    assert svc.benchmark == []            # opted out → nothing scheduled
    assert any(r.event == events.OPTIMIZE_COMPLETE for r in svc.telemetry)  # telemetry independent


# --- B. telemetry events at lifecycle points ------------------------------

@case
def test_each_event_fires_at_its_lifecycle_point():
    svc = _RecordingService()
    integ = _integration(svc)

    integ.on_app_open()
    integ.on_optimize_start(model="llama3.2:3b", profile="baseline")
    integ.on_optimize_complete(
        model="llama3.2:3b", profile="optimized", hardware=_hardware(), result=_result()
    )
    integ.on_error(stage="benchmark", exc=ValueError("x"))

    names = [r.event for r in svc.telemetry]
    assert names == [
        events.APP_OPEN,
        events.OPTIMIZE_START,
        events.OPTIMIZE_COMPLETE,
        events.ERROR,
    ]
    # Only approved events are ever emitted.
    assert all(events.is_allowed_event(n) for n in names)


@case
def test_app_open_fires_once_per_launch():
    svc = _RecordingService()
    integ = _integration(svc)
    integ.on_app_open()
    integ.on_app_open()
    integ.on_app_open()
    opens = [r for r in svc.telemetry if r.event == events.APP_OPEN]
    assert len(opens) == 1  # deduped across repeated calls / dev reloads


@case
def test_optimize_start_props_are_allowlisted():
    svc = _RecordingService()
    integ = _integration(svc)
    integ.on_optimize_start(model="llama3.2:3b", profile="baseline")
    req = svc.telemetry[0]
    assert req.event == events.OPTIMIZE_START
    assert req.props == {"modelName": "llama3.2:3b", "optimizationProfile": "baseline"}


@case
def test_optimize_complete_props_shape():
    svc = _RecordingService()
    integ = _integration(svc)
    integ.on_optimize_complete(
        model="llama3.2:3b", profile="optimized", hardware=_hardware(), result=_result(seconds=2.0)
    )
    complete = next(r for r in svc.telemetry if r.event == events.OPTIMIZE_COMPLETE)
    assert complete.props == {
        "modelName": "llama3.2:3b",
        "optimizationProfile": "optimized",
        "durationMs": 2000,
        "tokensPerSec": 50.0,
    }


# --- props allowlist strips unknown/private fields -------------------------

@case
def test_props_allowlist_removes_unknown_and_private_fields():
    dirty = {
        "modelName": "llama3.2:3b",
        "optimizationProfile": "optimized",
        "durationMs": 1000,
        "tokensPerSec": 42.0,
        # None of these are allowed for optimize_complete:
        "promptText": "the user's private prompt",
        "filePath": "C:/Users/secret/model.gguf",
        "apiKey": "sk-should-never-appear",
    }
    clean = events.allow_props(events.OPTIMIZE_COMPLETE, dirty)
    assert clean == {
        "modelName": "llama3.2:3b",
        "optimizationProfile": "optimized",
        "durationMs": 1000,
        "tokensPerSec": 42.0,
    }
    # And the mapper never forwards a raw dict either.
    req = ProductionRequestMapper().telemetry_request(
        event=events.ERROR, props=dirty, device_id="d", session_id="s"
    )
    assert req.props == {}  # none of those keys are allowed for the error event


@case
def test_app_open_has_empty_props():
    svc = _RecordingService()
    _integration(svc).on_app_open()
    assert svc.telemetry[0].props == {}


# --- C. privacy gating -----------------------------------------------------

@case
def test_disabled_telemetry_emits_nothing():
    svc = _RecordingService()
    integ = _integration(svc, telemetry=False)
    integ.on_app_open()
    integ.on_optimize_start(model="m", profile="baseline")
    integ.on_optimize_complete(model="m", profile="optimized", hardware=_hardware(), result=_result())
    integ.on_error(stage="benchmark", exc=ValueError("x"))
    assert svc.telemetry == []  # telemetry fully off
    # But benchmark submission is independent and still happens.
    assert len(svc.benchmark) == 1


@case
def test_both_disabled_is_fully_silent():
    svc = _RecordingService()
    integ = _integration(svc, telemetry=False, benchmark=False)
    integ.on_app_open()
    integ.on_optimize_complete(model="m", profile="optimized", hardware=_hardware(), result=_result())
    assert svc.telemetry == []
    assert svc.benchmark == []


# --- network-level: disabled → no call, retry reuses runId, no-raise -------

@case
def test_disabled_benchmark_makes_no_network_call():
    transport, calls = _recording_transport()
    _, integ = _real_integration(transport, benchmark=False, telemetry=False)

    async def scenario():
        integ.on_optimize_complete(
            model="m", profile="optimized", hardware=_hardware(), result=_result()
        )
        await integ.flush()

    asyncio.run(scenario())
    assert calls == []  # nothing hit the network


@case
def test_disabled_telemetry_makes_no_network_call():
    transport, calls = _recording_transport()
    _, integ = _real_integration(transport, telemetry=False, benchmark=False)

    async def scenario():
        integ.on_app_open()
        integ.on_optimize_start(model="m", profile="baseline")
        await integ.flush()

    asyncio.run(scenario())
    assert calls == []


@case
def test_retry_reuses_the_same_run_id():
    calls: list = []

    async def transport(method, url, headers, json, timeout):
        calls.append(json)
        if len(calls) == 1:
            return _RawResponse(status_code=503, text="cold start")  # transient → retry
        return _RawResponse(status_code=200, body={"status": "ok"})

    _, integ = _real_integration(transport, telemetry=False, run_id="run-xyz")

    async def scenario():
        integ.on_optimize_complete(
            model="m", profile="optimized", hardware=_hardware(), result=_result()
        )
        await integ.flush()

    asyncio.run(scenario())
    assert len(calls) == 2  # initial + one retry
    assert calls[0]["runId"] == calls[1]["runId"] == "run-xyz"  # same run, one row


@case
def test_cloud_failure_never_raises_out_of_hook():
    async def transport(method, url, headers, json, timeout):
        raise ConnectionError("no route")

    _, integ = _real_integration(transport, telemetry=False)
    after = {"ran": False}

    async def scenario():
        # Must not raise even though every submission attempt fails.
        integ.on_optimize_complete(
            model="m", profile="optimized", hardware=_hardware(), result=_result()
        )
        after["ran"] = True  # local flow continues normally
        await integ.flush()

    asyncio.run(scenario())
    assert after["ran"] is True


# --- D. lifecycle: tasks retained + bounded flush --------------------------

@case
def test_background_tasks_are_retained_and_flushed():
    started = {"n": 0}
    finished = {"n": 0}

    async def transport(method, url, headers, json, timeout):
        started["n"] += 1
        await asyncio.sleep(0.02)  # simulate a slow Render call
        finished["n"] += 1
        return _RawResponse(status_code=200, body={"status": "ok"})

    service, integ = _real_integration(transport, telemetry=False)

    async def scenario():
        integ.on_optimize_complete(
            model="m", profile="optimized", hardware=_hardware(), result=_result()
        )
        # The task must be retained (not GC'd) between scheduling and flush.
        assert len(service._tasks) == 1
        await integ.flush(timeout=2.0)

    asyncio.run(scenario())
    assert started["n"] == 1 and finished["n"] == 1  # ran to completion within flush


@case
def test_flush_is_bounded_when_submission_hangs():
    async def transport(method, url, headers, json, timeout):
        await asyncio.sleep(10)  # would hang well past the flush window
        return _RawResponse(status_code=200)

    _, integ = _real_integration(transport, telemetry=False)

    async def scenario():
        integ.on_optimize_complete(
            model="m", profile="optimized", hardware=_hardware(), result=_result()
        )
        # Bounded: returns promptly even though the submission is still hanging.
        await integ.flush(timeout=0.05)

    asyncio.run(scenario())  # completes; does not wait 10s


# --- E. safety: no secret / private value in logs or errors ----------------

@case
def test_error_message_is_sanitized_no_paths_or_secrets():
    svc = _RecordingService()
    integ = _integration(svc)
    secret_path = r"C:\Users\me\prompt.txt and key sk-SECRET-123"
    integ.on_error(stage="benchmark", exc=FileNotFoundError(secret_path))
    err = next(r for r in svc.telemetry if r.event == events.ERROR)
    assert err.props == {"stage": "benchmark", "errorType": "FileNotFoundError"}
    assert err.error_message == "FileNotFoundError"  # type only, never str(exc)
    blob = err.model_dump_json()
    assert "sk-SECRET-123" not in blob
    assert "prompt.txt" not in blob
    assert "C:\\Users" not in blob


@case
def test_skip_log_contains_no_values_only_field_names():
    buffer = io.StringIO()
    handler = logging.StreamHandler(buffer)
    prod_log = logging.getLogger("local_ai_optimizer.production")
    prod_log.addHandler(handler)
    prod_log.setLevel(logging.INFO)
    try:
        svc = _RecordingService()
        integ = _integration(svc)
        # Missing vram → triggers the "incomplete metrics" skip log.
        integ.on_optimize_complete(
            model="secret-model-name", profile="p", hardware=_hardware(), result=_result(vram=None)
        )
    finally:
        prod_log.removeHandler(handler)
    logged = buffer.getvalue()
    assert "vram_used_mb" in logged           # field NAME is fine
    assert "secret-model-name" not in logged  # no values leak into the skip log


@case
def test_no_api_key_in_service_error_result():
    secret = "sk-live-key-999"

    async def transport(method, url, headers, json, timeout):
        assert headers.get("x-api-key") == secret
        return _RawResponse(status_code=401, body={"error": "unauthorized"})

    service, integ = _real_integration(transport, telemetry=False, api_key=secret)

    async def scenario():
        result = await service.submit_benchmark_request(
            ProductionRequestMapper().benchmark_measurement(
                device_id="d", run_id="r", app_version="1.0.0", hardware=_hardware(),
                model_name="m", model_quant=None, optimization_profile="optimized",
                result=_result(),
            )
        )
        return result

    result = asyncio.run(scenario())
    assert result.status == "failed"
    assert secret not in (result.error or "")


# --- metric surfacing (benchmark.run_benchmark) ----------------------------

@case
def test_run_benchmark_populates_latency_and_vram(monkeypatch=None):
    from app.services import benchmark as bench
    from app.services import ollama_client

    async def fake_generate(model, prompt, options):
        return {
            "eval_count": 100,
            "eval_duration": 2_000_000_000,      # 2s
            "load_duration": 500_000_000,        # 0.5s
            "prompt_eval_duration": 100_000_000, # 0.1s  → first token ≈ 600ms
        }

    async def fake_vram(model):
        return 4096.0

    orig_gen = ollama_client.generate
    orig_vram = ollama_client.used_vram_mb
    ollama_client.generate = fake_generate
    ollama_client.used_vram_mb = fake_vram
    try:
        result = asyncio.run(bench.run_benchmark("m", "optimized", _hardware()))
    finally:
        ollama_client.generate = orig_gen
        ollama_client.used_vram_mb = orig_vram
    assert result.first_token_latency_ms == 600.0
    assert result.vram_used_mb == 4096.0


@case
def test_run_benchmark_survives_vram_probe_failure():
    from app.services import benchmark as bench
    from app.services import ollama_client

    async def fake_generate(model, prompt, options):
        return {"eval_count": 50, "eval_duration": 1_000_000_000}

    async def boom(model):
        raise RuntimeError("ps failed")

    orig_gen = ollama_client.generate
    orig_vram = ollama_client.used_vram_mb
    ollama_client.generate = fake_generate
    ollama_client.used_vram_mb = boom
    try:
        result = asyncio.run(bench.run_benchmark("m", "baseline", _hardware()))
    finally:
        ollama_client.generate = orig_gen
        ollama_client.used_vram_mb = orig_vram
    # Local benchmark still succeeds; vram simply stays None (submission will skip).
    assert result.tokens_per_sec == 50.0
    assert result.vram_used_mb is None


def _run_all() -> None:
    for fn in _cases:
        fn()
        print(f"  ok  {fn.__name__}")
    print(f"\n{len(_cases)} passed")


if __name__ == "__main__":
    _run_all()
