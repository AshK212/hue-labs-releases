"""Benchmark comparison / classification service (methodology v2).

This is the single source of truth for the product acceptance rule. Given a
baseline and an optimized throughput, it decides one of three outcomes and
returns a user-safe, beginner-friendly recommendation. The frontend renders this
result; it must never re-implement the threshold.

Important honesty constraints:
  * The threshold is a **product acceptance threshold**, not a claim of
    statistical significance. We never assert significance or a confidence
    interval here.
  * Nothing is fabricated: the comparison is a pure function of the two measured
    medians and the configured threshold.
"""

from __future__ import annotations

from typing import Optional

from app import config
from app.schemas import BenchmarkComparison

# Stable classification codes.
IMPROVED = "improved"
NO_MEANINGFUL_DIFFERENCE = "no_meaningful_difference"
SLOWER = "slower"

# Stable recommendation codes for callers to branch on.
APPLY_OPTIMIZED = "apply_optimized"
KEEP_BASELINE = "keep_baseline"


def classify(
    baseline_tokens_per_sec: float,
    optimized_tokens_per_sec: float,
    *,
    measured_runs: Optional[int] = None,
    threshold_percent: Optional[float] = None,
    method_version: Optional[str] = None,
) -> BenchmarkComparison:
    """Classify optimized-vs-baseline throughput into improved / no-diff / slower.

    Args:
        baseline_tokens_per_sec: measured median throughput of the baseline.
        optimized_tokens_per_sec: measured median throughput of the tuned config.
        measured_runs: how many measured runs backed each side (for copy).
        threshold_percent: product acceptance threshold; defaults to config.
        method_version: methodology version stamp; defaults to config.

    Returns a :class:`BenchmarkComparison`. Pure and deterministic.
    """
    threshold = (
        config.BENCHMARK_MIN_IMPROVEMENT_PERCENT
        if threshold_percent is None
        else threshold_percent
    )
    version = config.BENCHMARK_METHOD_VERSION if method_version is None else method_version

    # Guard: without a valid positive baseline we cannot form a percentage, so we
    # honestly report "no meaningful difference" and keep the baseline.
    if baseline_tokens_per_sec <= 0:
        return BenchmarkComparison(
            classification=NO_MEANINGFUL_DIFFERENCE,
            comparison_percent=0.0,
            recommendation_code=KEEP_BASELINE,
            recommendation_message=_message(NO_MEANINGFUL_DIFFERENCE, 0.0, measured_runs),
            threshold_percent=threshold,
            measured_runs=measured_runs,
            method_version=version,
        )

    percent = (
        (optimized_tokens_per_sec - baseline_tokens_per_sec)
        / baseline_tokens_per_sec
        * 100.0
    )
    percent = round(percent, 1)

    if percent >= threshold:
        classification, code = IMPROVED, APPLY_OPTIMIZED
    elif percent <= -threshold:
        classification, code = SLOWER, KEEP_BASELINE
    else:
        classification, code = NO_MEANINGFUL_DIFFERENCE, KEEP_BASELINE

    return BenchmarkComparison(
        classification=classification,
        comparison_percent=percent,
        recommendation_code=code,
        recommendation_message=_message(classification, percent, measured_runs),
        threshold_percent=threshold,
        measured_runs=measured_runs,
        method_version=version,
    )


def _message(classification: str, percent: float, measured_runs: Optional[int]) -> str:
    """Beginner-friendly, user-safe copy for each outcome (rendered verbatim)."""
    runs = measured_runs if measured_runs is not None else config.BENCHMARK_MEASURED_RUNS
    if classification == IMPROVED:
        # A clean integer reads better for a headline gain.
        pct = int(round(percent))
        return (
            f"Performance improved. Median throughput increased by {pct}% "
            f"across {runs} measured runs."
        )
    if classification == SLOWER:
        return (
            "Your current settings are faster. The tested configuration reduced "
            "performance, so your original configuration is kept."
        )
    # no_meaningful_difference
    return (
        "Your system is already performing well. The tested settings produced no "
        "meaningful improvement, so your original configuration is kept."
    )
