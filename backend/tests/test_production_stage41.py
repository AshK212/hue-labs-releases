"""Tests for Stage 4.1 hardening.

Issue 1 — modelQuant resolution (resolved vs unresolved → required-gate skip).
Issue 2 — app_open no longer emitted at startup; driven by an explicit hook that
          gates on the persisted telemetry setting and emits at most once.

Runs under pytest or standalone:

    python tests/test_production_stage41.py   (from backend/)

Deterministic and offline: the transport is injected and the resolver monkeypatched.
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
from app.production.integration import REQUIRED_BENCHMARK_METRICS, ProductionIntegration
from app.production.service import ProductionSubmissionService
from app.schemas import BenchmarkResult, GpuInfo, HardwareInfo
from app.services import ollama_client


# --- builders --------------------------------------------------------------

def _result(*, quant="Q4_K_M") -> BenchmarkResult:
    return BenchmarkResult(
        model="llama3.2:3b",
        profile="optimized",
        tokens_per_sec=50.0,
        output_tokens=100,
        total_seconds=2.0,
        prompt="p",
        options={},
        created_at="2026-07-28T00:00:00+00:00",
        first_token_latency_ms=120.0,
        vram_used_mb=4096.0,
        model_quant=quant,
    )


def _hardware() -> HardwareInfo:
    return HardwareInfo(
        os_name="Windows", os_version="11", cpu_name="CPU",
        cpu_cores_physical=8, cpu_cores_logical=16,
        memory_total_gb=32.0, memory_available_gb=20.0,
        gpus=[GpuInfo(name="GPU", vendor="NVIDIA", vram_gb=24.0)],
    )


class _RecordingService:
    def __init__(self) -> None:
        self.benchmark: list = []
        self.telemetry: list = []

    def submit_benchmark_request_background(self, req) -> None:
        self.benchmark.append(req)

    def submit_telemetry_request_background(self, req) -> None:
        self.telemetry.append(req)

    async def flush(self, timeout: float = 3.0) -> None:  # pragma: no cover
        return None


def _integration(service, *, telemetry=True, benchmark=True):
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
        run_id_factory=lambda: "run-1",
    )


_cases = []


def case(fn):
    _cases.append(fn)
    return fn


# --- Issue 1: quantization resolution -------------------------------------

@case
def test_quant_resolved_from_api_show():
    seen = {}

    class _Resp:
        def raise_for_status(self):
            return None

        def json(self):
            return {"details": {"quantization_level": "Q5_K_M"}}

    class _Client:
        def __init__(self, *a, **k):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def post(self, url, json):
            seen["url"] = url
            seen["json"] = json
            return _Resp()

    orig = ollama_client.httpx.AsyncClient
    ollama_client.httpx.AsyncClient = _Client
    try:
        q = asyncio.run(ollama_client.model_quantization("llama3.2:3b"))
    finally:
        ollama_client.httpx.AsyncClient = orig
    assert q == "Q5_K_M"
    assert seen["url"].endswith("/api/show")


@case
def test_quant_falls_back_to_tag_when_show_unavailable():
    async def failing_client(*a, **k):
        raise ConnectionError("no ollama")

    class _Boom:
        def __init__(self, *a, **k):
            raise ConnectionError("no ollama")

    orig = ollama_client.httpx.AsyncClient
    ollama_client.httpx.AsyncClient = _Boom
    try:
        # Explicit quant token in the identifier → parsed as a reliable fallback.
        assert asyncio.run(ollama_client.model_quantization("llama3.1:8b-instruct-q4_K_M")) == "Q4_K_M"
        assert asyncio.run(ollama_client.model_quantization("mymodel:Q8_0")) == "Q8_0"
        # A plain tag with no quant token → unresolved (None), never guessed.
        assert asyncio.run(ollama_client.model_quantization("llama3.2:3b")) is None
        # A name that merely starts with 'q' must not false-match.
        assert asyncio.run(ollama_client.model_quantization("qwen2:0.5b")) is None
    finally:
        ollama_client.httpx.AsyncClient = orig


@case
def test_model_quant_is_in_required_gate():
    assert "model_quant" in REQUIRED_BENCHMARK_METRICS


@case
def test_resolved_quant_allows_submission():
    svc = _RecordingService()
    _integration(svc).on_optimize_complete(
        model="llama3.2:3b", profile="optimized", hardware=_hardware(), result=_result(quant="Q4_K_M")
    )
    assert len(svc.benchmark) == 1
    assert svc.benchmark[0].model_quant == "Q4_K_M"


@case
def test_unresolved_quant_skips_submission_without_null():
    svc = _RecordingService()
    _integration(svc).on_optimize_complete(
        model="llama3.2:3b", profile="optimized", hardware=_hardware(), result=_result(quant=None)
    )
    assert svc.benchmark == []  # skipped — never submitted with a null modelQuant


@case
def test_unresolved_quant_skip_logs_field_name_only():
    buffer = io.StringIO()
    handler = logging.StreamHandler(buffer)
    prod_log = logging.getLogger("local_ai_optimizer.production")
    prod_log.addHandler(handler)
    prod_log.setLevel(logging.INFO)
    try:
        _integration(_RecordingService()).on_optimize_complete(
            model="secret-model", profile="p", hardware=_hardware(), result=_result(quant=None)
        )
    finally:
        prod_log.removeHandler(handler)
    logged = buffer.getvalue()
    assert "model_quant" in logged        # field name is fine
    assert "secret-model" not in logged   # no values leak


# --- Issue 2: app_open lifecycle ------------------------------------------

@case
def test_disabled_preference_produces_no_app_open():
    svc = _RecordingService()
    integ = _integration(svc, telemetry=False)
    integ.on_app_open()
    assert svc.telemetry == []  # nothing emitted


@case
def test_disabled_app_open_makes_no_network_call():
    calls: list = []

    async def transport(method, url, headers, json, timeout):
        calls.append(url)
        return _RawResponse(status_code=200, body={"status": "ok"})

    client = ProductionApiClient(
        base_url="https://x.test", api_key="k", retry_delay=0, transport=transport
    )
    integ = ProductionIntegration(
        service=ProductionSubmissionService(client=client),
        settings_provider=lambda: PrivacySettings(telemetry_enabled=False),
        app_version="1.0.0",
        device_id_provider=lambda: "d",
        session_id_provider=lambda: "s",
        os_provider=lambda: "Windows 11",
    )

    async def scenario():
        integ.on_app_open()
        await integ.flush()

    asyncio.run(scenario())
    assert calls == []  # no app_open network call while telemetry disabled


@case
def test_enabled_preference_emits_exactly_once():
    svc = _RecordingService()
    integ = _integration(svc, telemetry=True)
    integ.on_app_open()
    integ.on_app_open()
    integ.on_app_open()
    opens = [r for r in svc.telemetry if r.event == events.APP_OPEN]
    assert len(opens) == 1


@case
def test_app_open_emits_after_later_enable_still_once():
    # Telemetry starts disabled; the once-guard is NOT consumed while disabled,
    # so enabling later still yields exactly one app_open.
    state = {"on": False}
    svc = _RecordingService()
    integ = ProductionIntegration(
        service=svc,
        settings_provider=lambda: PrivacySettings(telemetry_enabled=state["on"]),
        app_version="1.0.0",
        device_id_provider=lambda: "d",
        session_id_provider=lambda: "s",
        os_provider=lambda: "Windows 11",
    )
    integ.on_app_open()                     # disabled → nothing
    assert svc.telemetry == []
    state["on"] = True
    integ.on_app_open()                     # now enabled → one
    integ.on_app_open()                     # deduped
    opens = [r for r in svc.telemetry if r.event == events.APP_OPEN]
    assert len(opens) == 1


@case
def test_app_open_endpoint_carries_no_sensitive_data_and_gates():
    # The endpoint hook is just production.on_app_open(); verify the emitted
    # request has empty props and no key/secret in its serialized form.
    svc = _RecordingService()
    _integration(svc, telemetry=True).on_app_open()
    req = svc.telemetry[0]
    assert req.event == events.APP_OPEN
    assert req.props == {}
    blob = req.model_dump_json()
    for needle in ("api_key", "x-api-key", "HUE_LABS", "prompt"):
        assert needle not in blob


def _run_all() -> None:
    for fn in _cases:
        fn()
        print(f"  ok  {fn.__name__}")
    print(f"\n{len(_cases)} passed")


if __name__ == "__main__":
    _run_all()
