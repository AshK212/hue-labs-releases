"""Measured Optimization Engine (placeholder shell).

Milestone 2 introduces a *measured* optimization loop: try several candidate
runtime configurations, benchmark each honestly, and pick a winner. This module
is the entry point for that loop.

For this milestone we only stand up the structure. ``create_run`` assembles a
valid, JSON-serializable :class:`OptimizationRun` from data we *already* have
(the Milestone 1 baseline/optimized benchmark results, if provided). It does not
run any search, generate candidates, or fabricate numbers — unmeasured fields
stay ``None``. Existing benchmark and optimization flows are untouched.
"""

from __future__ import annotations

import uuid
from typing import Optional

from app import config
from app import schemas as api_schemas  # Milestone 1 API contract
from app.optimization import winner as winner_module
from app.optimization.schemas import (
    SCHEMA_VERSION,
    AppInfo,
    BenchmarkResult,
    BenchmarkTiming,
    CandidateConfig,
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


def _candidate_from_legacy(
    label: str, model: ModelInfo, legacy: api_schemas.BenchmarkResult
) -> tuple[CandidateConfig, BenchmarkResult]:
    """Build a (config, result) pair from a Milestone 1 BenchmarkResult.

    The numbers are copied straight from the real measured run — nothing here is
    synthesized. Metrics the old schema didn't capture stay ``None``.
    """
    candidate_id = str(uuid.uuid4())
    config_obj = CandidateConfig(
        candidate_id=candidate_id,
        label=label,
        model=model,
        runtime=_runtime_from_options(legacy.options or {}),
    )
    result = BenchmarkResult(
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
    )
    return config_obj, result


class MeasuredOptimizationEngine:
    """Placeholder engine for the measured optimization loop.

    Only ``create_run`` is implemented so far, and it merely *assembles* a run
    from existing data. The candidate search will be added in a later milestone.
    """

    def create_run(
        self,
        model: str,
        hardware: Optional[HardwareInfo] = None,
        app_version: Optional[str] = None,
        baseline_result: Optional[api_schemas.BenchmarkResult] = None,
        optimized_result: Optional[api_schemas.BenchmarkResult] = None,
    ) -> OptimizationRun:
        """Build a valid OptimizationRun from whatever data we already have.

        No search is executed. If Milestone 1 benchmark results are passed in,
        they are reflected into baseline/candidate entries; otherwise the run is
        an empty-but-valid shell ready to be filled by the search phase later.
        """
        model_info = ModelInfo(name=model)

        run = OptimizationRun(
            run_id=str(uuid.uuid4()),
            schema_version=SCHEMA_VERSION,
            app=AppInfo(name="Hue Labs", version=app_version),
            hardware=hardware,
            model=model_info,
            timing=RunTiming(),
        )

        # Reflect an existing baseline run, if available.
        if baseline_result is not None:
            b_config, b_result = _candidate_from_legacy(
                "Baseline (Ollama defaults)", model_info, baseline_result
            )
            b_config.safety.reason = "Ollama's own defaults — reference point."
            run.baseline_config = b_config
            run.baseline_result = b_result

        # Reflect an existing optimized run as the first candidate, if available.
        if optimized_result is not None:
            o_config, o_result = _candidate_from_legacy(
                "Optimized (hardware-aware)", model_info, optimized_result
            )
            run.candidate_configs.append(o_config)
            run.candidate_results.append(o_result)

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
