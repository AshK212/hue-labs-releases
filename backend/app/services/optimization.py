"""Safe, honest optimization profiles for Ollama.

What we tune are **real Ollama runtime options** passed in the `options` field of
the `/api/generate` request. Nothing here fakes a result — we only change how the
model is run, then the benchmark measures the actual effect on this machine.

Two profiles:

* "baseline"  — Ollama's own defaults. We only bound the number of generated
                tokens so the run is repeatable. This is what an untuned user gets.
* "optimized" — a hardware-aware profile that adjusts thread count, batch size,
                and (when a GPU is present) layer offloading.

The optimization is conservative on purpose. Modest, *measured* gains are the goal.
"""

from __future__ import annotations

from app import config
from app.schemas import HardwareInfo, OptimizationProfile


def baseline_options() -> dict:
    """Ollama defaults, plus a fixed output length for a fair, repeatable run."""
    return {
        "num_predict": config.BENCHMARK_NUM_PREDICT,
        # Deterministic decoding so token counts are comparable run-to-run.
        "temperature": 0,
        "seed": 42,
    }


def build_optimized_profile(hardware: HardwareInfo) -> OptimizationProfile:
    """Construct a hardware-aware optimized profile."""
    options = baseline_options().copy()
    changed: list[str] = []

    has_gpu = bool(hardware.gpus) or hardware.is_apple_silicon

    if has_gpu:
        # Ask Ollama to offload as many layers as possible to the GPU. The value
        # is capped internally by Ollama to the layers that actually fit in VRAM,
        # so this is safe even on small GPUs.
        options["num_gpu"] = 999
        changed.append("Offload model layers to the GPU (num_gpu)")
    else:
        # CPU path: match threads to *physical* cores. Oversubscribing logical
        # (hyperthreaded) cores often hurts throughput, so pinning to physical
        # cores is a safe, commonly-beneficial adjustment.
        physical = max(hardware.cpu_cores_physical or 0, 1)
        options["num_thread"] = physical
        changed.append(f"Match CPU threads to physical cores (num_thread={physical})")

    # Larger prompt batch improves prompt processing throughput at a small,
    # bounded memory cost. Safe on any machine with >= 8 GB RAM.
    if hardware.memory_total_gb >= 8:
        options["num_batch"] = 512
        changed.append("Increase prompt batch size (num_batch=512)")

    description = (
        "A conservative performance profile that adjusts how the model runs on "
        "your hardware. These are standard Ollama runtime settings — the app then "
        "measures the real effect, so any improvement shown is honest."
    )

    return OptimizationProfile(
        name="optimized",
        label="Optimized for your machine",
        description=description,
        options=options,
        changed_settings=changed,
    )


def options_for_profile(profile_name: str, hardware: HardwareInfo) -> dict:
    """Return the runtime options the benchmark should use for a given profile."""
    if profile_name == "optimized":
        return build_optimized_profile(hardware).options
    return baseline_options()
