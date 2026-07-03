"""Optimization presets for candidate generation (Milestone 2).

A *preset* is a reusable set of **relative tuning goals** — "offload everything
to the GPU", "double the batch", "leave more VRAM headroom" — rather than a fixed
table of hardware-specific numbers. The candidate generator (`candidates.py`)
resolves a preset against the machine's baseline runtime + hardware bucket into a
concrete :class:`RuntimeSettings`.

Keeping goals relative (scales + flags) is deliberate: the same preset behaves
sensibly on an 8 GB laptop GPU and a 24 GB desktop card without a hardcoded
per-GPU config. Anything that *must* be absolute (a batch floor, a context cap)
is applied later in the resolver, not baked in here.

This module has no dependency on Pydantic or Ollama — it is pure configuration.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

# Strategy keys the generator accepts (future-proofing hook). Each is also a
# preset key so a strategy can bias ordering toward its namesake preset.
SUPPORTED_STRATEGIES: tuple[str, ...] = ("balanced", "performance", "memory_safe")
DEFAULT_STRATEGY: str = "balanced"


@dataclass(frozen=True)
class OptimizationPreset:
    """A reusable, hardware-relative tuning goal.

    Fields are expressed relatively where possible:

    * ``offload_all_gpu_layers`` — offload as many layers as fit (Ollama caps the
      value to what actually fits VRAM) vs. leave the baseline offload alone.
    * ``batch_scale`` / ``context_scale`` — multipliers on the baseline value
      (an anchor default is used when the baseline leaves it at Ollama's default).
    * ``vram_headroom`` — fraction of VRAM to keep *free* as a safety margin; the
      only "hardware-aware" knob, and still expressed as a ratio, not a number.

    ``flash_attention`` / ``kv_cache_quantization`` are runtime flags applied as
    the goal describes.
    """

    key: str
    label: str
    description: str

    # Relative runtime goals.
    offload_all_gpu_layers: bool
    batch_scale: float
    context_scale: float
    flash_attention: Optional[bool]
    kv_cache_quantization: Optional[str]
    prefer_physical_threads: bool

    # Safety goal: fraction of VRAM to leave free (0.0–1.0). Larger = safer.
    vram_headroom: float


# The three presets. Differences are meaningful and safe by construction:
#   Balanced     — modest, GPU-friendly defaults; a sensible middle ground.
#   Performance  — push throughput: offload all, larger batch, minimal headroom.
#   Memory Safe  — minimize VRAM/spill risk: smaller batch/context, quantized KV
#                  cache, don't force offload, generous headroom.
PRESETS: dict[str, OptimizationPreset] = {
    "balanced": OptimizationPreset(
        key="balanced",
        label="Balanced",
        description=(
            "A middle-ground profile: offload to the GPU and enable flash "
            "attention, but keep batch and context near the baseline."
        ),
        offload_all_gpu_layers=True,
        batch_scale=1.0,
        context_scale=1.0,
        flash_attention=True,
        kv_cache_quantization=None,
        prefer_physical_threads=True,
        vram_headroom=0.15,
    ),
    "performance": OptimizationPreset(
        key="performance",
        label="Performance",
        description=(
            "Throughput-first: offload all layers that fit, enlarge the prompt "
            "batch, and keep VRAM headroom small. Best on roomier GPUs."
        ),
        offload_all_gpu_layers=True,
        batch_scale=2.0,
        context_scale=1.0,
        flash_attention=True,
        kv_cache_quantization=None,
        prefer_physical_threads=True,
        vram_headroom=0.10,
    ),
    "memory_safe": OptimizationPreset(
        key="memory_safe",
        label="Memory Safe",
        description=(
            "Spill-averse: smaller batch and context, quantized KV cache, and a "
            "generous VRAM margin. Does not force full-layer offload."
        ),
        offload_all_gpu_layers=False,
        batch_scale=0.5,
        context_scale=0.5,
        flash_attention=True,
        kv_cache_quantization="q8_0",
        prefer_physical_threads=False,
        vram_headroom=0.30,
    ),
}


# When a strategy is chosen, try presets in this order (first that fits the
# hardware bucket wins the earliest, most-prominent slot after the baseline).
STRATEGY_PRESET_ORDER: dict[str, list[str]] = {
    "balanced": ["balanced", "performance", "memory_safe"],
    "performance": ["performance", "balanced", "memory_safe"],
    "memory_safe": ["memory_safe", "balanced", "performance"],
}


def normalize_strategy(strategy: Optional[str]) -> str:
    """Coerce an arbitrary strategy string to a supported one (safe default)."""
    if strategy in SUPPORTED_STRATEGIES:
        return strategy  # type: ignore[return-value]
    return DEFAULT_STRATEGY
