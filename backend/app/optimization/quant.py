"""Quantization recommendation (placeholder).

Given the machine's GPU memory, some model quantizations fit comfortably in VRAM
and others force a spill. This module will eventually map hardware to a sensible
quant suggestion (e.g. prefer Q4 on 8 GB cards, allow Q6/Q8 on 16 GB+).

For now it's a contract-only placeholder: the GPU memory buckets are defined so
the schema and frontend share one vocabulary, but no recommendation logic runs.
"""

from __future__ import annotations

from typing import Optional

from app.schemas import HardwareInfo

# --- GPU memory buckets ---------------------------------------------------
# Coarse tiers used to pick a quant. Kept intentionally simple for the MVP.
BUCKET_8GB = "8gb"
BUCKET_12GB = "12gb"
BUCKET_16GB_PLUS = "16gb_plus"
BUCKET_UNKNOWN = "unknown"

ALL_GPU_BUCKETS: list[str] = [
    BUCKET_8GB,
    BUCKET_12GB,
    BUCKET_16GB_PLUS,
    BUCKET_UNKNOWN,
]


def gpu_memory_bucket(hardware: Optional[HardwareInfo]) -> str:
    """Classify the machine's primary GPU VRAM into a coarse bucket.

    Returns BUCKET_UNKNOWN when there is no GPU or VRAM can't be read — we never
    guess a capacity we didn't detect.
    """
    if hardware is None or not hardware.gpus:
        return BUCKET_UNKNOWN

    vram_values = [g.vram_gb for g in hardware.gpus if g.vram_gb is not None]
    if not vram_values:
        return BUCKET_UNKNOWN

    vram_gb = max(vram_values)
    if vram_gb >= 16:
        return BUCKET_16GB_PLUS
    if vram_gb >= 12:
        return BUCKET_12GB
    if vram_gb >= 8:
        return BUCKET_8GB
    # Below 8 GB we still bucket as "8gb" (the smallest concrete tier) so callers
    # get the most conservative quant advice rather than "unknown".
    return BUCKET_8GB


def recommend_quant(
    hardware: Optional[HardwareInfo] = None,
    model_name: Optional[str] = None,
) -> Optional[str]:
    """Recommend a quantization for this hardware/model.

    Placeholder: returns ``None`` (no recommendation) for now.

    TODO (Milestone 2): map gpu_memory_bucket(hardware) + model size to a quant,
    e.g. 8gb -> "Q4_K_M", 12gb -> "Q5_K_M", 16gb_plus -> "Q6_K"/"Q8_0",
    unknown -> None. Feed the result into OptimizationRecommendation.
    """
    return None
