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

from app import config
from app.schemas import BenchmarkResult, HardwareInfo
from app.services import ollama_client
from app.services.optimization import options_for_profile


async def run_benchmark(
    model: str, profile: str, hardware: HardwareInfo
) -> BenchmarkResult:
    options = options_for_profile(profile, hardware)

    response = await ollama_client.generate(
        model=model,
        prompt=config.BENCHMARK_PROMPT,
        options=options,
    )

    eval_count = int(response.get("eval_count", 0) or 0)
    eval_duration_ns = int(response.get("eval_duration", 0) or 0)

    if eval_count > 0 and eval_duration_ns > 0:
        tokens_per_sec = eval_count / (eval_duration_ns / 1e9)
        total_seconds = eval_duration_ns / 1e9
    else:
        # Should not happen on a healthy run; we surface zeros rather than guess.
        tokens_per_sec = 0.0
        total_seconds = 0.0

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
