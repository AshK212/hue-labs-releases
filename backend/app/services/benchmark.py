"""Benchmark runner.

We run the fixed benchmark prompt through Ollama and compute tokens/sec from the
**real** timing Ollama reports:

    tokens_per_sec = eval_count / (eval_duration_ns / 1e9)

`eval_count` is the number of tokens generated and `eval_duration` is the time
spent generating them (in nanoseconds). Using Ollama's own measurement avoids
counting model-load or network time and keeps the number honest.
"""

from __future__ import annotations

from datetime import datetime, timezone

from typing import Optional

from app import config
from app.schemas import BenchmarkResult, HardwareInfo
from app.services import ollama_client
from app.services.ollama_client import OllamaError
from app.services.optimization import baseline_options, options_for_profile


async def run_benchmark(
    model: str,
    profile: str,
    hardware: HardwareInfo,
    runtime_options: Optional[dict] = None,
) -> BenchmarkResult:
    # Backward compatible: when no explicit runtime options are given, keep the
    # existing profile-based behavior ("baseline" | "optimized"). When they are
    # given (e.g. from a measured-optimization candidate), start from the shared
    # repeatability settings so runs stay fair and bounded, then overlay them.
    if runtime_options is not None:
        options = {**baseline_options(), **runtime_options}
    else:
        options = options_for_profile(profile, hardware)

    response = await ollama_client.generate(
        model=model,
        prompt=config.BENCHMARK_PROMPT,
        options=options,
    )

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

    # tokens/sec = eval_count / (eval_duration_ns / 1_000_000_000)
    total_seconds = eval_duration_ns / 1e9
    tokens_per_sec = eval_count / total_seconds

    # First-token latency (honest, from Ollama's own timing): time to load the
    # model plus evaluate the prompt, i.e. the wait before the first output token.
    # Left None if Ollama didn't report the durations — never guessed.
    load_ns = int(response.get("load_duration", 0) or 0)
    prompt_eval_ns = int(response.get("prompt_eval_duration", 0) or 0)
    first_token_latency_ms = (
        round((load_ns + prompt_eval_ns) / 1e6, 1) if (load_ns + prompt_eval_ns) > 0 else None
    )

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
        tokens_per_sec=round(tokens_per_sec, 2),
        output_tokens=eval_count,
        total_seconds=round(total_seconds, 2),
        prompt=config.BENCHMARK_PROMPT,
        options=options,
        created_at=datetime.now(timezone.utc).isoformat(),
        first_token_latency_ms=first_token_latency_ms,
        vram_used_mb=vram_used_mb,
        model_quant=model_quant,
    )
