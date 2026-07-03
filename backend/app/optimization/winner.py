"""Winner selection (placeholder).

Once we have measured BenchmarkResults for the baseline and every candidate, this
module picks the best one. Selection is *safety-first*: a faster config that
spilled VRAM or produced invalid output should never beat a stable baseline.

For now this is a contract-only placeholder. It does not score anything yet — it
returns ``None`` (caller falls back to baseline) or, when a baseline is provided,
a baseline-safe winner so the rest of the pipeline has something valid to render.
"""

from __future__ import annotations

from typing import Optional

from app.optimization.schemas import (
    BenchmarkResult,
    CandidateConfig,
    OptimizationWinner,
)


def select_winner(
    baseline_config: Optional[CandidateConfig] = None,
    baseline_result: Optional[BenchmarkResult] = None,
    candidate_configs: Optional[list[CandidateConfig]] = None,
    candidate_results: Optional[list[BenchmarkResult]] = None,
) -> Optional[OptimizationWinner]:
    """Select the winning candidate from measured results.

    Placeholder behavior:
      * If a baseline is available, return it as a baseline-safe winner (scores
        left as ``None`` — nothing is scored yet).
      * Otherwise return ``None`` and let the caller decide.

    TODO (Milestone 2 search phase): compute a weighted score per candidate and
    pick the max, but only among candidates that are valid and did not spill:

        total_score = (
            0.65 * performance_score   # measured tokens/sec vs baseline
            + 0.20 * stability_score   # run-to-run consistency / valid output
            + 0.15 * safety_score      # VRAM headroom, no spill signals
        )

      * performance_score  — 65%
      * stability_score    — 20%
      * safety_score       — 15%

    A candidate that spilled VRAM or produced invalid output is disqualified
    regardless of raw speed.
    """
    if baseline_config is not None:
        return OptimizationWinner(
            candidate_id=baseline_config.candidate_id,
            label=baseline_config.label,
            reason="Baseline selected (measured scoring not implemented yet).",
            is_baseline=True,
        )
    return None
