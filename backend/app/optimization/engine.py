"""Measured Optimization Engine (assembly stage).

Milestone 2 introduces a *measured* optimization loop: try several candidate
runtime configurations, benchmark each honestly, and pick a winner. This module
is the entry point for that loop.

This module is pure **orchestration** — it wires together the other modules and
never re-implements their logic:

* ``create_run`` builds the :class:`OptimizationRun` structure (candidates +
  placeholder results). No Ollama call, no benchmarking.
* ``optimize`` runs the full measured loop: generate → execute → attach results →
  select winner → recommend quant → populate recommendation/timing → return.

It reuses :class:`CandidateGenerator`, :class:`BenchmarkExecutor`,
``select_winner``, ``recommend_quant`` and (via the executor) ``detect_vram_spill``.
No metric is fabricated: unmeasured fields stay ``None``, and orchestration never
crashes — a benchmark failure is recorded and a valid run is still returned.
Existing Milestone 1 benchmark/optimization flows are untouched.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional, Union

from app import config
from app import schemas as api_schemas  # Milestone 1 API contract
from app.optimization import winner as winner_module
from app.optimization.candidates import CandidateGenerator, vram_bucket
from app.optimization.executor import BenchmarkExecutor
from app.optimization.quant import recommend_quant
from app.optimization.schemas import (
    SCHEMA_VERSION,
    AppInfo,
    BenchmarkResult,
    BenchmarkTiming,
    ModelInfo,
    OptimizationRecommendation,
    OptimizationRun,
    RunTiming,
    RuntimeSettings,
    ShareCardArtifact,
    SubmissionStatus,
)
from app.schemas import HardwareInfo

# Map Ollama option keys -> our RuntimeSettings fields, so a Milestone 1 result's
# `options` dict can be reflected into the new schema without guessing.
_OPTION_TO_RUNTIME: dict[str, str] = {
    "num_gpu": "gpu_layers",
    "num_ctx": "context_size",
    "num_batch": "batch_size",
    "num_thread": "threads",
}


def _runtime_from_options(options: dict) -> RuntimeSettings:
    """Reflect a Milestone 1 Ollama options dict into RuntimeSettings."""
    mapped = {
        field: options[key]
        for key, field in _OPTION_TO_RUNTIME.items()
        if key in options
    }
    return RuntimeSettings(**mapped)


def _real_baseline_result(
    candidate_id: str, legacy: api_schemas.BenchmarkResult
) -> BenchmarkResult:
    """Map a real Milestone 1 baseline run into a measured BenchmarkResult.

    Numbers are copied straight from the real run — nothing is synthesized.
    Metrics the old schema didn't capture stay ``None``.
    """
    return BenchmarkResult(
        benchmark_id=str(uuid.uuid4()),
        candidate_id=candidate_id,
        status="success",
        timing=BenchmarkTiming(
            completed_at=legacy.created_at,
            duration_seconds=legacy.total_seconds,
        ),
        prompt_id="milestone1-fixed-prompt",
        tokens_per_sec=legacy.tokens_per_sec,
        total_tokens=legacy.output_tokens,
        valid_output=True,
        # The M1 result didn't quantify measurement confidence; leave unset.
        confidence=None,
    )


def _placeholder_result(
    candidate_id: str, status: str, note: str
) -> BenchmarkResult:
    """A non-measured placeholder result — no fake metrics.

    Used for tuned candidates (``skipped``) and, when no real baseline data was
    provided, the baseline (``pending``). ``confidence`` is left ``None`` because
    nothing has been measured yet: the schema types confidence as a float, so a
    low/absent confidence is honestly represented as "no value" rather than a
    fabricated number. The reason for the empty result is carried in
    ``error_message``.
    """
    return BenchmarkResult(
        benchmark_id=str(uuid.uuid4()),
        candidate_id=candidate_id,
        status=status,  # "skipped" | "pending"
        valid_output=False,
        confidence=None,
        error_message=note,
    )


class MeasuredOptimizationEngine:
    """Assembles an OptimizationRun from generated candidates.

    ``create_run`` generates candidates and wraps them in a valid run with
    placeholder results. The actual benchmarking/search and winner scoring are
    added in later steps.
    """

    def create_run(
        self,
        model: Union[str, ModelInfo],
        hardware: Optional[HardwareInfo] = None,
        baseline_runtime: Optional[RuntimeSettings] = None,
        baseline_result: Optional[api_schemas.BenchmarkResult] = None,
        strategy: str = "balanced",
        app_version: Optional[str] = None,
    ) -> OptimizationRun:
        """Build a valid OptimizationRun with generated candidates.

        Args:
            model: selected model tag or a full :class:`ModelInfo`.
            hardware: detected machine info (``None`` → conservative candidates).
            baseline_runtime: the machine's current runtime. If omitted, it is
                derived from ``baseline_result.options`` when available, else
                left at Ollama's defaults (empty RuntimeSettings).
            baseline_result: a real Milestone 1 baseline run, if one exists. When
                provided it becomes the baseline's measured result; otherwise a
                safe ``pending`` placeholder is used.
            strategy: ``"balanced" | "performance" | "memory_safe"`` (passed to
                the generator; unknown values fall back to balanced).
            app_version: app version string for reproducibility.

        No search runs and no metrics are fabricated.
        """
        model_info = ModelInfo(name=model) if isinstance(model, str) else model

        # Derive the baseline runtime: explicit > reflected from real data > defaults.
        if baseline_runtime is None and baseline_result is not None:
            baseline_runtime = _runtime_from_options(baseline_result.options or {})
        baseline_runtime = baseline_runtime or RuntimeSettings()

        # Generate baseline + tuned candidates (no Ollama, no benchmarking).
        candidates = CandidateGenerator().generate(
            hardware, model_info, baseline_runtime, strategy
        )
        baseline_candidate = candidates[0]
        tuned_candidates = candidates[1:]

        run = OptimizationRun(
            run_id=str(uuid.uuid4()),
            schema_version=SCHEMA_VERSION,
            app=AppInfo(name="Hue Labs", version=app_version),
            hardware=hardware,
            model=model_info,
            baseline_config=baseline_candidate,
            candidate_configs=tuned_candidates,
            timing=RunTiming(),
        )

        # Baseline result: real measured data if provided, else a safe placeholder.
        if baseline_result is not None:
            run.baseline_result = _real_baseline_result(
                baseline_candidate.candidate_id, baseline_result
            )
        else:
            run.baseline_result = _placeholder_result(
                baseline_candidate.candidate_id,
                status="pending",
                note="Baseline not benchmarked yet — awaiting a real run.",
            )

        # Tuned candidates are generated but not benchmarked yet → skipped.
        run.candidate_results = [
            _placeholder_result(
                candidate.candidate_id,
                status="skipped",
                note="Candidate generated but not benchmarked yet (search not implemented).",
            )
            for candidate in tuned_candidates
        ]

        # Winner selection over the (still placeholder) results — returns None
        # here since nothing has been measured yet. ``optimize`` recomputes it.
        run.winner = winner_module.select_winner(
            baseline_config=run.baseline_config,
            baseline_result=run.baseline_result,
            candidate_configs=run.candidate_configs,
            candidate_results=run.candidate_results,
        )

        return run

    async def optimize(
        self,
        model: Union[str, ModelInfo],
        hardware: Optional[HardwareInfo] = None,
        baseline_runtime: Optional[RuntimeSettings] = None,
        strategy: str = "balanced",
        app_version: Optional[str] = None,
        executor: Optional[BenchmarkExecutor] = None,
    ) -> OptimizationRun:
        """Run the full measured optimization loop and return a completed run.

        Flow: generate candidates → build run → execute benchmarks sequentially →
        attach results → select winner → recommend quant → populate recommendation
        and timing → return. Purely orchestration; every step delegates to an
        existing module. Never raises for a benchmark failure — the failure is
        recorded and a valid :class:`OptimizationRun` is still returned.
        """
        started_dt = datetime.now(timezone.utc)

        # 1 + 2. Generate candidates and build the run structure (reuses create_run).
        run = self.create_run(
            model,
            hardware=hardware,
            baseline_runtime=baseline_runtime,
            strategy=strategy,
            app_version=app_version,
        )
        run.timing.started_at = started_dt.isoformat()
        executor = executor or BenchmarkExecutor()

        # 3. Execute benchmarks sequentially (baseline first). Never crash.
        ordered = [c for c in [run.baseline_config, *run.candidate_configs] if c is not None]
        try:
            results = await executor.execute_all(
                ordered, hardware=hardware, run_id=run.run_id
            )
        except Exception as exc:  # noqa: BLE001 - orchestration must never crash
            run.recommendation = OptimizationRecommendation(
                summary="Optimization could not run to completion.",
                notes=[f"Executor error: {type(exc).__name__}: {exc}"],
            )
            return self._finalize(run, started_dt)

        # 4. Attach real results, keeping alignment. Candidates that didn't run
        #    (e.g. after a fatal failure or cancellation) keep their placeholders.
        result_by_id = {result.candidate_id: result for result in results}
        if run.baseline_config and run.baseline_config.candidate_id in result_by_id:
            run.baseline_result = result_by_id[run.baseline_config.candidate_id]
        existing = {result.candidate_id: result for result in run.candidate_results}
        run.candidate_results = [
            result_by_id.get(config_item.candidate_id) or existing.get(config_item.candidate_id)
            for config_item in run.candidate_configs
        ]

        # 5. Select the winner from measured results (reuses select_winner).
        run.winner = winner_module.select_winner(
            baseline_config=run.baseline_config,
            baseline_result=run.baseline_result,
            candidate_configs=run.candidate_configs,
            candidate_results=run.candidate_results,
        )

        # 6. Quant recommendation + honest, user-facing recommendation.
        run.recommendation = self._build_recommendation(run, hardware, result_by_id)

        # 7. Placeholders (submission/share card/telemetry/QA) + timing.
        return self._finalize(run, started_dt)

    def _build_recommendation(
        self,
        run: OptimizationRun,
        hardware: Optional[HardwareInfo],
        result_by_id: dict[str, BenchmarkResult],
    ) -> OptimizationRecommendation:
        """Derive the recommendation from the winner (or state none was found)."""
        bucket = vram_bucket(hardware)
        failed_any = any(
            result is not None and result.status == "failed"
            for result in [run.baseline_result, *run.candidate_results]
        )
        winner = run.winner

        if winner is not None:
            win_config = next(
                (c for c in run.candidate_configs if c.candidate_id == winner.candidate_id),
                None,
            )
            win_result = result_by_id.get(winner.candidate_id)
            quant = recommend_quant(
                current_quant=win_config.model.quantization if win_config else None,
                hardware_bucket=bucket,
                detected_vram_spill=bool(win_result.detected_vram_spill) if win_result else False,
                tokens_per_second=win_result.tokens_per_sec if win_result else None,
                baseline_tokens_per_second=(
                    run.baseline_result.tokens_per_sec if run.baseline_result else None
                ),
                available_vram_mb=win_config.safety.max_allowed_vram_mb if win_config else None,
                model_size_mb=(
                    win_config.model.size_gb * 1024
                    if win_config and win_config.model.size_gb
                    else None
                ),
            )
            notes = [f"Quantization: {quant.action} — {quant.reason}"]
            if failed_any:
                notes.append("Some candidates failed to benchmark and were excluded.")
            return OptimizationRecommendation(
                summary=winner.reason,
                recommended_candidate_id=winner.candidate_id,
                recommended_runtime=win_config.runtime if win_config else None,
                quant_recommendation=quant.recommended_quant,
                notes=notes,
            )

        # No winner — never fabricate an improvement.
        baseline_result = run.baseline_result
        quant = recommend_quant(
            current_quant=run.baseline_config.model.quantization if run.baseline_config else None,
            hardware_bucket=bucket,
            detected_vram_spill=bool(baseline_result.detected_vram_spill) if baseline_result else False,
            tokens_per_second=baseline_result.tokens_per_sec if baseline_result else None,
            baseline_tokens_per_second=baseline_result.tokens_per_sec if baseline_result else None,
            available_vram_mb=(
                run.baseline_config.safety.max_allowed_vram_mb if run.baseline_config else None
            ),
        )
        notes = ["Keeping the baseline configuration.", f"Quantization: {quant.action} — {quant.reason}"]
        if failed_any:
            notes.append("Some candidates failed to benchmark and were excluded.")
        return OptimizationRecommendation(
            summary="No measured improvement was found.",
            recommended_candidate_id=None,
            recommended_runtime=run.baseline_config.runtime if run.baseline_config else None,
            quant_recommendation=quant.recommended_quant,
            notes=notes,
        )

    def _finalize(
        self, run: OptimizationRun, started_dt: datetime
    ) -> OptimizationRun:
        """Populate downstream placeholders and run timing, then return the run.

        Schema note: the requested ``submission.status = "not_sent"`` and
        ``share_card.status = "not_generated"`` map onto the existing contract as
        ``submission.state = "not_submitted"`` and ``share_card.status = "none"``
        (the honest opt-off defaults). Telemetry has no ``events_emitted`` field
        and ``qa_report`` stays at its ``pending`` placeholder until QA lands.
        """
        run.submission = SubmissionStatus(state="not_submitted")
        run.share_card = ShareCardArtifact(status="none")
        # telemetry + qa_report remain at their default placeholders.

        end_dt = datetime.now(timezone.utc)
        run.timing.completed_at = end_dt.isoformat()
        run.timing.duration_seconds = round((end_dt - started_dt).total_seconds(), 3)
        return run


# Fixed prompt identity is defined in config; exposed here for future callers
# that need to stamp BenchmarkResult.prompt_version consistently.
DEFAULT_PROMPT_TEXT: str = config.BENCHMARK_PROMPT
