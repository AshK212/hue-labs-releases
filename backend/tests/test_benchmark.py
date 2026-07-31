"""Tests for the Milestone-1 benchmark service (methodology v2).

Runs under pytest or standalone:

    python tests/test_benchmark.py   (from backend/)

Deterministic — an injected ``generate_fn`` supplies scripted Ollama responses,
and the VRAM/quant probes are stubbed, so there is no Ollama call and no real
network access. Run counts are read from config / passed explicitly; nothing is
hardcoded to "3".
"""

from __future__ import annotations

import asyncio
import os
import sys
from contextlib import contextmanager
from unittest import mock

# Make `app` importable when run directly.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import config
from app.schemas import GpuInfo, HardwareInfo
from app.services import benchmark, ollama_client
from app.services.ollama_client import OllamaError

_HW = HardwareInfo(
    os_name="Windows 11", os_version="x", cpu_name="CPU",
    cpu_cores_physical=8, cpu_cores_logical=16,
    memory_total_gb=32.0, memory_available_gb=16.0,
    gpus=[GpuInfo(name="Test GPU", vendor="NVIDIA", vram_gb=12.0)],
)


def _resp(tps: float) -> dict:
    """A scripted Ollama response whose eval-based throughput equals `tps`.

    eval_duration is a fixed 1 second (1e9 ns), so tokens_per_sec == eval_count.
    """
    return {
        "eval_count": int(tps),
        "eval_duration": 1_000_000_000,
        "load_duration": 0,
        "prompt_eval_duration": 500_000,  # 0.5 ms → non-null first-token latency
    }


class _ScriptedGenerate:
    """Async generate_fn that returns queued responses and counts calls."""

    def __init__(self, responses: list[dict]) -> None:
        self._responses = list(responses)
        self.calls = 0

    async def __call__(self, model: str, prompt: str, options: dict) -> dict:
        self.calls += 1
        return self._responses.pop(0)


@contextmanager
def _stubbed_probes():
    """Scoped no-op stubs for the network probes (no Ollama needed).

    Uses ``mock.patch.object`` so the real ``ollama_client`` attributes are ALWAYS
    restored on exit — even if the body raises — preventing the stubs from leaking
    into other tests when the whole suite runs in one process.
    """
    async def _no_vram(_model):  # noqa: ANN001
        return None

    async def _no_quant(_model):  # noqa: ANN001
        return None

    with mock.patch.object(ollama_client, "used_vram_mb", _no_vram), \
            mock.patch.object(ollama_client, "model_quantization", _no_quant):
        yield


def test_warmup_discarded_and_median_reported() -> None:
    # 1 warm-up (a wild 999 that must be discarded) + 3 measured (10, 30, 20).
    gen = _ScriptedGenerate([_resp(999), _resp(10), _resp(30), _resp(20)])
    with _stubbed_probes():
        result = asyncio.run(
            benchmark.run_benchmark(
                "llama3.2:3b", "baseline", _HW,
                warmup_runs=1, measured_runs=3, generate_fn=gen,
            )
        )
    # Exactly warmup + measured generations were issued.
    assert gen.calls == 4
    # Median of [10, 30, 20] is 20 — the warm-up 999 is not counted.
    assert result.tokens_per_sec == 20.0
    assert result.run_tokens_per_sec == [10.0, 30.0, 20.0]
    assert result.measured_runs == 3
    assert result.warmup_runs == 1
    # Representative run (closest to median) supplies the consistent fields.
    assert result.output_tokens == 20
    assert result.total_seconds == 1.0
    # Diagnostic dispersion is present (stdev of [10,30,20] == 10.0), not a CI.
    assert result.tokens_per_sec_stddev == 10.0
    assert result.benchmark_method_version == config.BENCHMARK_METHOD_VERSION


def test_counts_are_configurable_not_hardcoded() -> None:
    # 0 warm-ups + 5 measured runs → 5 calls, median of five values.
    gen = _ScriptedGenerate([_resp(v) for v in (10, 12, 14, 16, 18)])
    with _stubbed_probes():
        result = asyncio.run(
            benchmark.run_benchmark(
                "m", "baseline", _HW,
                warmup_runs=0, measured_runs=5, generate_fn=gen,
            )
        )
    assert gen.calls == 5
    assert result.warmup_runs == 0
    assert result.measured_runs == 5
    assert result.tokens_per_sec == 14.0  # median of 10,12,14,16,18


def test_defaults_come_from_config() -> None:
    total = config.BENCHMARK_WARMUP_RUNS + config.BENCHMARK_MEASURED_RUNS
    gen = _ScriptedGenerate([_resp(20) for _ in range(total)])
    with _stubbed_probes():
        result = asyncio.run(
            benchmark.run_benchmark("m", "baseline", _HW, generate_fn=gen)
        )
    assert gen.calls == total
    assert result.measured_runs == config.BENCHMARK_MEASURED_RUNS
    assert result.warmup_runs == config.BENCHMARK_WARMUP_RUNS


def test_bad_measured_run_raises() -> None:
    # Warm-up ok, then a measured run reports zero tokens → OllamaError.
    gen = _ScriptedGenerate([_resp(20), {"eval_count": 0, "eval_duration": 0}])
    raised = False
    with _stubbed_probes():
        try:
            asyncio.run(
                benchmark.run_benchmark(
                    "m", "baseline", _HW, warmup_runs=1, measured_runs=1, generate_fn=gen
                )
            )
        except OllamaError:
            raised = True
    assert raised, "a measured run with no tokens must raise OllamaError"


def _run_all() -> None:
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            print(f"ok  {name}")


if __name__ == "__main__":
    _run_all()
    print("all benchmark tests passed")
