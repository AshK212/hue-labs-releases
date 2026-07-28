"""Tests for production benchmark/telemetry submission (Milestone 3, Stage 3).

Covers the mapper, the identifiers, the wire format, the two client methods, and
the async service — including the hard guarantees:

  * mapping is faithful and fabricates nothing,
  * deviceId is generated once and persisted; sessionId is per-launch,
  * submission never raises and never fails the local flow,
  * missing/disabled config is skipped (not failed),
  * the API key never appears in any result, error, or log.

Runs under pytest or standalone:

    python tests/test_production_stage3.py   (from backend/)

Deterministic and offline — the transport is injected and the identity store is
faked, so there is no network access and no real SQLite database is touched.
"""

from __future__ import annotations

import asyncio
import logging
import os
import sys

# Make `app` importable when run directly.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.optimization.schemas import (
    AppInfo,
    BenchmarkResult,
    OptimizationRun,
    OptimizationWinner,
    ResourceObservation,
)
from app.optimization.schemas import ModelInfo
from app.production import identity
from app.production.client import ProductionApiClient, _RawResponse
from app.production.mapper import ProductionRequestMapper
from app.production.schemas import (
    ProductionBenchmarkRequest,
    ProductionTelemetryRequest,
)
from app.production.service import ProductionSubmissionService
from app.schemas import GpuInfo, HardwareInfo
from app.telemetry.schemas import TelemetryEvent


# --- fixtures / builders ---------------------------------------------------

def _full_run() -> OptimizationRun:
    """A fully-populated run with a winner whose measured result carries metrics."""
    run = OptimizationRun(run_id="run-abc")
    run.app = AppInfo(version="1.2.3")
    run.hardware = HardwareInfo(
        os_name="Windows",
        os_version="11",
        cpu_name="AMD Ryzen 9 7950X",
        cpu_cores_physical=16,
        cpu_cores_logical=32,
        memory_total_gb=64.0,
        memory_available_gb=40.0,
        gpus=[GpuInfo(name="NVIDIA RTX 4090", vendor="NVIDIA", vram_gb=24.0)],
    )
    run.model = ModelInfo(name="llama3.2:3b", quantization="Q4_K_M")
    run.winner = OptimizationWinner(candidate_id="cand-1", label="GPU offload (32 layers)")
    run.candidate_results = [
        BenchmarkResult(
            benchmark_id="bm-1",
            candidate_id="cand-1",
            tokens_per_sec=87.5,
            time_to_first_token_ms=142.0,
            resource_observation=ResourceObservation(gpu_vram_used_mb=9123.0),
        )
    ]
    return run


def _event() -> TelemetryEvent:
    return TelemetryEvent(
        event_id="evt-1",
        event_name="first_optimization_complete",
        app_version="1.2.3",
        created_at="2026-07-28T00:00:00+00:00",
        anonymous_id="anon-xyz",
        properties={"had_winner": True, "improvement_percent": 21.4},
    )


def _client(transport, *, api_key="test-key"):
    return ProductionApiClient(
        base_url="https://example.test",
        api_key=api_key,
        retry_delay=0,
        transport=transport,
    )


def _service(transport, *, api_key="test-key", enabled=True):
    return ProductionSubmissionService(
        client=_client(transport, api_key=api_key),
        enabled=enabled,
        device_id_provider=lambda: "device-fixed",
        session_id_provider=lambda: "session-fixed",
        os_provider=lambda: "Windows 11",
    )


_cases = []


def case(fn):
    """Register a test function (name avoids pytest collecting the registrar)."""
    _cases.append(fn)
    return fn


# --- mapping ---------------------------------------------------------------

@case
def test_benchmark_mapping_is_faithful():
    req = ProductionRequestMapper().benchmark(_full_run(), device_id="device-1")
    assert req.device_id == "device-1"
    assert req.app_version == "1.2.3"
    assert req.os == "Windows 11"
    assert req.cpu == "AMD Ryzen 9 7950X"
    assert req.gpu == "NVIDIA RTX 4090"
    assert req.ram_gb == 64.0
    assert req.model_name == "llama3.2:3b"
    assert req.model_quant == "Q4_K_M"
    assert req.optimization_profile == "GPU offload (32 layers)"
    assert req.tokens_per_sec == 87.5
    assert req.first_token_latency_ms == 142.0
    assert req.vram_used_mb == 9123.0
    assert req.run_id == "run-abc"


