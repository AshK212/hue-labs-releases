"""Measured Optimization Engine (assembly stage).

Milestone 2 introduces a *measured* optimization loop: try several candidate
runtime configurations, benchmark each honestly, and pick a winner. This module
is the entry point for that loop.

At this stage ``create_run`` does two things and nothing more:

1. Uses :class:`CandidateGenerator` to build the baseline + tuned candidate
   configurations for the machine (no Ollama call, no benchmarking).
2. Assembles a valid, JSON-serializable :class:`OptimizationRun` around them,
   attaching *placeholder* benchmark results — ``skipped`` for tuned candidates,
   and a real result for the baseline only when real Milestone 1 data is passed
   in (otherwise a safe ``pending`` placeholder).

No candidate is executed and no metric is fabricated: unmeasured performance
fields stay ``None``. Existing benchmark and optimization flows are untouched.
"""

from __future__ import annotations

import uuid
from typing import Optional, Union

from app import config
from app import schemas as api_schemas  # Milestone 1 API contract
from app.optimization import winner as winner_module
from app.optimization.candidates import CandidateGenerator
from app.optimization.schemas import (
    SCHEMA_VERSION,
    AppInfo,
    BenchmarkResult,
    BenchmarkTiming,
    ModelInfo,
    OptimizationRun,
    RunTiming,
    RuntimeSettings,
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

        # Winner selection is still a placeholder; it falls back to baseline.
        run.winner = winner_module.select_winner(
            baseline_config=run.baseline_config,
            baseline_result=run.baseline_result,
            candidate_configs=run.candidate_configs,
            candidate_results=run.candidate_results,
        )

        return run


# Fixed prompt identity is defined in config; exposed here for future callers
# that need to stamp BenchmarkResult.prompt_version consistently.
DEFAULT_PROMPT_TEXT: str = config.BENCHMARK_PROMPT
