"""Tests for the Benchmark Executor scaffold (Milestone 2).

Runs under pytest or standalone:

    python tests/test_executor.py   (from backend/)

Deterministic — an injected stub adapter supplies fixed numbers, so there is no
Ollama call and the executor never fabricates a metric.
"""

from __future__ import annotations

import asyncio
import os
import sys

# Make `app` importable when run directly.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.optimization.executor import BenchmarkExecutor
from app.optimization.schemas import CandidateConfig, ModelInfo
from app.schemas import BenchmarkResult as LegacyBenchmarkResult

_MODEL = ModelInfo(name="llama3.2:3b")


def _candidate(candidate_id: str) -> CandidateConfig:
    return CandidateConfig(candidate_id=candidate_id, label=candidate_id, model=_MODEL)


def _legacy(model: str, tps: float = 25.0) -> LegacyBenchmarkResult:
    return LegacyBenchmarkResult(
        model=model,
        profile="optimized",
        tokens_per_sec=tps,
        output_tokens=128,
        total_seconds=5.0,
        prompt="p",
        options={"num_gpu": 999},
        created_at="2026-07-04T00:00:00Z",
    )


async def _ok_runner(candidate: CandidateConfig, hardware) -> LegacyBenchmarkResult:
    return _legacy(candidate.model.name)


def test_execute_candidate_success() -> None:
    executor = BenchmarkExecutor(benchmark_runner=_ok_runner)
    result = asyncio.run(executor.execute_candidate(_candidate("balanced")))
    assert result.status == "success"
    assert result.candidate_id == "balanced"
    assert result.tokens_per_sec == 25.0
    assert result.total_tokens == 128
    assert result.valid_output is True
    # Spill fields populated (no spill on a clean run).
    assert result.detected_vram_spill is False
    assert result.spill_signals == []


def test_benchmark_failure_returns_failed_result() -> None:
    async def bad_runner(candidate, hardware):
        raise RuntimeError("ollama unreachable")

    executor = BenchmarkExecutor(benchmark_runner=bad_runner)
    result = asyncio.run(executor.execute_candidate(_candidate("perf")))
    assert result.status == "failed"
    assert result.valid_output is False
    assert result.tokens_per_sec is None
    assert "ollama unreachable" in (result.error_message or "")


def test_execute_all_sequential_order() -> None:
    order: list[str] = []

    async def recording_runner(candidate, hardware):
        order.append(candidate.candidate_id)
        return _legacy(candidate.model.name)

    executor = BenchmarkExecutor(benchmark_runner=recording_runner)
    candidates = [_candidate("baseline"), _candidate("balanced"), _candidate("performance")]
    results = asyncio.run(executor.execute_all(candidates, run_id="run-1"))

    assert [r.candidate_id for r in results] == ["baseline", "balanced", "performance"]
    assert order == ["baseline", "balanced", "performance"]  # sequential, in order
    assert all(r.status == "success" for r in results)


def test_cancellation_stops_sequence() -> None:
    executor = BenchmarkExecutor()

    async def cancel_after_first(candidate, hardware):
        executor.cancel()  # request cancel during the first candidate
        return _legacy(candidate.model.name)

    executor._runner = cancel_after_first  # inject after construction
    candidates = [_candidate("baseline"), _candidate("balanced"), _candidate("performance")]
    results = asyncio.run(executor.execute_all(candidates, run_id="run-2"))

    assert len(results) == 1  # stopped before the second candidate
    assert executor.session is not None
    assert executor.session.cancelled is True
    assert executor.session.completed == 1


def test_fatal_failure_stops_sequence() -> None:
    calls: list[str] = []

    async def fail_on_second(candidate, hardware):
        calls.append(candidate.candidate_id)
        if candidate.candidate_id == "balanced":
            raise RuntimeError("boom")
        return _legacy(candidate.model.name)

    executor = BenchmarkExecutor(benchmark_runner=fail_on_second)
    candidates = [_candidate("baseline"), _candidate("balanced"), _candidate("performance")]
    results = asyncio.run(executor.execute_all(candidates))

    assert [r.status for r in results] == ["success", "failed"]  # stopped after failure
    assert calls == ["baseline", "balanced"]  # third never ran


def test_session_progress_updates() -> None:
    executor = BenchmarkExecutor()
    progress: list[tuple[int, str | None]] = []

    async def progress_runner(candidate, hardware):
        # Snapshot session state at the moment this candidate runs.
        progress.append((executor.session.completed, executor.session.current_candidate))
        return _legacy(candidate.model.name)

    executor._runner = progress_runner
    candidates = [_candidate("baseline"), _candidate("balanced"), _candidate("performance")]
    asyncio.run(executor.execute_all(candidates, run_id="run-3"))

    # completed increments after each candidate; current_candidate tracks the active one.
    assert progress == [(0, "baseline"), (1, "balanced"), (2, "performance")]
    session = executor.session
    assert session.run_id == "run-3"
    assert session.total_candidates == 3
    assert session.completed == 3
    assert session.cancelled is False
    assert session.current_candidate is None  # cleared at the end
    assert session.started_at is not None and session.finished_at is not None


def _run_all() -> None:
    tests = [
        test_execute_candidate_success,
        test_benchmark_failure_returns_failed_result,
        test_execute_all_sequential_order,
        test_cancellation_stops_sequence,
        test_fatal_failure_stops_sequence,
        test_session_progress_updates,
    ]
    for test in tests:
        test()
        print(f"  ok  {test.__name__}")
    print(f"\n{len(tests)} passed")


if __name__ == "__main__":
    _run_all()
