"""Benchmark runner (methodology v2).

We run the fixed benchmark prompt through Ollama and compute tokens/sec from the
**real** timing Ollama reports:

    tokens_per_sec = eval_count / (eval_duration_ns / 1e9)

`eval_count` is the number of tokens generated and `eval_duration` is the time
spent generating them (in nanoseconds). Using Ollama's own measurement avoids
counting model-load or network time and keeps the number honest.

Methodology v2 removes the cold-vs-warm bias that made results non-reproducible:

  1. Run ``BENCHMARK_WARMUP_RUNS`` generation(s) and DISCARD them, so the model
     is loaded and the GPU/kernels are warm before anything is measured. This is
     applied identically to every benchmark (baseline and optimized alike).
  2. Run ``BENCHMARK_MEASURED_RUNS`` measured generations with identical inputs.
  3. Report the MEDIAN tokens/sec; keep the individual runs and their dispersion
     as diagnostics.

The reported ``output_tokens`` / ``total_seconds`` / ``first_token_latency_ms``
come from the single measured run whose throughput is the median, so every
reported field is internally consistent with one real run (nothing averaged into
a value no run actually produced).

Run counts are fully configuration-driven (see ``app.config``) and never
hardcoded here; callers may still override them explicitly (used by tests).
"""

from __future__ import annotations

import statistics
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Awaitable, Callable, Optional

from app import config
from app.schemas import BenchmarkResult, HardwareInfo
from app.services import ollama_client
from app.services.ollama_client import OllamaError
from app.services.optimization import baseline_options, options_for_profile

# One generation call: (model, prompt, options) -> Ollama's raw JSON dict.
# Injectable so tests can drive the measurement deterministically with no Ollama.
GenerateFn = Callable[[str, str, dict], Awaitable[dict]]


@dataclass
class _Sample:
    """One measured generation, derived only from Ollama's real numbers."""

    tokens_per_sec: float
    output_tokens: int
    total_seconds: float
    first_token_latency_ms: Optional[float]


def _sample_from_response(response: dict) -> _Sample:
    """Turn one Ollama response into a measured sample, or raise on a bad run."""
    eval_count = int(response.get("eval_count", 0) or 0)
    eval_duration_ns = int(response.get("eval_duration", 0) or 0)

    # A healthy run always reports tokens and timing. If it doesn't, treat it as a
    # real failure rather than reporting a misleading 0 tok/s.
    if eval_count <= 0 or eval_duration_ns <= 0:
        raise OllamaError(
            "Ollama finished but reported no generated tokens "
            f"(eval_count={eval_count}, eval_duration={eval_duration_ns}). "
            f"Reason given: {response.get('done_reason', 'unknown')}."
        )

    total_seconds = eval_duration_ns / 1e9
    tokens_per_sec = eval_count / total_seconds

    # First-token latency (honest, from Ollama's own timing). On the measured
    # (warm) runs the model is already loaded, so this reflects warm prompt-eval
    # time. Left None if Ollama didn't report the durations — never guessed.
    load_ns = int(response.get("load_duration", 0) or 0)
    prompt_eval_ns = int(response.get("prompt_eval_duration", 0) or 0)
    first_token_latency_ms = (
        round((load_ns + prompt_eval_ns) / 1e6, 1)
        if (load_ns + prompt_eval_ns) > 0
        else None
    )

    return _Sample(
        tokens_per_sec=tokens_per_sec,
        output_tokens=eval_count,
        total_seconds=total_seconds,
        first_token_latency_ms=first_token_latency_ms,
    )


async def run_benchmark(
    model: str,
    profile: str,
    hardware: HardwareInfo,
    runtime_options: Optional[dict] = None,
    *,
    warmup_runs: Optional[int] = None,
    measured_runs: Optional[int] = None,
    generate_fn: Optional[GenerateFn] = None,
) -> BenchmarkResult:
    # Backward compatible: when no explicit runtime options are given, keep the
    # existing profile-based behavior ("baseline" | "optimized"). When they are
    # given (e.g. from a measured-optimization candidate), start from the shared
    # repeatability settings so runs stay fair and bounded, then overlay them.
    if runtime_options is not None:
        options = {**baseline_options(), **runtime_options}
    else:
        options = options_for_profile(profile, hardware)

    # Counts are config-driven; callers may override (tests). Never hardcoded.
    warmups = config.BENCHMARK_WARMUP_RUNS if warmup_runs is None else max(0, warmup_runs)
    measures = (
        config.BENCHMARK_MEASURED_RUNS if measured_runs is None else max(1, measured_runs)
    )
    generate = generate_fn or ollama_client.generate

    # 1. Warm-up: load the model + warm the GPU. Results are discarded so both
    #    baseline and optimized are measured from the same warm state.
    for _ in range(warmups):
        await generate(model, config.BENCHMARK_PROMPT, options)

    # 2. Measured runs with identical inputs. A bad run raises (same failure
    #    contract as before) so we never report a misleading number.
    samples: list[_Sample] = []
    for _ in range(measures):
        response = await generate(model, config.BENCHMARK_PROMPT, options)
        samples.append(_sample_from_response(response))

    # 3. Median throughput; the representative run (closest to the median) supplies
    #    the consistent output_tokens / total_seconds / latency.
    tps_values = [s.tokens_per_sec for s in samples]
    tps_median = statistics.median(tps_values)
    representative = min(samples, key=lambda s: abs(s.tokens_per_sec - tps_median))
    tps_stddev = statistics.stdev(tps_values) if len(tps_values) > 1 else 0.0

    # VRAM used by the model, best-effort from Ollama /api/ps. Never fails the
    # benchmark — a probe error simply leaves it None (cloud submission skips).
    try:
        vram_used_mb = await ollama_client.used_vram_mb(model)
    except Exception:  # noqa: BLE001 - defensive; local benchmark must never fail on this
        vram_used_mb = None

    # Quantization from Ollama's model details (authoritative), best-effort. Left
    # None when it can't be resolved — never fabricated (cloud submission skips).
    try:
        model_quant = await ollama_client.model_quantization(model)
    except Exception:  # noqa: BLE001 - defensive; local benchmark must never fail on this
        model_quant = None

    return BenchmarkResult(
        model=model,
        profile=profile,
        tokens_per_sec=round(tps_median, 2),
        output_tokens=representative.output_tokens,
        total_seconds=round(representative.total_seconds, 2),
        prompt=config.BENCHMARK_PROMPT,
        options=options,
        created_at=datetime.now(timezone.utc).isoformat(),
        first_token_latency_ms=representative.first_token_latency_ms,
        vram_used_mb=vram_used_mb,
        model_quant=model_quant,
        # --- Methodology v2 diagnostics (local only) ---
        benchmark_method_version=config.BENCHMARK_METHOD_VERSION,
        measured_runs=len(samples),
        warmup_runs=warmups,
        run_tokens_per_sec=[round(v, 2) for v in tps_values],
        tokens_per_sec_stddev=round(tps_stddev, 2),
    )
