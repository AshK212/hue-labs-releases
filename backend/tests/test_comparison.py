"""Tests for the benchmark comparison/classification service (methodology v2).

Runs under pytest or standalone:

    python tests/test_comparison.py   (from backend/)

Pure and deterministic — no Ollama, no network, no fabricated numbers. Verifies
the three product outcomes, the exact ±threshold boundaries, the baseline guard,
and that the copy is beginner-friendly and carries {X}/{N}.
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import config
from app.services import comparison as C


def test_improved_above_threshold() -> None:
    r = C.classify(20.0, 30.0, measured_runs=3)  # +50%
    assert r.classification == C.IMPROVED
    assert r.recommendation_code == C.APPLY_OPTIMIZED
    assert r.comparison_percent == 50.0
    assert "50%" in r.recommendation_message
    assert "3 measured runs" in r.recommendation_message
    assert r.threshold_percent == config.BENCHMARK_MIN_IMPROVEMENT_PERCENT
    assert r.method_version == config.BENCHMARK_METHOD_VERSION


def test_no_meaningful_difference_within_band() -> None:
    r = C.classify(20.0, 20.5, measured_runs=3)  # +2.5%
    assert r.classification == C.NO_MEANINGFUL_DIFFERENCE
    assert r.recommendation_code == C.KEEP_BASELINE
    assert "already performing well" in r.recommendation_message


def test_slower_below_negative_threshold() -> None:
    r = C.classify(20.0, 18.0, measured_runs=3)  # -10%
    assert r.classification == C.SLOWER
    assert r.recommendation_code == C.KEEP_BASELINE
    assert "current settings are faster" in r.recommendation_message


def test_exact_positive_threshold_is_improved() -> None:
    # Use the configured threshold exactly: +threshold% counts as improved (>=).
    thr = config.BENCHMARK_MIN_IMPROVEMENT_PERCENT
    optimized = 20.0 * (1.0 + thr / 100.0)
    r = C.classify(20.0, optimized)
    assert r.classification == C.IMPROVED


def test_exact_negative_threshold_is_slower() -> None:
    thr = config.BENCHMARK_MIN_IMPROVEMENT_PERCENT
    optimized = 20.0 * (1.0 - thr / 100.0)
    r = C.classify(20.0, optimized)
    assert r.classification == C.SLOWER


def test_zero_baseline_guard() -> None:
    r = C.classify(0.0, 25.0)
    assert r.classification == C.NO_MEANINGFUL_DIFFERENCE
    assert r.comparison_percent == 0.0
    assert r.recommendation_code == C.KEEP_BASELINE


def _run_all() -> None:
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            print(f"ok  {name}")


if __name__ == "__main__":
    _run_all()
    print("all comparison tests passed")
