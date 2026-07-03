"""Tests for MeasuredOptimizationEngine.create_run candidate wiring (Milestone 2).

Runs either under pytest or standalone:

    python tests/test_engine_create_run.py   (from backend/)

Verifies the assembly contract: create_run generates a baseline candidate plus
tuned candidates (≤ 4 total), marks tuned results as skipped with no fabricated
metrics, and keeps the run JSON-serializable.
"""

from __future__ import annotations

import json
import os
import sys

# Make `app` importable when run directly (sys.path[0] would be tests/, not backend/).
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.optimization.engine import MeasuredOptimizationEngine
from app.schemas import BenchmarkResult as LegacyBenchmarkResult
from app.schemas import GpuInfo, HardwareInfo


def _hardware(vram_gb: float | None = 12.0) -> HardwareInfo:
    gpus = [GpuInfo(name="Test GPU", vendor="NVIDIA", vram_gb=vram_gb)]
    return HardwareInfo(
        os_name="Windows 11",
        os_version="x",
        cpu_name="Test CPU",
        cpu_cores_physical=8,
        cpu_cores_logical=16,
        memory_total_gb=32.0,
        memory_available_gb=16.0,
        gpus=gpus,
    )


def test_create_run_includes_baseline_candidate() -> None:
    run = MeasuredOptimizationEngine().create_run(
        model="llama3.2:3b", hardware=_hardware()
    )
    assert run.baseline_config is not None
    assert run.baseline_config.candidate_id == "baseline"
    assert run.baseline_config.label == "Baseline"


def test_create_run_produces_at_most_four_candidates() -> None:
    # 12 GB bucket → the widest set (baseline + 3 tuned).
    run = MeasuredOptimizationEngine().create_run(
        model="llama3.2:3b", hardware=_hardware(vram_gb=12.0)
    )
    total = 1 + len(run.candidate_configs)  # baseline_config + tuned
    assert total <= 4
    assert 1 <= len(run.candidate_configs) <= 3


def test_generated_candidate_results_are_skipped() -> None:
    run = MeasuredOptimizationEngine().create_run(
        model="llama3.2:3b", hardware=_hardware()
    )
    assert len(run.candidate_results) == len(run.candidate_configs)
    for result in run.candidate_results:
        assert result.status == "skipped"
        assert result.valid_output is False
        # No fabricated metrics on a skipped candidate.
        assert result.tokens_per_sec is None
        assert result.total_tokens is None
        assert result.confidence is None


def test_optimization_run_remains_json_serializable() -> None:
    run = MeasuredOptimizationEngine().create_run(
        model="llama3.2:3b", hardware=_hardware()
    )
    decoded = json.loads(run.model_dump_json())
    assert decoded["run_id"] == run.run_id
    assert decoded["baseline_config"]["label"] == "Baseline"
    assert isinstance(decoded["candidate_configs"], list)


def test_baseline_result_uses_real_data_when_provided() -> None:
    legacy = LegacyBenchmarkResult(
        model="llama3.2:3b",
        profile="baseline",
        tokens_per_sec=22.5,
        output_tokens=128,
        total_seconds=5.7,
        prompt="x",
        options={"num_thread": 8},
        created_at="2026-07-04T00:00:00Z",
    )
    run = MeasuredOptimizationEngine().create_run(
        model="llama3.2:3b", hardware=_hardware(), baseline_result=legacy
    )
    assert run.baseline_result is not None
    assert run.baseline_result.status == "success"
    assert run.baseline_result.tokens_per_sec == 22.5
    assert run.baseline_result.valid_output is True


def test_baseline_result_is_safe_placeholder_without_data() -> None:
    run = MeasuredOptimizationEngine().create_run(
        model="llama3.2:3b", hardware=_hardware()
    )
    assert run.baseline_result is not None
    assert run.baseline_result.status == "pending"
    assert run.baseline_result.valid_output is False
    assert run.baseline_result.tokens_per_sec is None


def _run_all() -> None:
    tests = [
        test_create_run_includes_baseline_candidate,
        test_create_run_produces_at_most_four_candidates,
        test_generated_candidate_results_are_skipped,
        test_optimization_run_remains_json_serializable,
        test_baseline_result_uses_real_data_when_provided,
        test_baseline_result_is_safe_placeholder_without_data,
    ]
    for test in tests:
        test()
        print(f"  ok  {test.__name__}")
    print(f"\n{len(tests)} passed")


if __name__ == "__main__":
    _run_all()
