"""Tests for the orchestration layer: MeasuredOptimizationEngine.optimize (M2).

Runs under pytest or standalone:

    python tests/test_engine_optimize.py   (from backend/)

Deterministic — an injected BenchmarkExecutor with a stub runner supplies fixed
numbers, so there is no Ollama call and no fabricated benchmark data.
"""

from __future__ import annotations

import asyncio
import json
import os
import sys

# Make `app` importable when run directly.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.optimization.engine import MeasuredOptimizationEngine
from app.optimization.executor import BenchmarkExecutor
from app.schemas import BenchmarkResult as LegacyBenchmarkResult
from app.schemas import GpuInfo, HardwareInfo


def _hardware() -> HardwareInfo:
    # 12 GB bucket → baseline + 3 tuned candidates.
    return HardwareInfo(
        os_name="Windows 11", os_version="x", cpu_name="CPU",
        cpu_cores_physical=8, cpu_cores_logical=16,
        memory_total_gb=32.0, memory_available_gb=16.0,
        gpus=[GpuInfo(name="Test GPU", vendor="NVIDIA", vram_gb=12.0)],
    )


def _legacy(candidate, tps: float) -> LegacyBenchmarkResult:
    return LegacyBenchmarkResult(
        model=candidate.model.name, profile=candidate.candidate_id,
        tokens_per_sec=tps, output_tokens=128, total_seconds=5.0,
        prompt="p", options={}, created_at="2026-07-04T00:00:00Z",
    )


def _executor_with(runner) -> BenchmarkExecutor:
    return BenchmarkExecutor(benchmark_runner=runner)


def test_successful_flow_selects_winner() -> None:
    async def runner(candidate, hardware):
        # Baseline slow, every tuned candidate clearly faster (+50%).
        tps = 20.0 if candidate.candidate_id == "baseline" else 30.0
        return _legacy(candidate, tps)

    engine = MeasuredOptimizationEngine()
    run = asyncio.run(
        engine.optimize("llama3.2:3b", hardware=_hardware(), executor=_executor_with(runner))
    )

    assert run.baseline_result.status == "success"
    assert run.baseline_result.tokens_per_sec == 20.0
    assert all(r.status == "success" for r in run.candidate_results)
    # Winner selected (deterministic tie-break → alphabetical "balanced").
    assert run.winner is not None
    assert run.winner.candidate_id == "balanced"
    assert run.recommendation.recommended_candidate_id == "balanced"
    # Timing + placeholders populated.
    assert run.timing.started_at and run.timing.completed_at
    assert run.timing.duration_seconds is not None
    assert run.submission.state == "not_submitted"
    assert run.share_card.status == "none"
    assert run.qa_report.status == "pending"  # placeholder until QA


def test_recommendation_generated() -> None:
    async def runner(candidate, hardware):
        return _legacy(candidate, 20.0 if candidate.candidate_id == "baseline" else 30.0)

    engine = MeasuredOptimizationEngine()
    run = asyncio.run(
        engine.optimize("m", hardware=_hardware(), executor=_executor_with(runner))
    )
    assert run.recommendation is not None
    assert run.recommendation.summary  # non-empty
    assert any(note.startswith("Quantization:") for note in run.recommendation.notes)


def test_no_winner_reports_honestly() -> None:
    async def runner(candidate, hardware):
        # No candidate beats baseline by >= 5%.
        return _legacy(candidate, 20.0)

    engine = MeasuredOptimizationEngine()
    run = asyncio.run(
        engine.optimize("m", hardware=_hardware(), executor=_executor_with(runner))
    )
    assert run.winner is None
    assert run.recommendation.summary == "No measured improvement was found."
    assert run.recommendation.recommended_candidate_id is None


def test_benchmark_failure_does_not_crash() -> None:
    async def runner(candidate, hardware):
        # The first tuned candidate fails → sequence stops (fatal).
        if candidate.candidate_id == "balanced":
            raise RuntimeError("ollama died mid-run")
        return _legacy(candidate, 20.0 if candidate.candidate_id == "baseline" else 30.0)

    engine = MeasuredOptimizationEngine()
    run = asyncio.run(
        engine.optimize("m", hardware=_hardware(), executor=_executor_with(runner))
    )
    # A run is still returned; the failure is recorded, nothing crashes.
    statuses = [run.baseline_result.status] + [r.status for r in run.candidate_results]
    assert "failed" in statuses
    assert run.winner is None
    assert run.recommendation.summary == "No measured improvement was found."


def test_optimization_run_json_serializable() -> None:
    async def runner(candidate, hardware):
        return _legacy(candidate, 20.0 if candidate.candidate_id == "baseline" else 30.0)

    engine = MeasuredOptimizationEngine()
    run = asyncio.run(
        engine.optimize("m", hardware=_hardware(), executor=_executor_with(runner))
    )
    decoded = json.loads(run.model_dump_json())
    assert decoded["run_id"] == run.run_id
    assert decoded["winner"]["candidate_id"] == run.winner.candidate_id
    assert decoded["recommendation"]["summary"]
    assert decoded["submission"]["state"] == "not_submitted"


def _run_all() -> None:
    tests = [
        test_successful_flow_selects_winner,
        test_recommendation_generated,
        test_no_winner_reports_honestly,
        test_benchmark_failure_does_not_crash,
        test_optimization_run_json_serializable,
    ]
    for test in tests:
        test()
        print(f"  ok  {test.__name__}")
    print(f"\n{len(tests)} passed")


if __name__ == "__main__":
    _run_all()
