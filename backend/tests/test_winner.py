"""Tests for winner scoring + selection (Milestone 2).

Runs under pytest or standalone:

    python tests/test_winner.py   (from backend/)

All cases are deterministic — fixed inputs, no randomness, no benchmarking.
"""

from __future__ import annotations

import os
import sys
from typing import Optional

# Make `app` importable when run directly.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.optimization.schemas import (
    BenchmarkResult,
    CandidateConfig,
    ModelInfo,
    ResourceObservation,
)
from app.optimization.winner import score_candidate, select_winner

_MODEL = ModelInfo(name="llama3.2:3b")


def _config(candidate_id: str, label: str) -> CandidateConfig:
    return CandidateConfig(candidate_id=candidate_id, label=label, model=_MODEL)


def _result(
    candidate_id: str,
    *,
    status: str = "success",
    tps: Optional[float] = None,
    total_tokens: Optional[int] = 128,
    valid_output: bool = True,
    detected_vram_spill: bool = False,
    spill_signals: Optional[list[str]] = None,
    error_message: Optional[str] = None,
    gpu_vram_used_mb: Optional[float] = None,
) -> BenchmarkResult:
    return BenchmarkResult(
        benchmark_id=f"bench-{candidate_id}",
        candidate_id=candidate_id,
        status=status,
        tokens_per_sec=tps,
        total_tokens=total_tokens,
        valid_output=valid_output,
        detected_vram_spill=detected_vram_spill,
        spill_signals=spill_signals or [],
        error_message=error_message,
        resource_observation=ResourceObservation(gpu_vram_used_mb=gpu_vram_used_mb),
    )


def test_obvious_winner() -> None:
    baseline = _result("baseline", tps=20.0)
    configs = [_config("fast", "Performance"), _config("mild", "Balanced")]
    results = [_result("fast", tps=30.0), _result("mild", tps=22.0)]  # +50% vs +10%
    winner = select_winner(None, baseline, configs, results)
    assert winner is not None
    assert winner.candidate_id == "fast"
    assert winner.is_baseline is False
    assert winner.total_score is not None and winner.performance_score == 100.0


def test_failed_benchmark_ignored() -> None:
    baseline = _result("baseline", tps=20.0)
    configs = [_config("broken", "Performance")]
    # Fast-looking but failed → must be ignored → no winner.
    results = [_result("broken", status="failed", tps=99.0, valid_output=False)]
    assert select_winner(None, baseline, configs, results) is None
    # And its score is ineligible.
    assert score_candidate(baseline, results[0]).eligible is False


def test_spill_candidate_ignored() -> None:
    baseline = _result("baseline", tps=20.0)
    configs = [_config("spiller", "Performance"), _config("clean", "Balanced")]
    results = [
        _result("spiller", tps=40.0, detected_vram_spill=True,
                spill_signals=["gpu_memory_pressure"]),  # faster but spilled
        _result("clean", tps=30.0),                       # slower, safe, +50%
    ]
    winner = select_winner(None, baseline, configs, results)
    assert winner is not None
    assert winner.candidate_id == "clean"


def test_all_spill_allows_spilled_winner() -> None:
    # When every eligible candidate spilled, the best spilled one may still win.
    baseline = _result("baseline", tps=20.0)
    configs = [_config("only", "Performance")]
    results = [_result("only", tps=40.0, detected_vram_spill=True,
                       spill_signals=["gpu_memory_pressure"])]
    winner = select_winner(None, baseline, configs, results)
    assert winner is not None
    assert winner.candidate_id == "only"


def test_no_improvement_returns_none() -> None:
    baseline = _result("baseline", tps=20.0)
    configs = [_config("meh", "Balanced")]
    results = [_result("meh", tps=20.5)]  # +2.5% < 5% threshold
    assert select_winner(None, baseline, configs, results) is None


def test_tie_break_chooses_safer_candidate() -> None:
    # Both +50% (performance 100). Totals within 2 of each other:
    #   safe:  stability 80 (no total_tokens), safety 100  -> total 96.0
    #   risky: stability 100, safety 85 (1 spill signal)   -> total 97.75
    # risky has the higher total, but the tie-break must prefer the safer one.
    baseline = _result("baseline", tps=20.0)
    configs = [_config("safe", "Balanced"), _config("risky", "Performance")]
    results = [
        _result("safe", tps=30.0, total_tokens=None),   # stability penalty, safety 100
        _result("risky", tps=30.0, spill_signals=["tokens_per_second_regression"]),
    ]
    winner = select_winner(None, baseline, configs, results)
    assert winner is not None
    assert winner.candidate_id == "safe"
    assert winner.safety_score == 100.0


def _run_all() -> None:
    tests = [
        test_obvious_winner,
        test_failed_benchmark_ignored,
        test_spill_candidate_ignored,
        test_all_spill_allows_spilled_winner,
        test_no_improvement_returns_none,
        test_tie_break_chooses_safer_candidate,
    ]
    for test in tests:
        test()
        print(f"  ok  {test.__name__}")
    print(f"\n{len(tests)} passed")


if __name__ == "__main__":
    _run_all()
