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

    return BenchmarkResult(
        model=model,
        profile=profile,
        tokens_per_sec=round(tokens_per_sec, 2),
        output_tokens=eval_count,
        total_seconds=round(total_seconds, 2),
        prompt=config.BENCHMARK_PROMPT,
        options=options,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
