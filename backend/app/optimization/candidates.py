"""Candidate generation for the Measured Optimization Engine (Milestone 2).

Turns a machine's hardware + selected model + baseline runtime into a small,
safe set of :class:`CandidateConfig`s that a later step will benchmark. This
layer only *describes* configurations — it does **not** benchmark, call Ollama,
or select a winner, and it does not touch the existing optimization service.

Guarantees:

* The baseline is always the first candidate.
* Between 2 and 3 additional candidates are produced (≤ 4 total).
* Candidate aggressiveness is gated by a coarse VRAM bucket so we never propose a
  spill-prone config on a small GPU.
* All runtime values are bounded (batch/context caps) so a full session of ≤ 4
  short benchmark runs stays well under ~10 minutes on a 12 GB GPU.

Presets live in :mod:`app.optimization.presets`; this module resolves them into
concrete, hardware-relative runtime settings.
"""

from __future__ import annotations

from typing import Optional, Union

from app.optimization.presets import (
    PRESETS,
    STRATEGY_PRESET_ORDER,
    OptimizationPreset,
    normalize_strategy,
)
from app.optimization.schemas import (
    CandidateConfig,
    ModelInfo,
    RuntimeSettings,
    SafetyInfo,
    SpillRisk,
)
from app.schemas import HardwareInfo

# --- Hardware (VRAM) buckets ----------------------------------------------
# Candidate-generation buckets, finer than quant.py's (which serves a different
# purpose). Based on the primary GPU's VRAM; see vram_bucket() for the fallback.
BUCKET_UNDER_8GB = "under_8gb"
BUCKET_8GB = "8gb"
BUCKET_12GB = "12gb"
BUCKET_16GB = "16gb"
BUCKET_24GB_PLUS = "24gb_plus"

ALL_VRAM_BUCKETS: list[str] = [
    BUCKET_UNDER_8GB,
    BUCKET_8GB,
    BUCKET_12GB,
    BUCKET_16GB,
    BUCKET_24GB_PLUS,
]

# Which presets each bucket is allowed to propose. Small buckets drop the
# throughput-hungry "performance" preset to keep runs safe and quick.
_BUCKET_ALLOWED_PRESETS: dict[str, set[str]] = {
    BUCKET_UNDER_8GB: {"balanced", "memory_safe"},
    BUCKET_8GB: {"balanced", "memory_safe"},
    BUCKET_12GB: {"balanced", "performance", "memory_safe"},
    BUCKET_16GB: {"balanced", "performance", "memory_safe"},
    BUCKET_24GB_PLUS: {"balanced", "performance", "memory_safe"},
}

# Hard cap on *additional* candidates (baseline excluded) → ≤ 4 total.
MAX_ADDITIONAL_CANDIDATES = 3

# Anchors used only when the baseline leaves a value at Ollama's default (None),
# so a relative scale still has something concrete to scale from.
_DEFAULT_BATCH_ANCHOR = 512
_DEFAULT_CONTEXT_ANCHOR = 4096

# Absolute safety bounds so no candidate is pathologically slow or tiny. These
# keep a ≤ 4-run session comfortably under ~10 minutes on a 12 GB GPU.
_MIN_BATCH, _MAX_BATCH = 64, 1024
_MIN_CONTEXT, _MAX_CONTEXT = 1024, 8192


def _effective_vram_gb(hardware: Optional[HardwareInfo]) -> Optional[float]:
    """Best-guess usable VRAM in GB, or None when it can't be determined.

    Uses the largest reported GPU VRAM; for Apple Silicon (unified memory, where
    dedicated VRAM isn't reported) falls back to total system memory as a proxy.
    Never guesses a number for a plain CPU-only or unknown GPU.
    """
    if hardware is None:
        return None
    known = [g.vram_gb for g in hardware.gpus if g.vram_gb]
    if known:
        return max(known)
    if hardware.is_apple_silicon:
        return hardware.memory_total_gb
    return None