@case
def test_benchmark_mapping_fabricates_nothing_when_sparse():
    # A bare run: no hardware, model, or winner. Required ids present; rest None.
    run = OptimizationRun(run_id="run-empty")
    req = ProductionRequestMapper().benchmark(run, device_id="device-1")
    assert req.device_id == "device-1"
    assert req.run_id == "run-empty"
    for field in ("os", "cpu", "gpu", "ram_gb", "model_name", "model_quant",
                  "optimization_profile", "tokens_per_sec",
                  "first_token_latency_ms", "vram_used_mb"):
        assert getattr(req, field) is None, f"{field} should be None"


@case
def test_benchmark_run_id_override():
    req = ProductionRequestMapper().benchmark(
        _full_run(), device_id="device-1", run_id="explicit-run"
    )
    assert req.run_id == "explicit-run"


@case
def test_telemetry_mapping_is_faithful():
    req = ProductionRequestMapper().telemetry(
        _event(), device_id="device-1", session_id="sess-1", os="Windows 11"
    )
    assert req.device_id == "device-1"
    assert req.app_version == "1.2.3"
    assert req.os == "Windows 11"
    assert req.session_id == "sess-1"
    assert req.event == "first_optimization_complete"
    assert req.props == {"had_winner": True, "improvement_percent": 21.4}
    assert req.error_message is None


# --- wire format (exact approved camelCase keys) ---------------------------

@case
def test_benchmark_wire_shape_uses_exact_camel_case_keys():
    wire = ProductionRequestMapper().benchmark(_full_run(), device_id="d").model_dump(
        by_alias=True
    )
    assert set(wire.keys()) == {
        "deviceId", "appVersion", "os", "cpu", "gpu", "ramGB", "modelName",
        "modelQuant", "optimizationProfile", "tokensPerSec",
        "firstTokenLatencyMs", "vramUsedMB", "runId",
    }


@case
def test_telemetry_wire_shape_uses_exact_camel_case_keys():
    wire = ProductionRequestMapper().telemetry(
        _event(), device_id="d", session_id="s", os="Windows 11"
    ).model_dump(by_alias=True)
    assert set(wire.keys()) == {
        "deviceId", "appVersion", "os", "sessionId", "event", "props", "errorMessage",
    }


# --- identity --------------------------------------------------------------

@case
def test_device_id_generated_once_and_persisted():
    store = {}
    ids = iter(["generated-1", "generated-2"])
    kw = dict(
        store_get=store.get,
        store_set=lambda k, v: store.__setitem__(k, v),
        id_factory=lambda: next(ids),
    )
    first = identity.get_or_create_device_id(**kw)
    second = identity.get_or_create_device_id(**kw)
    assert first == "generated-1"
    assert second == "generated-1"  # persisted, not regenerated
    assert store[identity.DEVICE_ID_KEY] == "generated-1"


@case
def test_session_id_is_stable_per_launch_and_resets():
    ids = iter(["sess-a", "sess-b"])
    session = identity.SessionId(id_factory=lambda: next(ids))
    assert session.get() == "sess-a"
    assert session.get() == "sess-a"  # same within a "launch"
    session.reset()
    assert session.get() == "sess-b"  # new launch → new id


@case
def test_new_run_id_is_fresh_each_call():
    ids = iter(["r1", "r2"])
    factory = lambda: next(ids)
    assert identity.new_run_id(id_factory=factory) == "r1"
    assert identity.new_run_id(id_factory=factory) == "r2"


# --- client methods --------------------------------------------------------

@case
def test_client_submit_benchmark_posts_authed_json():
    seen = {}

    async def transport(method, url, headers, json, timeout):
        seen.update(method=method, url=url, headers=dict(headers), json=json)
        return _RawResponse(status_code=200, body={"status": "ok"})

    payload = ProductionRequestMapper().benchmark(_full_run(), device_id="d")
    result = asyncio.run(_client(transport).submit_benchmark(payload))
    assert result.ok is True
    assert seen["method"] == "POST"
    assert seen["url"].endswith("/benchmark")
    assert seen["headers"].get("x-api-key") == "test-key"
    assert seen["json"]["deviceId"] == "d"  # camelCase on the wire


