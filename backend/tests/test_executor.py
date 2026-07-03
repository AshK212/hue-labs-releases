"""Tests for the Benchmark Executor (Milestone 2).

Runs under pytest or standalone:

    python tests/test_executor.py   (from backend/)

Deterministic — an injected stub adapter supplies fixed numbers and a fake
HardwareInfo is passed in, so there is no Ollama call and no real hardware
detection, and the executor never fabricates a metric.
"""

from __future__ import annotations

import asyncio
import os
import sys

# Make `app` importable when run directly.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.optimization.executor import (
    BenchmarkExecutor,
    _default_is_infrastructure_error,
)
from app.optimization.schemas import CandidateConfig, ModelInfo
from app.schemas import BenchmarkResult as LegacyBenchmarkResult
from app.schemas import GpuInfo, HardwareInfo
from app.services.ollama_client import OllamaError

_MODEL = ModelInfo(name="llama3.2:3b")
_HW = HardwareInfo(
    os_name="Windows 11", os_version="x", cpu_name="CPU",
    cpu_cores_physical=8, cpu_cores_logical=16,
    memory_total_gb=32.0, memory_available_gb=16.0,
    gpus=[GpuInfo(name="Test GPU", vendor="NVIDIA", vram_gb=12.0)],
)


def _candidate(candidate_id: str) -> CandidateConfig:
    return CandidateConfig(candidate_id=candidate_id, label=candidate_id, model=_MODEL)


def _legacy(model: str, tps: float = 25.0) -> LegacyBenchmarkResult:
    return LegacyBenchmarkResult(
        model=model, profile="optimized", tokens_per_sec=tps, output_tokens=128,
        total_seconds=5.0, prompt="p", options={"num_gpu": 999},
        created_at="2026-07-04T00:00:00Z",
    )


async def _ok_runner(candidate: CandidateConfig, hardware) -> LegacyBenchmarkResult:
    return _legacy(candidate.model.name)


def test_execute_candidate_success() -> None:
    executor = BenchmarkExecutor(benchmark_runner=_ok_runner)
    result = asyncio.run(executor.execute_candidate(_candidate("balanced"), hardware=_HW))
    assert result.status == "success"
    assert result.candidate_id == "balanced"
    assert result.tokens_per_sec == 25.0
    assert result.total_tokens == 128
    assert result.valid_output is True
    assert result.detected_vram_spill is False
    assert result.spill_signals == []


def test_benchmark_failure_returns_failed_result() -> None:
    async def bad_runner(candidate, hardware):
        raise RuntimeError("bad option for this candidate")

    executor = BenchmarkExecutor(benchmark_runner=bad_runner)
    result = asyncio.run(executor.execute_candidate(_candidate("perf"), hardware=_HW))
    assert result.status == "failed"
    assert result.valid_output is False
    assert result.tokens_per_sec is None
    assert "bad option" in (result.error_message or "")


def test_execute_all_sequential_order() -> None:
    order: list[str] = []

    async def recording_runner(candidate, hardware):
        order.append(candidate.candidate_id)
        return _legacy(candidate.model.name)

    executor = BenchmarkExecutor(benchmark_runner=recording_runner)
    candidates = [_candidate("baseline"), _candidate("balanced"), _candidate("performance")]
    results = asyncio.run(executor.execute_all(candidates, hardware=_HW, run_id="run-1"))

    assert [r.candidate_id for r in results] == ["baseline", "balanced", "performance"]
    assert order == ["baseline", "balanced", "performance"]
    assert all(r.status == "success" for r in results)


def test_cancellation_stops_sequence() -> None:
    executor = BenchmarkExecutor()

    async def cancel_after_first(candidate, hardware):
        executor.cancel()
        return _legacy(candidate.model.name)

    executor._runner = cancel_after_first
    candidates = [_candidate("baseline"), _candidate("balanced"), _candidate("performance")]
    results = asyncio.run(executor.execute_all(candidates, hardware=_HW, run_id="run-2"))

    assert len(results) == 1
    assert executor.session is not None
    assert executor.session.cancelled is True
    assert executor.session.completed == 1