def vram_bucket(hardware: Optional[HardwareInfo]) -> str:
    """Classify a machine into a coarse VRAM bucket.

    Fallback: when there is no dedicated GPU or VRAM can't be read, we return the
    most conservative bucket (``under_8gb``) rather than guessing a capacity —
    the machine still gets the safe Balanced + Memory Safe candidates.
    """
    vram = _effective_vram_gb(hardware)
    if vram is None:
        return BUCKET_UNDER_8GB
    if vram >= 24:
        return BUCKET_24GB_PLUS
    if vram >= 16:
        return BUCKET_16GB
    if vram >= 12:
        return BUCKET_12GB
    if vram >= 8:
        return BUCKET_8GB
    return BUCKET_UNDER_8GB


def _has_gpu(hardware: Optional[HardwareInfo]) -> bool:
    if hardware is None:
        return False
    return bool(hardware.gpus) or hardware.is_apple_silicon


def _scale(
    base: Optional[int], scale: float, anchor: int, lo: int, hi: int
) -> Optional[int]:
    """Apply a relative scale to a baseline runtime value, bounded to [lo, hi].

    A scale of exactly 1.0 leaves the baseline untouched (``None`` stays ``None``
    so Ollama keeps its own default). Otherwise we scale from the baseline, or
    from ``anchor`` when the baseline left the value unset.
    """
    if scale == 1.0:
        return base
    reference = base if base is not None else anchor
    return max(lo, min(hi, int(round(reference * scale))))


def _vram_budget_mb(
    hardware: Optional[HardwareInfo], headroom: float
) -> Optional[float]:
    """VRAM the candidate is allowed to use, in MB, given a headroom fraction."""
    vram_gb = _effective_vram_gb(hardware)
    if vram_gb is None:
        return None
    return round(vram_gb * 1024 * (1.0 - headroom), 1)


def _spill_risk(preset_key: str, bucket: str) -> SpillRisk:
    """Qualitative spill risk for a preset on a given bucket (no measurement)."""
    if preset_key == "memory_safe":
        return "low"
    small = bucket in (BUCKET_UNDER_8GB, BUCKET_8GB)
    if preset_key == "performance":
        if small:
            return "high"
        if bucket == BUCKET_12GB:
            return "medium"
        return "low"
    # balanced
    return "medium" if small else "low"


def _resolve_runtime(
    preset: OptimizationPreset,
    baseline: RuntimeSettings,
    hardware: Optional[HardwareInfo],
) -> RuntimeSettings:
    """Resolve a preset's relative goals into concrete RuntimeSettings."""
    has_gpu = _has_gpu(hardware)

    gpu_layers = baseline.gpu_layers
    if has_gpu and preset.offload_all_gpu_layers:
        # 999 = "offload every layer that fits"; Ollama caps it to real VRAM.
        gpu_layers = 999

    threads = baseline.threads
    if not has_gpu and preset.prefer_physical_threads and hardware is not None:
        threads = max(hardware.cpu_cores_physical or 0, 1)

    return RuntimeSettings(
        gpu_layers=gpu_layers,
        context_size=_scale(
            baseline.context_size, preset.context_scale,
            _DEFAULT_CONTEXT_ANCHOR, _MIN_CONTEXT, _MAX_CONTEXT,
        ),
        batch_size=_scale(
            baseline.batch_size, preset.batch_scale,
            _DEFAULT_BATCH_ANCHOR, _MIN_BATCH, _MAX_BATCH,
        ),
        threads=threads,
        # Flash attention is a GPU feature — only propose it when there's a GPU.
        flash_attention=preset.flash_attention if has_gpu else baseline.flash_attention,
        # KV-cache quantization is a general memory setting; apply as the goal says.
        kv_cache_quantization=preset.kv_cache_quantization,
    )


