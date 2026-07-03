"""Tests for VRAM spill analysis (Milestone 2).

Runs under pytest or standalone:

    python tests/test_spill.py   (from backend/)

Deterministic — fixed inputs, no randomness, no benchmarking, no Ollama.
"""

from __future__ import annotations

import os
import sys

# Make `app` importable when run directly.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.optimization.schemas import (
    BenchmarkResult,
    CandidateConfig,
    ModelInfo,
    ResourceObservation,
    SafetyInfo,
)
from app.optimization.spill import (
    SIGNAL_ESTIMATED_VRAM_EXCEEDS_BUDGET,
    SIGNAL_GPU_MEMORY_PRESSURE,
    SIGNAL_OLLAMA_ALLOCATION_WARNING,
    SIGNAL_SYSTEM_RAM_GROWTH,
    SIGNAL_TOKENS_PER_SECOND_REGRESSION,
    analyze_spill,
    detect_vram_spill,
)


def test_no_spill() -> None:
    a = analyze_spill(
        estimated_vram_mb=4000,
        max_allowed_vram_mb=6000,
        tokens_per_second=30.0,
        baseline_tokens_per_second=28.0,
        gpu_memory_used_mb=3000,
        system_ram_growth_mb=100,
        allocation_warning=None,
    )
    assert a.detected is False
    assert a.signals == []
    assert a.confidence == "none"
    assert a.severity == "none"
    assert a.recommendation == "No spill detected; no action needed."


def test_budget_exceeded() -> None:
    a = analyze_spill(estimated_vram_mb=8000, max_allowed_vram_mb=6000)
    assert a.detected is True
    assert SIGNAL_ESTIMATED_VRAM_EXCEEDS_BUDGET in a.signals
    assert a.confidence == "low"        # single signal
    assert a.severity == "medium"       # ...but a hard signal escalates severity
    assert a.recommendation == "Reduce GPU layers or use a lighter quant."


def test_tps_regression_alone_is_advisory() -> None:
    # Soft signal only → surfaced + raises confidence, but NOT a confirmed spill.
    a = analyze_spill(tokens_per_second=10.0, baseline_tokens_per_second=20.0)
    assert a.detected is False                       # advisory, not confirmed
    assert a.signals == [SIGNAL_TOKENS_PER_SECOND_REGRESSION]
    assert a.confidence == "low"
    assert a.severity == "low"
    assert a.recommendation == "Reduce context size or batch size."


def test_ram_growth_alone_is_advisory() -> None:
    a = analyze_spill(system_ram_growth_mb=4096)
    assert a.detected is False                       # soft signal only
    assert a.signals == [SIGNAL_SYSTEM_RAM_GROWTH]
    assert a.recommendation == "Reduce context size."


def test_soft_signals_alone_never_confirm_spill() -> None:
    # Two soft signals raise confidence/severity but still don't confirm a spill.
    a = analyze_spill(
        tokens_per_second=10.0, baseline_tokens_per_second=20.0,
        system_ram_growth_mb=4096,
    )
    assert a.detected is False
    assert len(a.signals) == 2
    assert a.confidence == "medium"                  # confidence still rises
    assert a.severity == "medium"


def test_gpu_pressure_is_a_hard_signal() -> None:
    # 5900 >= 0.95 * 6000 (5700) → pressure, now a HARD signal → confirmed spill.
    a = analyze_spill(gpu_memory_used_mb=5900, max_allowed_vram_mb=6000)
    assert a.detected is True
    assert a.signals == [SIGNAL_GPU_MEMORY_PRESSURE]
    assert a.recommendation == "Reduce GPU layers."


def test_allocation_warning() -> None:
    a = analyze_spill(allocation_warning=True)
    assert a.detected is True
    assert a.signals == [SIGNAL_OLLAMA_ALLOCATION_WARNING]
    assert a.confidence == "low"


def test_multiple_signals_increase_confidence() -> None:
    a = analyze_spill(
        estimated_vram_mb=8000,
        max_allowed_vram_mb=6000,              # budget exceeded (hard)
        tokens_per_second=10.0,
        baseline_tokens_per_second=20.0,        # tps regression
        system_ram_growth_mb=4096,              # ram growth
    )
    assert len(a.signals) == 3
    assert a.confidence == "high"
    assert a.severity == "high"


def test_confidence_ladder() -> None:
    one = analyze_spill(system_ram_growth_mb=4096)
    two = analyze_spill(system_ram_growth_mb=4096, allocation_warning=True)
    three = analyze_spill(
        system_ram_growth_mb=4096,
        allocation_warning=True,
        gpu_memory_used_mb=5900,
        max_allowed_vram_mb=6000,
    )
    assert one.confidence == "low"
    assert two.confidence == "medium"
    assert three.confidence == "high"


def test_detect_vram_spill_preserves_contract() -> None:
    candidate = CandidateConfig(
        candidate_id="c1",
        label="Performance",
        model=ModelInfo(name="llama3.2:3b"),
        safety=SafetyInfo(estimated_vram_mb=8000, max_allowed_vram_mb=6000),
    )
    result = BenchmarkResult(
        benchmark_id="b1",
        candidate_id="c1",
        status="success",
        tokens_per_sec=9.0,
        valid_output=True,
        resource_observation=ResourceObservation(system_ram_growth_mb=4096),
    )
    baseline = BenchmarkResult(
        benchmark_id="b0", candidate_id="baseline", status="success",
        tokens_per_sec=20.0, valid_output=True,
    )
    detected, signals = detect_vram_spill(result, candidate, baseline)
    assert detected is True
    assert SIGNAL_ESTIMATED_VRAM_EXCEEDS_BUDGET in signals
    assert SIGNAL_TOKENS_PER_SECOND_REGRESSION in signals
    assert SIGNAL_SYSTEM_RAM_GROWTH in signals
    # Contract: exactly (bool, list[str]).
    assert isinstance(detected, bool) and isinstance(signals, list)


def _run_all() -> None:
    tests = [
        test_no_spill,
        test_budget_exceeded,
        test_tps_regression_alone_is_advisory,
        test_ram_growth_alone_is_advisory,
        test_soft_signals_alone_never_confirm_spill,
        test_gpu_pressure_is_a_hard_signal,
        test_allocation_warning,
        test_multiple_signals_increase_confidence,
        test_confidence_ladder,
        test_detect_vram_spill_preserves_contract,
    ]
    for test in tests:
        test()
        print(f"  ok  {test.__name__}")
    print(f"\n{len(tests)} passed")


if __name__ == "__main__":
    _run_all()
