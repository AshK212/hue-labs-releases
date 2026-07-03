"""Tests for the runtime adapter + benchmark-service runtime_options wiring.

Runs under pytest or standalone:

    python tests/test_adapter.py   (from backend/)

Deterministic — the Ollama HTTP call is monkeypatched with a stub that records
the options it was given and returns fixed timing, so there is no real Ollama
call and no fabricated benchmark numbers.
"""

from __future__ import annotations

import asyncio
import os
import sys

# Make `app` importable when run directly.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.optimization.adapter import (
    candidate_to_ollama_options,
    runtime_to_ollama_options,
)
from app.optimization.executor import BenchmarkExecutor
from app.optimization.schemas import CandidateConfig, ModelInfo, RuntimeSettings
from app.schemas import GpuInfo, HardwareInfo
from app.services import benchmark as m1_benchmark
from app.services import ollama_client
from app.services.optimization import baseline_options

_HW = HardwareInfo(
    os_name="Windows 11", os_version="x", cpu_name="CPU",
    cpu_cores_physical=8, cpu_cores_logical=16,
    memory_total_gb=32.0, memory_available_gb=16.0,
    gpus=[GpuInfo(name="Test GPU", vendor="NVIDIA", vram_gb=12.0)],
)


class _CapturingOllama:
    """Context manager that swaps ollama_client.generate for a recording stub."""

    def __init__(self) -> None:
        self.options: dict | None = None
        self._original = None

    async def _fake_generate(self, model, prompt, options):
        self.options = options
        return {"eval_count": 100, "eval_duration": 2_000_000_000}  # 2s → 50 tok/s

    def __enter__(self) -> "_CapturingOllama":
        self._original = ollama_client.generate
        ollama_client.generate = self._fake_generate  # type: ignore[assignment]
        return self

    def __exit__(self, *exc) -> None:
        ollama_client.generate = self._original  # type: ignore[assignment]


# --- Pure mapping ---------------------------------------------------------

def test_runtime_mapping_all_fields() -> None:
    runtime = RuntimeSettings(
        gpu_layers=999, context_size=4096, batch_size=512, threads=8,
        flash_attention=True, kv_cache_quantization="q8_0",
    )
    assert runtime_to_ollama_options(runtime) == {
        "num_gpu": 999,
        "num_ctx": 4096,
        "num_batch": 512,
        "num_thread": 8,
        "flash_attention": True,
        "kv_cache_type": "q8_0",
    }


def test_runtime_mapping_omits_unset_fields() -> None:
    # Only batch set → only num_batch emitted; None fields are omitted.
    assert runtime_to_ollama_options(RuntimeSettings(batch_size=256)) == {"num_batch": 256}
    # All-default (baseline) runtime → empty dict (use Ollama defaults).
    assert runtime_to_ollama_options(RuntimeSettings()) == {}
    assert runtime_to_ollama_options(None) == {}


def test_candidate_to_ollama_options() -> None:
    candidate = CandidateConfig(
        candidate_id="performance", label="Performance", model=ModelInfo(name="m"),
        runtime=RuntimeSettings(gpu_layers=999, batch_size=1024),
    )
    assert candidate_to_ollama_options(candidate) == {"num_gpu": 999, "num_batch": 1024}


# --- Benchmark service backward compatibility -----------------------------

def test_profile_path_still_succeeds() -> None:
    # Existing signature (no runtime_options) → profile-based options, unchanged.
    with _CapturingOllama() as cap:
        result = asyncio.run(m1_benchmark.run_benchmark("m", "baseline", _HW))
    assert cap.options == baseline_options()  # exactly the baseline profile options
    assert result.tokens_per_sec == 50.0
    assert result.profile == "baseline"


def test_runtime_options_path_merges_repeatability() -> None:
    with _CapturingOllama() as cap:
        asyncio.run(
            m1_benchmark.run_benchmark(
                "m", "custom", _HW, runtime_options={"num_gpu": 999, "num_batch": 512}
            )
        )
    # Repeatability defaults are preserved and the explicit options overlaid.
    expected = {**baseline_options(), "num_gpu": 999, "num_batch": 512}
    assert cap.options == expected


# --- Executor passes candidate settings through ---------------------------

def test_executor_passes_candidate_runtime_settings() -> None:
    candidate = CandidateConfig(
        candidate_id="performance", label="Performance", model=ModelInfo(name="m"),
        runtime=RuntimeSettings(gpu_layers=999, batch_size=512, context_size=4096),
    )
    executor = BenchmarkExecutor()  # default runner → real M1 service (stubbed Ollama)
    with _CapturingOllama() as cap:
        result = asyncio.run(executor.execute_candidate(candidate, hardware=_HW))

    # The candidate's runtime settings reached Ollama via the merged options.
    assert cap.options["num_gpu"] == 999
    assert cap.options["num_batch"] == 512
    assert cap.options["num_ctx"] == 4096
    # Repeatability settings still present.
    assert cap.options["num_predict"] == baseline_options()["num_predict"]
    assert result.status == "success"
    assert result.tokens_per_sec == 50.0


def test_executor_baseline_candidate_uses_defaults() -> None:
    # Baseline candidate has empty runtime → options == baseline (Ollama defaults).
    candidate = CandidateConfig(
        candidate_id="baseline", label="Baseline", model=ModelInfo(name="m"),
        runtime=RuntimeSettings(),
    )
    executor = BenchmarkExecutor()
    with _CapturingOllama() as cap:
        asyncio.run(executor.execute_candidate(candidate, hardware=_HW))
    assert cap.options == baseline_options()


def _run_all() -> None:
    tests = [
        test_runtime_mapping_all_fields,
        test_runtime_mapping_omits_unset_fields,
        test_candidate_to_ollama_options,
        test_profile_path_still_succeeds,
        test_runtime_options_path_merges_repeatability,
        test_executor_passes_candidate_runtime_settings,
        test_executor_baseline_candidate_uses_defaults,
    ]
    for test in tests:
        test()
        print(f"  ok  {test.__name__}")
    print(f"\n{len(tests)} passed")


if __name__ == "__main__":
    _run_all()
