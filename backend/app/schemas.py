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
