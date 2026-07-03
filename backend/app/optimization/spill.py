"""VRAM spill detection (placeholder).

"Spill" is when a model doesn't fully fit in GPU VRAM and part of it falls back
to system RAM / CPU. It usually shows up as a sharp tokens/sec regression and
growing system RAM use. This module will, in a later milestone, inspect a
measured ``BenchmarkResult`` (plus the candidate's safety estimate) and decide
whether spill happened and which signals fired.

For now this is a contract-only placeholder: the signal names are frozen here so
the schema, engine, and frontend can all reference the same constants, but no
detection logic runs yet.
"""

from __future__ import annotations

from typing import Optional

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


def detect_vram_spill(
    result: BenchmarkResult,
    candidate: Optional[CandidateConfig] = None,
    baseline: Optional[BenchmarkResult] = None,
) -> tuple[bool, list[str]]:
    """Decide whether a candidate spilled out of VRAM.

    Placeholder: returns ``(False, [])`` for now — we never claim a spill we
    haven't actually observed.

    TODO (Milestone 2 search phase): evaluate each signal in ALL_SPILL_SIGNALS:
      * estimated_vram_exceeds_budget — safety.estimated_vram_mb > max_allowed_vram_mb
      * tokens_per_second_regression — result.tokens_per_sec well below baseline
      * system_ram_growth — resource_observation.system_ram_growth_mb spikes
      * gpu_memory_pressure — gpu_vram_used_mb near total VRAM
      * ollama_allocation_warning — parsed from raw_ollama_metadata

    Returns a ``(detected, signals)`` pair so the caller can set both
    ``detected_vram_spill`` and ``spill_signals`` on the BenchmarkResult.
    """
    return False, []
