"""Winner selection for the Measured Optimization Engine (Milestone 2).

Given measured :class:`BenchmarkResult`s for the baseline and each candidate,
score every candidate and pick the best — *safety-first*. A faster config that
spilled VRAM, produced invalid output, or failed to run must never beat a stable
baseline.

Scoring is a weighted blend (all sub-scores are 0–100):

    total_score = 0.65 * performance   # measured tokens/sec vs baseline
                + 0.20 * stability      # ran cleanly, valid output, full metrics
                + 0.15 * safety         # no spill / signals / memory pressure

Everything here is **deterministic** and derives only from measured fields — no
randomness, no Ollama calls, no benchmarking, no fabricated numbers. When a
metric is missing we penalize (or disqualify), we never invent a value.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from app.optimization.schemas import (
    BenchmarkResult,
    CandidateConfig,
    OptimizationWinner,
)

# --- Tunable constants ----------------------------------------------------

PERFORMANCE_WEIGHT = 0.65
STABILITY_WEIGHT = 0.20
SAFETY_WEIGHT = 0.15

# A candidate must beat the baseline by at least this much (measured) to replace it.
MIN_IMPROVEMENT_PERCENT = 5.0

# Two totals within this margin are treated as a tie → resolved by tie-breakers.
TIE_SCORE_THRESHOLD = 2.0

# Safety penalties.
_SPILL_DETECTED_PENALTY = 60.0
_SPILL_SIGNAL_PENALTY = 15.0          # per signal
_SPILL_SIGNAL_PENALTY_CAP = 60.0
_MEMORY_PRESSURE_PENALTY = 20.0
# System RAM growth (MB) above which we treat a run as under memory pressure.
_RAM_GROWTH_PRESSURE_MB = 2048.0

# Stability penalties.
_TIMEOUT_PENALTY = 50.0
_INCOMPLETE_METRICS_PENALTY = 20.0


@dataclass
class CandidateScore:
    """Internal scoring breakdown for one candidate. Not part of any API."""

    candidate_id: str
    performance_score: float
    stability_score: float
    safety_score: float
    total_score: float
    improvement_percent: Optional[float]
    eligible: bool
    reasons: list[str] = field(default_factory=list)


def _clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, value))


def score_candidate(
    baseline_result: Optional[BenchmarkResult],
    candidate_result: BenchmarkResult,
) -> CandidateScore:
    """Score one candidate against the baseline. Pure and deterministic."""
    reasons: list[str] = []
    eligible = True

    status = candidate_result.status
    tps = candidate_result.tokens_per_sec

    # --- Eligibility gates -------------------------------------------------
    if status != "success":
        eligible = False
        reasons.append(f"not a successful run (status={status})")
    if not candidate_result.valid_output:
        eligible = False
        reasons.append("invalid output")
    if tps is None:
        eligible = False
        reasons.append("missing tokens/sec metric")

    # --- Performance (measured tokens/sec vs baseline) --------------------
    baseline_tps = baseline_result.tokens_per_sec if baseline_result else None
    improvement: Optional[float] = None
    if tps is not None and baseline_tps is not None and baseline_tps > 0:
        improvement = (tps - baseline_tps) / baseline_tps * 100.0
        # 0% improvement → 50; +50% → 100; -50% → 0.
        performance = _clamp(50.0 + improvement)
    elif tps is not None:
        # Measured but nothing valid to compare against — neutral, no claim.
        performance = 50.0
        reasons.append("no baseline tokens/sec to compare against")
    else:
        performance = 0.0

    # --- Stability (did it run cleanly with full metrics?) ----------------
    stability = 100.0
    if status == "failed":
        stability = 0.0
        reasons.append("benchmark failed")
    if not candidate_result.valid_output:
        stability = 0.0
    if tps is None:
        stability = 0.0
        reasons.append("no performance metrics recorded")
    error_text = (candidate_result.error_message or "").lower()
    if "timeout" in error_text or "timed out" in error_text:
        stability = _clamp(stability - _TIMEOUT_PENALTY)
        reasons.append("timeout detected")
    if tps is not None and candidate_result.total_tokens is None:
        stability = _clamp(stability - _INCOMPLETE_METRICS_PENALTY)
        reasons.append("incomplete metrics (no total tokens)")

    # --- Safety (VRAM spill / signals / memory pressure) ------------------
    safety = 100.0
    if candidate_result.detected_vram_spill:
        safety = _clamp(safety - _SPILL_DETECTED_PENALTY)
        reasons.append("VRAM spill detected")
    signal_count = len(candidate_result.spill_signals or [])
    if signal_count:
        penalty = min(_SPILL_SIGNAL_PENALTY_CAP, _SPILL_SIGNAL_PENALTY * signal_count)
        safety = _clamp(safety - penalty)
        reasons.append(f"{signal_count} spill signal(s)")
    ram_growth = candidate_result.resource_observation.system_ram_growth_mb
    if ram_growth is not None and ram_growth > _RAM_GROWTH_PRESSURE_MB:
        safety = _clamp(safety - _MEMORY_PRESSURE_PENALTY)
        reasons.append("high system RAM growth")

    total = (
        PERFORMANCE_WEIGHT * performance
        + STABILITY_WEIGHT * stability
        + SAFETY_WEIGHT * safety
    )

    return CandidateScore(
        candidate_id=candidate_result.candidate_id,
        performance_score=round(performance, 2),
        stability_score=round(stability, 2),
        safety_score=round(safety, 2),
        total_score=round(total, 2),
        improvement_percent=round(improvement, 2) if improvement is not None else None,
        eligible=eligible,
        reasons=reasons,
    )


def _memory_usage(result: BenchmarkResult) -> float:
    """Best-available memory figure for the tie-break (lower is better).

    Prefers GPU VRAM, falls back to system RAM. Unknown usage sorts last so a
    candidate with a known-lower footprint wins over one with no data.
    """
    observation = result.resource_observation
    if observation.gpu_vram_used_mb is not None:
        return observation.gpu_vram_used_mb
    if observation.system_ram_used_mb is not None:
        return observation.system_ram_used_mb
    return float("inf")


def _pick_best(
    scored: list[tuple[CandidateScore, CandidateConfig, BenchmarkResult]],
) -> tuple[CandidateScore, CandidateConfig, BenchmarkResult]:
    """Pick the winner from qualified candidates, applying tie-breakers.

    Candidates within TIE_SCORE_THRESHOLD of the top total_score are tied and
    resolved by: (1) safer, (2) higher stability, (3) lower memory usage, then
    (4) candidate_id for full determinism.
    """
    top_total = max(t[0].total_score for t in scored)
    contenders = [
        t for t in scored if top_total - t[0].total_score < TIE_SCORE_THRESHOLD
    ]
    contenders.sort(
        key=lambda t: (
            -t[0].safety_score,      # safer first
            -t[0].stability_score,   # then more stable
            _memory_usage(t[2]),     # then lower memory
            t[1].candidate_id,       # deterministic final tiebreak
        )
    )
    return contenders[0]


def select_winner(
    baseline_config: Optional[CandidateConfig] = None,
    baseline_result: Optional[BenchmarkResult] = None,
    candidate_configs: Optional[list[CandidateConfig]] = None,
    candidate_results: Optional[list[BenchmarkResult]] = None,
) -> Optional[OptimizationWinner]:
    """Select the winning candidate from measured results, or None.

    A candidate only wins if it is eligible (ran successfully, valid output,
    real tokens/sec), did not spill VRAM (unless *every* candidate spilled), and
    beat the baseline by at least ``MIN_IMPROVEMENT_PERCENT``. Returns ``None``
    when no candidate qualifies — meaning the baseline stands.
    """
    candidate_configs = candidate_configs or []
    candidate_results = candidate_results or []
    result_by_id = {r.candidate_id: r for r in candidate_results}

    # Score every candidate that has a result.
    scored: list[tuple[CandidateScore, CandidateConfig, BenchmarkResult]] = []
    for config_item in candidate_configs:
        result = result_by_id.get(config_item.candidate_id)
        if result is None:
            continue
        scored.append((score_candidate(baseline_result, result), config_item, result))

    # Drop ineligible candidates (failed / invalid / missing metrics).
    eligible = [t for t in scored if t[0].eligible]
    if not eligible:
        return None

    # Ignore confirmed spill candidates — unless *all* eligible ones spilled.
    non_spilled = [t for t in eligible if not t[2].detected_vram_spill]
    pool = non_spilled if non_spilled else eligible

    # Require a real, measured improvement over the baseline.
    qualified = [
        t
        for t in pool
        if t[0].improvement_percent is not None
        and t[0].improvement_percent >= MIN_IMPROVEMENT_PERCENT
    ]
    if not qualified:
        return None

    score, winning_config, _ = _pick_best(qualified)
    reason = (
        f"{winning_config.label} won with a measured "
        f"{score.improvement_percent:.1f}% improvement over baseline "
        f"(score {score.total_score:.1f})."
    )
    return OptimizationWinner(
        candidate_id=winning_config.candidate_id,
        label=winning_config.label,
        reason=reason,
        is_baseline=False,
        performance_score=score.performance_score,
        stability_score=score.stability_score,
        safety_score=score.safety_score,
        total_score=score.total_score,
    )
