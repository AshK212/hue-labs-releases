"""Model recommendation.

For Milestone 1 we deliberately support a small, curated set of well-behaved
Ollama models and pick between them based on available memory. The reasoning is
returned in plain language so the UI can show *why* a model was chosen.

The tokens/sec ranges are rough, machine-dependent estimates shown only to set
expectations. The real number always comes from the benchmark, never from here.
"""

from __future__ import annotations

from app.schemas import (
    HardwareInfo,
    ModelRecommendation,
    OllamaStatus,
    RecommendationResponse,
)

# Curated catalog for the MVP. Keep this tiny and trustworthy.
_CATALOG = {
    "llama3.2:3b": {
        "display_name": "Llama 3.2 (3B)",
        "min_memory_gb": 8,
        "download_size_gb": 2.0,
        "est_cpu": "12–30 tok/s",
        "est_gpu": "40–90 tok/s",
        "blurb": "a small, fast, capable everyday model",
    },
    "llama3.2:1b": {
        "display_name": "Llama 3.2 (1B)",
        "min_memory_gb": 4,
        "download_size_gb": 1.3,
        "est_cpu": "25–60 tok/s",
        "est_gpu": "80–150 tok/s",
        "blurb": "an ultra-light model for modest machines",
    },
}


def _installed_names(status: OllamaStatus) -> set[str]:
    names: set[str] = set()
    for m in status.models:
        names.add(m.name)
        names.add(m.name.split(":")[0])
    return names


def _to_recommendation(
    tag: str, hardware: HardwareInfo, installed: set[str]
) -> ModelRecommendation:
    spec = _CATALOG[tag]
    has_gpu = bool(hardware.gpus) or hardware.is_apple_silicon
    est = spec["est_gpu"] if has_gpu else spec["est_cpu"]

    if has_gpu:
        reason = (
            f"Your machine has {hardware.memory_total_gb} GB of memory and a GPU, "
            f"so {spec['display_name']} — {spec['blurb']} — should run smoothly."
        )
    else:
        reason = (
            f"With {hardware.memory_total_gb} GB of memory and CPU-only inference, "
            f"{spec['display_name']} — {spec['blurb']} — is a comfortable, reliable fit."
        )

    return ModelRecommendation(
        model=tag,
        display_name=spec["display_name"],
        reason=reason,
        estimated_tokens_per_sec=est,
        download_size_gb=spec["download_size_gb"],
        already_installed=(
            tag in installed or tag.split(":")[0] in installed
        ),
    )


def recommend(hardware: HardwareInfo, status: OllamaStatus) -> RecommendationResponse:
    installed = _installed_names(status)

    # Simple, honest rule: 8 GB+ -> 3B as primary; otherwise the 1B model.
    if hardware.memory_total_gb >= 8:
        primary_tag, alt_tag = "llama3.2:3b", "llama3.2:1b"
    else:
        primary_tag, alt_tag = "llama3.2:1b", "llama3.2:3b"

    return RecommendationResponse(
        primary=_to_recommendation(primary_tag, hardware, installed),
        alternatives=[_to_recommendation(alt_tag, hardware, installed)],
    )