def test_candidate_failure_continues() -> None:
    calls: list[str] = []

    async def fail_on_second(candidate, hardware):
        calls.append(candidate.candidate_id)
        if candidate.candidate_id == "balanced":
            raise RuntimeError("candidate-specific boom")  # not infrastructure
        return _legacy(candidate.model.name)

    executor = BenchmarkExecutor(benchmark_runner=fail_on_second)
    candidates = [_candidate("baseline"), _candidate("balanced"), _candidate("performance")]
    results = asyncio.run(executor.execute_all(candidates, hardware=_HW))

    # The failure is recorded but the session CONTINUES to the last candidate.
    assert [r.status for r in results] == ["success", "failed", "success"]
    assert calls == ["baseline", "balanced", "performance"]  # all three ran
    assert executor.session.aborted is False


def test_infrastructure_failure_stops_session() -> None:
    calls: list[str] = []

    async def infra_on_first(candidate, hardware):
        calls.append(candidate.candidate_id)
        # Message the M1 Ollama client raises when Ollama isn't reachable.
        raise OllamaError(
            "Couldn't connect to Ollama. Make sure the Ollama app is running, then try again."
        )

    executor = BenchmarkExecutor(benchmark_runner=infra_on_first)
    candidates = [_candidate("baseline"), _candidate("balanced"), _candidate("performance")]
    results = asyncio.run(executor.execute_all(candidates, hardware=_HW))

    # Infrastructure failure: record the current candidate, then STOP.
    assert len(results) == 1
    assert results[0].status == "failed"
    assert calls == ["baseline"]  # remaining candidates never ran
    assert executor.session.aborted is True


def test_infrastructure_classifier() -> None:
    assert _default_is_infrastructure_error(
        OllamaError("Couldn't connect to Ollama. Make sure the Ollama app is running...")
    ) is True
    assert _default_is_infrastructure_error(Exception("Ollama rejected the request (HTTP 503): x")) is True
    assert _default_is_infrastructure_error(RuntimeError("model not found")) is True
    # Candidate-specific / ambiguous → not infrastructure.
    assert _default_is_infrastructure_error(RuntimeError("bad option value")) is False
    assert _default_is_infrastructure_error(OllamaError("Ollama took too long to respond.")) is False


def test_hardware_detected_once() -> None:
    from app.services import hardware as hardware_service

    calls = {"n": 0}
    original = hardware_service.detect_hardware

    def counting_detect() -> HardwareInfo:
        calls["n"] += 1
        return _HW

    hardware_service.detect_hardware = counting_detect  # type: ignore[assignment]
    try:
        executor = BenchmarkExecutor(benchmark_runner=_ok_runner)
        candidates = [_candidate("baseline"), _candidate("balanced"), _candidate("performance")]
        # hardware=None → detection happens once, reused for all candidates.
        results = asyncio.run(executor.execute_all(candidates, run_id="run-hw"))
    finally:
        hardware_service.detect_hardware = original  # type: ignore[assignment]

    assert calls["n"] == 1  # detected exactly once, never per-candidate
    assert len(results) == 3
    assert all(r.status == "success" for r in results)


def test_session_progress_updates() -> None:
    executor = BenchmarkExecutor()
    progress: list[tuple[int, str | None]] = []

    async def progress_runner(candidate, hardware):
        progress.append((executor.session.completed, executor.session.current_candidate))
        return _legacy(candidate.model.name)

    executor._runner = progress_runner
    candidates = [_candidate("baseline"), _candidate("balanced"), _candidate("performance")]
    asyncio.run(executor.execute_all(candidates, hardware=_HW, run_id="run-3"))

    assert progress == [(0, "baseline"), (1, "balanced"), (2, "performance")]
    session = executor.session
    assert session.run_id == "run-3"
    assert session.total_candidates == 3
    assert session.completed == 3
    assert session.cancelled is False
    assert session.aborted is False
    assert session.current_candidate is None
    assert session.started_at is not None and session.finished_at is not None


def _run_all() -> None:
    tests = [
        test_execute_candidate_success,
        test_benchmark_failure_returns_failed_result,
        test_execute_all_sequential_order,
        test_cancellation_stops_sequence,
        test_candidate_failure_continues,
        test_infrastructure_failure_stops_session,
        test_infrastructure_classifier,
        test_hardware_detected_once,
        test_session_progress_updates,
    ]
    for test in tests:
        test()
        print(f"  ok  {test.__name__}")
    print(f"\n{len(tests)} passed")


if __name__ == "__main__":
    _run_all()
