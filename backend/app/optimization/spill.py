"""VRAM spill detection for the Measured Optimization Engine (Milestone 2).

"Spill" is when a model doesn't fully fit in GPU VRAM and part of it falls back
to system RAM / CPU. It shows up as a sharp tokens/sec regression, growing system
RAM, GPU memory pressure near the budget, or an explicit allocation warning from
Ollama.

``analyze_spill`` inspects a set of *already-measured* signals and returns a rich
:class:`SpillAnalysis` (detected / confidence / signals / severity /
recommendation). ``detect_vram_spill`` is the thin adapter that maps a
:class:`BenchmarkResult` (+ candidate/baseline) into ``analyze_spill`` and returns
only ``(detected, signals)`` to preserve the existing contract used by the
benchmark result and winner selection.

Everything here is **deterministic** and derives only from measured inputs — no
Ollama calls, no benchmarking, no fabricated numbers. Missing inputs simply don't
raise their signal; we never invent a measurement.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional, Union

from app.optimization.schemas import BenchmarkResult, CandidateConfig

# --- Spill signal constants ----------------------------------------------
# Stable identifiers stored in BenchmarkResult.spill_signals. Treat these as the
# canonical vocabulary; the frontend maps them to friendly explanations.
SIGNAL_ESTIMATED_VRAM_EXCEEDS_BUDGET = "estimated_vram_exceeds_budget"
SIGNAL_TOKENS_PER_SECOND_REGRESSION = "tokens_per_second_regression"
SIGNAL_SYSTEM_RAM_GROWTH = "system_ram_growth"
SIGNAL_GPU_MEMORY_PRESSURE = "gpu_memory_pressure"
SIGNAL_OLLAMA_ALLOCATION_WARNING = "ollama_allocation_warning"

ALL_SPILL_SIGNALS: list[str] = [
    SIGNAL_ESTIMATED_VRAM_EXCEEDS_BUDGET,
    SIGNAL_TOKENS_PER_SECOND_REGRESSION,
    SIGNAL_SYSTEM_RAM_GROWTH,
    SIGNAL_GPU_MEMORY_PRESSURE,
    SIGNAL_OLLAMA_ALLOCATION_WARNING,
]

# "Hard" signals are direct evidence of running out of VRAM (vs. softer,
# correlative signals like a TPS dip). They bump severity.
_HARD_SIGNALS: set[str] = {
    SIGNAL_ESTIMATED_VRAM_EXCEEDS_BUDGET,
    SIGNAL_OLLAMA_ALLOCATION_WARNING,
}

# --- Thresholds (documented, deterministic) ------------------------------
# A candidate slower than baseline by this fraction is a regression signal.
_TPS_REGRESSION_FRACTION = 0.25          # 25% slower than baseline
# System RAM growth above this (MB) during a run suggests offload to host RAM.
_RAM_GROWTH_THRESHOLD_MB = 2048.0
# GPU memory used at/above this fraction of the budget = memory pressure.
_GPU_PRESSURE_FRACTION = 0.95

# Recommendation text, chosen by highest-priority signal present.
_NO_ACTION = "No spill detected; no action needed."
_RECOMMENDATION_BY_SIGNAL: dict[str, str] = {
    SIGNAL_ESTIMATED_VRAM_EXCEEDS_BUDGET: "Reduce GPU layers or use a lighter quant.",
    SIGNAL_OLLAMA_ALLOCATION_WARNING: "Reduce GPU layers or use a lighter quant.",
    SIGNAL_GPU_MEMORY_PRESSURE: "Reduce GPU layers.",
    SIGNAL_TOKENS_PER_SECOND_REGRESSION: "Reduce context size or batch size.",
    SIGNAL_SYSTEM_RAM_GROWTH: "Reduce context size.",
}


@dataclass
class SpillAnalysis:
    """Full spill verdict for one run. Backend-only (not part of any API)."""

    detected: bool
    confidence: str          # "none" | "low" | "medium" | "high"
    signals: list[str]
    severity: str            # "none" | "low" | "medium" | "high"
    recommendation: str
    reasons: list[str] = field(default_factory=list)


def _confidence(signal_count: int) -> str:
    """1 signal → low, 2 → medium, 3+ → high, 0 → none."""
    if signal_count <= 0:
        return "none"
    if signal_count == 1:
        return "low"
    if signal_count == 2:
        return "medium"
    return "high"


def _severity(signals: list[str]) -> str:
    """Count-based severity, escalated when a hard (VRAM-overflow) signal fires."""
    count = len(signals)
    if count == 0:
        return "none"
    hard = any(s in _HARD_SIGNALS for s in signals)
    if count >= 3 or (hard and count >= 2):
        return "high"
    if count == 2 or hard:
        return "medium"
    return "low"


def _recommendation(signals: list[str]) -> str:
    """Pick the most relevant recommendation by signal priority."""
    for signal in ALL_SPILL_SIGNALS:  # ALL_SPILL_SIGNALS defines the priority order
        if signal in signals and signal in _RECOMMENDATION_BY_SIGNAL:
            return _RECOMMENDATION_BY_SIGNAL[signal]
    return _NO_ACTION


def analyze_spill(
    *,
    estimated_vram_mb: Optional[float] = None,
    max_allowed_vram_mb: Optional[float] = None,
    tokens_per_second: Optional[float] = None,
    baseline_tokens_per_second: Optional[float] = None,
    gpu_memory_used_mb: Optional[float] = None,
    system_ram_growth_mb: Optional[float] = None,
    spill_signals: Optional[list[str]] = None,
    allocation_warning: Optional[Union[bool, str]] = None,
) -> SpillAnalysis:
    """Analyze measured inputs and return a full spill verdict.

    Only inputs that are present can raise a signal; missing data is silently
    skipped (never guessed). Any recognized signals passed in via ``spill_signals``
    (e.g. parsed elsewhere) are merged with the ones derived here.
    """
    signals: set[str] = set()
    reasons: list[str] = []

    # 1) Estimated VRAM exceeds the candidate's allowed budget.
    if (
        estimated_vram_mb is not None
        and max_allowed_vram_mb is not None
        and estimated_vram_mb > max_allowed_vram_mb
    ):
        signals.add(SIGNAL_ESTIMATED_VRAM_EXCEEDS_BUDGET)
        reasons.append(
            f"estimated VRAM {estimated_vram_mb:.0f}MB > budget {max_allowed_vram_mb:.0f}MB"
        )

    # 2) Tokens/sec regressed sharply vs baseline.
    if (
        tokens_per_second is not None
        and baseline_tokens_per_second is not None
        and baseline_tokens_per_second > 0
        and tokens_per_second
        < baseline_tokens_per_second * (1.0 - _TPS_REGRESSION_FRACTION)
    ):
        signals.add(SIGNAL_TOKENS_PER_SECOND_REGRESSION)
        reasons.append(
            f"tokens/sec {tokens_per_second:.1f} well below baseline "
            f"{baseline_tokens_per_second:.1f}"
        )

    # 3) System RAM grew during the run (offload to host memory).
    if system_ram_growth_mb is not None and system_ram_growth_mb > _RAM_GROWTH_THRESHOLD_MB:
        signals.add(SIGNAL_SYSTEM_RAM_GROWTH)
        reasons.append(f"system RAM grew {system_ram_growth_mb:.0f}MB during the run")

    # 4) GPU memory pressure: usage near the allowed budget.
    if (
        gpu_memory_used_mb is not None
        and max_allowed_vram_mb is not None
        and max_allowed_vram_mb > 0
        and gpu_memory_used_mb >= max_allowed_vram_mb * _GPU_PRESSURE_FRACTION
    ):
        signals.add(SIGNAL_GPU_MEMORY_PRESSURE)
        reasons.append(
            f"GPU memory {gpu_memory_used_mb:.0f}MB near budget {max_allowed_vram_mb:.0f}MB"
        )

    # 5) Explicit allocation warning (e.g. from Ollama).
    if allocation_warning:
        signals.add(SIGNAL_OLLAMA_ALLOCATION_WARNING)
        reasons.append("Ollama reported a memory allocation warning")

    # Merge any recognized pre-existing signals.
    if spill_signals:
        known = set(ALL_SPILL_SIGNALS)
        signals.update(s for s in spill_signals if s in known)

    # Deterministic ordering by the canonical signal list.
    ordered = [s for s in ALL_SPILL_SIGNALS if s in signals]

    return SpillAnalysis(
        detected=len(ordered) >= 1,
        confidence=_confidence(len(ordered)),
        signals=ordered,
        severity=_severity(ordered),
        recommendation=_recommendation(ordered),
        reasons=reasons,
    )


def detect_vram_spill(
    result: BenchmarkResult,
    candidate: Optional[CandidateConfig] = None,
    baseline: Optional[BenchmarkResult] = None,
) -> tuple[bool, list[str]]:
    """Decide whether a candidate spilled out of VRAM.

    Adapts a measured :class:`BenchmarkResult` (plus its candidate config and the
    baseline) into :func:`analyze_spill`, and returns only ``(detected, signals)``
    so callers can set ``detected_vram_spill`` and ``spill_signals`` on the result
    without depending on the richer analysis type.
    """
    safety = candidate.safety if candidate is not None else None
    observation = result.resource_observation

    analysis = analyze_spill(
        estimated_vram_mb=safety.estimated_vram_mb if safety else None,
        max_allowed_vram_mb=safety.max_allowed_vram_mb if safety else None,
        tokens_per_second=result.tokens_per_sec,
        baseline_tokens_per_second=baseline.tokens_per_sec if baseline else None,
        gpu_memory_used_mb=observation.gpu_vram_used_mb,
        system_ram_growth_mb=observation.system_ram_growth_mb,
        # Carry forward any signals already recorded on the result.
        spill_signals=result.spill_signals,
    )
    return analysis.detected, analysis.signals