def _resolve_safety(
    preset: OptimizationPreset, hardware: Optional[HardwareInfo], bucket: str
) -> SafetyInfo:
    """Build the pre-run safety estimate for a candidate.

    ``estimated_vram_mb`` stays ``None`` on purpose: an honest estimate needs the
    model's layer sizes, which we won't fetch here (no Ollama call). We provide a
    real ``max_allowed_vram_mb`` budget and a qualitative ``spill_risk`` instead.
    """
    risk = _spill_risk(preset.key, bucket)
    budget = _vram_budget_mb(hardware, preset.vram_headroom)
    reason = (
        f"{preset.label} preset on a '{bucket}' GPU budget; keeps "
        f"{int(preset.vram_headroom * 100)}% VRAM headroom. Estimated spill "
        f"risk: {risk}."
    )
    return SafetyInfo(
        estimated_vram_mb=None,
        max_allowed_vram_mb=budget,
        spill_risk=risk,
        reason=reason,
    )


def _build_candidate(
    preset: OptimizationPreset,
    model: ModelInfo,
    baseline_runtime: RuntimeSettings,
    hardware: Optional[HardwareInfo],
    bucket: str,
    strategy: str,
) -> CandidateConfig:
    return CandidateConfig(
        candidate_id=preset.key,
        label=preset.label,
        model=model,
        runtime=_resolve_runtime(preset, baseline_runtime, hardware),
        safety=_resolve_safety(preset, hardware, bucket),
        metadata={
            "preset": preset.key,
            "strategy": strategy,
            "vram_bucket": bucket,
            "source": "candidate_generator",
            "notes": preset.description,
        },
    )


class CandidateGenerator:
    """Builds a safe, bounded set of candidate configurations to benchmark.

    Pure/stateless: no Ollama, no benchmarking, no winner selection. Call
    :meth:`generate` with the machine's hardware, the selected model, and the
    baseline runtime; get back ``[baseline, *tuned candidates]`` (≤ 4 total).
    """

    def generate(
        self,
        hardware: Optional[HardwareInfo],
        model: Union[str, ModelInfo],
        baseline_runtime: Optional[RuntimeSettings] = None,
        strategy: str = "balanced",
    ) -> list[CandidateConfig]:
        """Generate candidates for one optimization session.

        Args:
            hardware: detected machine info (may be ``None`` → conservative path).
            model: the selected model tag or a full :class:`ModelInfo`.
            baseline_runtime: the machine's current runtime (Ollama defaults if
                ``None``); reflected verbatim as the first candidate.
            strategy: ``"balanced" | "performance" | "memory_safe"`` — biases
                which preset takes the earliest slot. Unknown values fall back to
                ``"balanced"``.

        Returns:
            ``[baseline, *tuned]`` with 2–3 tuned candidates (≤ 4 total).
        """
        model_info = ModelInfo(name=model) if isinstance(model, str) else model
        baseline_runtime = baseline_runtime or RuntimeSettings()
        strategy = normalize_strategy(strategy)
        bucket = vram_bucket(hardware)

        # Baseline is always first — the honest, untuned reference point.
        baseline_candidate = CandidateConfig(
            candidate_id="baseline",
            label="Baseline",
            model=model_info,
            runtime=baseline_runtime,
            safety=SafetyInfo(
                estimated_vram_mb=None,
                max_allowed_vram_mb=_vram_budget_mb(hardware, 0.15),
                spill_risk="unknown",
                reason="Provided baseline runtime (Ollama defaults) — untuned reference.",
            ),
            metadata={
                "preset": "baseline",
                "strategy": strategy,
                "vram_bucket": bucket,
                "source": "candidate_generator",
                "is_baseline": True,
            },
        )

        # Pick tuned presets: strategy sets the order, the bucket filters what's
        # allowed, capped at MAX_ADDITIONAL_CANDIDATES.
        allowed = _BUCKET_ALLOWED_PRESETS[bucket]
        ordered_keys = STRATEGY_PRESET_ORDER[strategy]
        selected_keys = [k for k in ordered_keys if k in allowed][
            :MAX_ADDITIONAL_CANDIDATES
        ]

        tuned = [
            _build_candidate(
                PRESETS[key], model_info, baseline_runtime, hardware, bucket, strategy
            )
            for key in selected_keys
        ]

        return [baseline_candidate, *tuned]