@case
def test_client_submit_telemetry_posts_authed_json():
    seen = {}

    async def transport(method, url, headers, json, timeout):
        seen.update(url=url, headers=dict(headers), json=json)
        return _RawResponse(status_code=200, body={"status": "ok"})

    payload = ProductionRequestMapper().telemetry(
        _event(), device_id="d", session_id="s", os="Windows 11"
    )
    result = asyncio.run(_client(transport).submit_telemetry(payload))
    assert result.ok is True
    assert seen["url"].endswith("/telemetry")
    assert seen["headers"].get("x-api-key") == "test-key"
    assert seen["json"]["sessionId"] == "s"


# --- service: success / never-fatal ---------------------------------------

@case
def test_service_benchmark_success():
    async def transport(method, url, headers, json, timeout):
        return _RawResponse(status_code=200, body={"status": "ok"})

    result = asyncio.run(_service(transport).submit_benchmark(_full_run()))
    assert result.status == "sent"
    assert result.ok is True
    assert result.endpoint == "/benchmark"


@case
def test_service_benchmark_failure_never_raises():
    async def transport(method, url, headers, json, timeout):
        raise ConnectionError("no route to host")

    # Must return a result, never raise — local optimization is never failed.
    result = asyncio.run(_service(transport).submit_benchmark(_full_run()))
    assert result.status == "failed"
    assert result.ok is False


@case
def test_service_telemetry_failure_never_raises():
    async def transport(method, url, headers, json, timeout):
        raise TimeoutError("slow")

    result = asyncio.run(_service(transport).submit_telemetry(_event()))
    assert result.status == "failed"
    assert result.ok is False


@case
def test_service_skips_when_no_api_key_without_network():
    calls = {"n": 0}

    async def transport(method, url, headers, json, timeout):
        calls["n"] += 1
        return _RawResponse(status_code=200, body={"status": "ok"})

    result = asyncio.run(_service(transport, api_key=None).submit_benchmark(_full_run()))
    assert result.status == "skipped"          # cloud disabled, non-fatal
    assert calls["n"] == 0                       # never touched the network


@case
def test_service_disabled_by_policy():
    async def transport(method, url, headers, json, timeout):
        return _RawResponse(status_code=200, body={"status": "ok"})

    result = asyncio.run(_service(transport, enabled=False).submit_benchmark(_full_run()))
    assert result.status == "disabled"


# --- service: fire-and-forget is non-blocking and swallows errors ----------

@case
def test_background_submission_is_non_blocking_and_swallows_errors():
    calls = {"n": 0}

    async def transport(method, url, headers, json, timeout):
        calls["n"] += 1
        raise ConnectionError("boom")  # would fail — must be swallowed

    async def scenario():
        service = _service(transport)
        # Returns immediately (schedules a task); does not raise.
        service.submit_benchmark_background(_full_run())
        # Yield control so the background task runs to completion.
        await asyncio.sleep(0)
        await asyncio.sleep(0)

    asyncio.run(scenario())  # no exception propagates out of the loop
    assert calls["n"] >= 1  # the background task actually ran


# --- security: the API key never leaks ------------------------------------

@case
def test_api_key_never_appears_in_result_or_error():
    secret = "super-secret-key-777"

    async def transport(method, url, headers, json, timeout):
        assert headers.get("x-api-key") == secret  # key is used in the header...
        return _RawResponse(status_code=401, body={"error": "unauthorized"})

    result = asyncio.run(
        _service(transport, api_key=secret).submit_benchmark(_full_run())
    )
    assert result.status == "failed"
    # ...but never surfaces in the outward result/error.
    assert secret not in (result.error or "")
    assert "x-api-key" not in (result.error or "").lower()


@case
def test_api_key_never_appears_in_service_logs():
    secret = "super-secret-key-888"

    async def transport(method, url, headers, json, timeout):
        raise ConnectionError(secret)  # even if a lib leaked it into an exception...

    import io

    buffer = io.StringIO()
    handler = logging.StreamHandler(buffer)
    svc_log = logging.getLogger("app.production.service")
    svc_log.addHandler(handler)
    svc_log.setLevel(logging.DEBUG)
    try:
        result = asyncio.run(
            _service(transport, api_key=secret).submit_benchmark(_full_run())
        )
    finally:
        svc_log.removeHandler(handler)

    assert result.status == "failed"
    assert secret not in buffer.getvalue()          # ...it is not logged
    assert secret not in (result.error or "")


def _run_all() -> None:
    for fn in _cases:
        fn()
        print(f"  ok  {fn.__name__}")
    print(f"\n{len(_cases)} passed")


if __name__ == "__main__":
    _run_all()
