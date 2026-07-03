"""Quantization recommendation for the Measured Optimization Engine (Milestone 2).

Given a candidate's current quant plus *measured* evidence (spill, throughput,
VRAM headroom, model size), recommend whether to keep, downgrade, upgrade, or
switch models. This runs after measurement — it does not benchmark or call Ollama.

Hardware bucketing is **not duplicated here**: we reuse
:func:`app.optimization.candidates.vram_bucket` (re-exported for convenience) and
accept an already-computed ``hardware_bucket`` string.

Everything is deterministic and evidence-based. When data is missing we lower the
confidence or default to "keep" — we never fabricate a recommendation.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Union

# Reuse the canonical VRAM bucket logic — do not recompute buckets here.
from app.optimization.candidates import (  # noqa: F401 (re-exported)
    ALL_VRAM_BUCKETS,
    BUCKET_16GB,
    BUCKET_24GB_PLUS,
    vram_bucket,
)

# --- Quant ladder (smallest / most-compressed → largest / highest-quality) --
QUANT_LADDER: list[str] = ["Q2_K", "Q3_K_M", "Q4_K_M", "Q5_K_M", "Q6_K", "Q8_0", "F16"]
# Map a leading quant tier digit (Q4 → 4) to its representative ladder index, so
# variants like "Q4_0" / "Q4_K_S" resolve to the Q4 rung.
_TIER_TO_INDEX: dict[int, int] = {2: 0, 3: 1, 4: 2, 5: 3, 6: 4, 8: 5}

# --- Thresholds (documented, deterministic) ------------------------------
# Throughput below this fraction of baseline is "poor" (a regression).
_POOR_TPS_FRACTION = 0.75
# Throughput at/above this fraction of baseline is strong enough to consider upgrading.
_EXCELLENT_TPS_FRACTION = 1.0
# VRAM at/above model_size × this factor counts as "substantial unused" headroom.
_UPGRADE_HEADROOM_FACTOR = 2.0
# A model larger than available VRAM × this factor can't be rescued by quantizing.
_MODEL_TOO_LARGE_FACTOR = 2.0


@dataclass
class QuantRecommendation:
    """A quant recommendation with its rationale. Backend-only (not an API type)."""

    recommended_quant: Optional[str]
    confidence: str            # "low" | "medium" | "high"
    reason: str                # always explains WHY
    action: str                # "keep" | "downgrade" | "upgrade" | "change_model"


def _quant_index(current_quant: Optional[str]) -> Optional[int]:
    """Resolve a quant string to its ladder index, or None if unrecognized."""
    if not current_quant:
        return None
    text = current_quant.strip().upper()
    if text in QUANT_LADDER:
        return QUANT_LADDER.index(text)
    if text in ("F16", "FP16", "F32", "FP32", "FLOAT16"):
        return QUANT_LADDER.index("F16")
    if text.startswith("Q") and len(text) > 1 and text[1].isdigit():
        digits = ""
        for char in text[1:]:
            if char.isdigit():
                digits += char
            else:
                break
        tier = int(digits)
        if tier in _TIER_TO_INDEX:
            return _TIER_TO_INDEX[tier]
    return None


def _downgrade_or_change(
    index: Optional[int], current_quant: Optional[str], reason: str
) -> QuantRecommendation:
    """Step one rung down the ladder, or advise a smaller model if already lowest."""
    if index is None:
        return QuantRecommendation(
            recommended_quant=None,
            confidence="low",
            action="downgrade",
            reason=reason + " Current quant is unknown, so no specific target was computed.",
        )
    if index <= 0:
        return QuantRecommendation(
            recommended_quant=None,
            confidence="high",
            action="change_model",
            reason=(
                reason
                + f" Already at the smallest quant ({current_quant}); "
                "switch to a smaller model instead."
            ),
        )
    target = QUANT_LADDER[index - 1]
    return QuantRecommendation(
        recommended_quant=target,
        confidence="high",
        action="downgrade",
        reason=reason + f" Recommend downgrading {current_quant} → {target}.",
    )


def _upgrade_or_keep(
    index: Optional[int], current_quant: Optional[str], reason: str
) -> QuantRecommendation:
    """Step one rung up the ladder, or keep if already at the top / unknown."""
    if index is None:
        return QuantRecommendation(
            recommended_quant=current_quant,
            confidence="low",
            action="keep",
            reason="Current quant is unknown, so an upgrade can't be targeted; keeping as-is.",
        )
    if index >= len(QUANT_LADDER) - 1:
        return QuantRecommendation(
            recommended_quant=current_quant,
            confidence="medium",
            action="keep",
            reason=f"Already at the highest-quality quant ({current_quant}); nothing to upgrade to.",
        )
    target = QUANT_LADDER[index + 1]
    return QuantRecommendation(
        recommended_quant=target,
        confidence="medium",
        action="upgrade",
        reason=reason + f" Recommend upgrading {current_quant} → {target} for better quality.",
    )


def recommend_quant(
    *,
    current_quant: Optional[str] = None,
    hardware_bucket: Optional[str] = None,
    detected_vram_spill: bool = False,
    tokens_per_second: Optional[float] = None,
    baseline_tokens_per_second: Optional[float] = None,
    available_vram_mb: Optional[float] = None,
    model_size_mb: Optional[float] = None,
) -> QuantRecommendation:
    """Recommend a quant action from measured evidence. Deterministic.

    Decision order (first match wins):
      1. Model fundamentally too large to fit at any quant → change_model.
         (Checked first: when a model can't fit, downgrade advice would mislead.)
      2. VRAM spill detected → downgrade (or change_model if already smallest).
      3. Poor measured throughput vs baseline → downgrade.
      4. Strong throughput + substantial unused VRAM → upgrade.
      5. Otherwise → keep.
    """
    index = _quant_index(current_quant)

    # Measured performance ratio (only when both figures are present).
    have_perf = (
        tokens_per_second is not None
        and baseline_tokens_per_second is not None
        and baseline_tokens_per_second > 0
    )
    ratio = (tokens_per_second / baseline_tokens_per_second) if have_perf else None
    poor = have_perf and ratio < _POOR_TPS_FRACTION
    strong = have_perf and ratio >= _EXCELLENT_TPS_FRACTION

    # VRAM situation.
    big_bucket = hardware_bucket in (BUCKET_16GB, BUCKET_24GB_PLUS)
    vram_headroom = (
        available_vram_mb is not None
        and model_size_mb is not None
        and model_size_mb > 0
        and available_vram_mb >= model_size_mb * _UPGRADE_HEADROOM_FACTOR
    )
    substantial_unused = big_bucket or vram_headroom
    too_large = (
        available_vram_mb is not None
        and model_size_mb is not None
        and available_vram_mb > 0
        and model_size_mb > available_vram_mb * _MODEL_TOO_LARGE_FACTOR
    )

    # 1. Fundamentally too large — quantizing won't save it.
    if too_large:
        return QuantRecommendation(
            recommended_quant=None,
            confidence="high",
            action="change_model",
            reason=(
                f"The model (~{model_size_mb:.0f} MB) is far larger than the "
                f"available VRAM (~{available_vram_mb:.0f} MB); no quantization "
                "will make it fit well. Consider a smaller model."
            ),
        )

    # 2. Spill detected — reduce memory footprint.
    if detected_vram_spill:
        return _downgrade_or_change(
            index,
            current_quant,
            "VRAM spill was detected during measurement, so the model is exceeding GPU memory.",
        )

    # 3. Poor measured throughput — likely memory pressure.
    if poor:
        return _downgrade_or_change(
            index,
            current_quant,
            f"Measured throughput was only {ratio * 100:.0f}% of baseline "
            "(a regression), indicating memory pressure.",
        )

    # 4. Strong performance with spare VRAM — spend it on quality.
    if strong and substantial_unused:
        bucket_text = hardware_bucket or "the GPU"
        return _upgrade_or_keep(
            index,
            current_quant,
            f"Measured throughput met or beat baseline and {bucket_text} has spare VRAM.",
        )

    # 5. Stable / insufficient evidence — keep the current quant.
    if have_perf:
        return QuantRecommendation(
            recommended_quant=current_quant,
            confidence="high",
            action="keep",
            reason="Measured throughput is stable and no spill was detected; the current quant is a good fit.",
        )
    return QuantRecommendation(
        recommended_quant=current_quant,
        confidence="low",
        action="keep",
        reason="Not enough measured data to justify a change; keeping the current quant.",
    )
