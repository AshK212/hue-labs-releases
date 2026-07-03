"""Runtime adapter for the Measured Optimization Engine (Milestone 2).

Converts a candidate's :class:`RuntimeSettings` into the Ollama ``options`` dict
that the Milestone 1 benchmark service already understands. This is a pure
translation layer — **no benchmarking logic lives here**.

Mapping (RuntimeSettings field → Ollama option key):

    gpu_layers            → num_gpu
    context_size          → num_ctx
    batch_size            → num_batch
    threads               → num_thread
    flash_attention       → flash_attention   (advisory*)
    kv_cache_quantization → kv_cache_type      (advisory*)

Only fields that are set (not ``None``) are emitted, so an all-default baseline
candidate produces ``{}`` — i.e. "let Ollama use its own defaults". Nothing is
fabricated; we never invent a value the candidate didn't specify.

*Advisory: ``num_gpu`` / ``num_ctx`` / ``num_batch`` / ``num_thread`` are
first-class ``/api/generate`` options. Flash attention and KV-cache quantization
are configured at the server level in current Ollama, so they are passed through
under descriptive keys and are simply ignored by Ollama if unsupported — carrying
them keeps the contract complete and forward-compatible without affecting current
runs.
"""

from __future__ import annotations

from typing import Optional

from app.optimization.schemas import CandidateConfig, RuntimeSettings


def runtime_to_ollama_options(runtime: Optional[RuntimeSettings]) -> dict:
    """Translate RuntimeSettings into an Ollama ``options`` dict (set fields only)."""
    options: dict = {}
    if runtime is None:
        return options

    if runtime.gpu_layers is not None:
        options["num_gpu"] = runtime.gpu_layers
    if runtime.context_size is not None:
        options["num_ctx"] = runtime.context_size
    if runtime.batch_size is not None:
        options["num_batch"] = runtime.batch_size
    if runtime.threads is not None:
        options["num_thread"] = runtime.threads
    if runtime.flash_attention is not None:
        options["flash_attention"] = runtime.flash_attention
    if runtime.kv_cache_quantization is not None:
        options["kv_cache_type"] = runtime.kv_cache_quantization

    return options


def candidate_to_ollama_options(candidate: CandidateConfig) -> dict:
    """Convenience: translate a candidate's runtime settings into Ollama options."""
    return runtime_to_ollama_options(candidate.runtime)
