"""Maps an OptimizationRun into a SubmissionPayload.

The builder owns **all** mapping/derivation logic so the client and service stay
dumb. It reads only presentation-relevant fields off the run and never copies
benchmark internals. Nothing is fabricated: a value the run doesn't have stays
``None`` (e.g. no winner → no after/improvement/score).
"""

from __future__ import annotations

from typing import Optional

from app.optimization.schemas import BenchmarkResult, OptimizationRun
from app.submission.schemas import SubmissionPayload


class SubmissionBuilder:
    """Convert OptimizationRun → SubmissionPayload."""

    def build(self, run: OptimizationRun) -> SubmissionPayload:
        hardware = run.hardware
        gpu = hardware.gpus[0] if hardware and hardware.gpus else None

        before = run.baseline_result.tokens_per_sec if run.baseline_result else None
        after = self._winner_tps(run)
        improvement = (
            ((after - before) / before) * 100.0
            if before is not None and after is not None and before > 0
            else None
        )

        quant = (run.model.quantization if run.model else None) or (
            run.recommendation.quant_recommendation if run.recommendation else None
        )

        optimization_settings: Optional[dict] = None
        if run.recommendation and run.recommendation.recommended_runtime:
            # Only the knobs actually set — no None-valued clutter.
            optimization_settings = run.recommendation.recommended_runtime.model_dump(
                exclude_none=True
            )

        return SubmissionPayload(
            app_version=run.app.version if run.app else None,
            prompt_version=run.baseline_result.prompt_version if run.baseline_result else None,
            gpu=gpu.name if gpu else None,
            vram_mb=round(gpu.vram_gb * 1024) if gpu and gpu.vram_gb is not None else None,
            # The Milestone 1 hardware probe doesn't detect a GPU driver version,
            # so it's honestly left None rather than guessed.
            driver_version=None,
            cpu=hardware.cpu_name if hardware else None,
            ram_mb=round(hardware.memory_total_gb * 1024) if hardware else None,
            model=run.model.name if run.model else None,
            quant=quant,
            optimization_settings=optimization_settings,
            before_tokens_per_second=before,
            after_tokens_per_second=after,
            improvement_percent=round(improvement, 2) if improvement is not None else None,
            score=run.winner.total_score if run.winner else None,
        )

    def _winner_tps(self, run: OptimizationRun) -> Optional[float]:
        """The winning candidate's measured throughput, or None if no winner."""
        if not run.winner:
            return None
        winner_result: Optional[BenchmarkResult] = next(
            (r for r in run.candidate_results if r and r.candidate_id == run.winner.candidate_id),
            None,
        )
        return winner_result.tokens_per_sec if winner_result else None
