"""Pydantic request/response models — the API contract shared with the frontend.

Field names here map 1:1 to the TypeScript types in `frontend/src/types.ts`.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


# --- Hardware -------------------------------------------------------------

class GpuInfo(BaseModel):
    name: str
    vendor: str  # "NVIDIA" | "AMD" | "Apple" | "Intel" | "Unknown"
    vram_gb: Optional[float] = None


class HardwareInfo(BaseModel):
    os_name: str
    os_version: str
    cpu_name: str
    cpu_cores_physical: int
    cpu_cores_logical: int
    memory_total_gb: float
    memory_available_gb: float
    gpus: list[GpuInfo] = Field(default_factory=list)
    is_apple_silicon: bool = False
    # A plain-language one-liner the UI can show directly.
    summary: str = ""


# --- Ollama status --------------------------------------------------------

class OllamaModel(BaseModel):
    name: str
    size_gb: Optional[float] = None


class OllamaStatus(BaseModel):
    installed: bool          # is the `ollama` binary reachable / server responding
    running: bool            # did the server answer on its port
    version: Optional[str] = None
    models: list[OllamaModel] = Field(default_factory=list)
    # Friendly, non-technical guidance for the UI when something is missing.
    message: str = ""


# --- Recommendation -------------------------------------------------------

class ModelRecommendation(BaseModel):
    model: str                       # Ollama model tag, e.g. "llama3.2:3b"
    display_name: str
    reason: str                      # plain-language reason
    estimated_tokens_per_sec: str    # a range, e.g. "15–35 tok/s"
    download_size_gb: float
    already_installed: bool = False


class RecommendationResponse(BaseModel):
    primary: ModelRecommendation
    alternatives: list[ModelRecommendation] = Field(default_factory=list)


# --- Benchmark ------------------------------------------------------------

class BenchmarkRequest(BaseModel):
    model: str
    profile: str = "baseline"  # "baseline" | "optimized"


class BenchmarkResult(BaseModel):
    model: str
    profile: str
    tokens_per_sec: float
    output_tokens: int
    total_seconds: float
    prompt: str
    options: dict = Field(default_factory=dict)  # the runtime options actually used
    created_at: str
    # Additive, optional honest measurements (default None so the Milestone-1
    # contract and the frontend are unaffected). Derived from Ollama's own real
    # numbers — never fabricated. Used by the cloud benchmark submission; when a
    # value is unavailable it stays None and submission safely skips.
    first_token_latency_ms: Optional[float] = None  # load + prompt-eval time
    vram_used_mb: Optional[float] = None            # model VRAM from Ollama /api/ps
    model_quant: Optional[str] = None               # quantization from Ollama /api/show

    # --- Benchmark methodology v2 (additive; None on legacy callers/rows) ----
    # `tokens_per_sec` above is the MEDIAN of `run_tokens_per_sec`. These fields
    # are local diagnostics only — the cloud submission never reads them.
    benchmark_method_version: Optional[str] = None   # e.g. "2.0"
    measured_runs: Optional[int] = None              # number of measured generations
    warmup_runs: Optional[int] = None                # number of discarded warm-ups
    run_tokens_per_sec: Optional[list[float]] = None  # each measured run's tok/s
    # Dispersion of the measured runs. Diagnostic ONLY — NOT a confidence interval
    # and NOT a claim of statistical significance.
    tokens_per_sec_stddev: Optional[float] = None


# --- Ollama pull ----------------------------------------------------------

class PullModelRequest(BaseModel):
    model: str


# A single normalized progress event streamed during a model download.
# (Documentation/reference only; the live endpoint streams NDJSON, not this model.)
class PullProgressEvent(BaseModel):
    phase: str  # preparing | downloading | verifying | finalizing | complete | error
    status: Optional[str] = None
    digest: Optional[str] = None
    total: Optional[int] = None       # bytes, when Ollama reports it
    completed: Optional[int] = None   # bytes, when Ollama reports it
    error: Optional[str] = None


# --- Optimization ---------------------------------------------------------

class OptimizationProfile(BaseModel):
    name: str
    label: str
    description: str
    options: dict
    changed_settings: list[str]


class ApplyOptimizationRequest(BaseModel):
    model: str


class ApplyOptimizationResponse(BaseModel):
    profile: OptimizationProfile
    # Plain-language explanation shown on the before/after screen.
    explanation: str


# --- Benchmark comparison / classification (v2) ---------------------------
# The backend is the single source of truth for the acceptance threshold. The
# frontend renders this result; it must NOT re-implement the 5% rule.

class BenchmarkComparisonRequest(BaseModel):
    baseline_tokens_per_sec: float
    optimized_tokens_per_sec: float
    # For copy ("across {N} measured runs"); optional so older callers still work.
    measured_runs: Optional[int] = None


class BenchmarkComparison(BaseModel):
    # "improved" | "no_meaningful_difference" | "slower"
    classification: str
    # Signed percentage change of optimized vs baseline throughput.
    comparison_percent: float
    # "apply_optimized" | "keep_baseline" — a stable code for callers to branch on.
    recommendation_code: str
    # Beginner-friendly, user-safe sentence for the UI to render verbatim.
    recommendation_message: str
    # The product acceptance threshold used (percent). Echoed for transparency.
    threshold_percent: float
    measured_runs: Optional[int] = None
    method_version: str
