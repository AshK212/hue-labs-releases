"""Data contracts for the Measured Optimization Engine (Milestone 2).

These Pydantic models describe a full *measured* optimization run: the candidate
configurations we try, the honest benchmark results for each, the selected
winner, and the downstream artifacts (share card, submission, QA) built on top.

Design rules for this module:

* Field names stay snake_case so they map 1:1 to the frontend TypeScript types,
  exactly like the existing `app/schemas.py` contract.
* Everything is JSON-serializable (``model_dump_json``) so a run can be persisted,
  streamed to the UI, or attached to a telemetry/QA payload without extra work.
* This is a *contract-only* milestone. No search is executed here — these models
  just define the shape the engine will fill in later. Nothing fakes a benchmark
  number; unmeasured fields are left ``None``.

The models are intentionally permissive (most measured fields are Optional) so a
partially-completed or *failed* run is still representable and serializable.
"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.schemas import HardwareInfo

# Bump this when the OptimizationRun shape changes in a breaking way. The frontend
# and any stored runs can branch on it.
SCHEMA_VERSION: str = "optimization-run-v1"


# --- Shared value types ---------------------------------------------------

SpillRisk = Literal["low", "medium", "high", "unknown"]
BenchmarkStatus = Literal["pending", "running", "success", "failed", "skipped"]
SubmissionState = Literal[
    "not_submitted", "pending", "submitted", "failed", "opted_out"
]
ShareCardStatus = Literal["none", "pending", "generated", "failed"]
QAStatus = Literal["pending", "passed", "failed", "skipped"]


class ModelInfo(BaseModel):
    """Identity of the model a run is optimizing."""

    name: str                              # Ollama tag, e.g. "llama3.2:3b"
    family: Optional[str] = None           # e.g. "llama"
    parameter_size: Optional[str] = None   # e.g. "3B"
    quantization: Optional[str] = None     # e.g. "Q4_K_M"
    size_gb: Optional[float] = None


class RuntimeSettings(BaseModel):
    """The real, tunable runtime knobs for a candidate.

    These correspond to actual Ollama/llama.cpp options. ``None`` means "leave at
    Ollama's default" — we never invent a value we didn't deliberately set.
    """

    gpu_layers: Optional[int] = None            # num_gpu (layers offloaded to GPU)
    context_size: Optional[int] = None          # num_ctx
    batch_size: Optional[int] = None            # num_batch
    threads: Optional[int] = None               # num_thread
    flash_attention: Optional[bool] = None      # flash attention on/off
    kv_cache_quantization: Optional[str] = None  # e.g. "f16", "q8_0", "q4_0"


class SafetyInfo(BaseModel):
    """Pre-run safety estimate for a candidate (used to skip unsafe configs)."""

    estimated_vram_mb: Optional[float] = None
    max_allowed_vram_mb: Optional[float] = None
    spill_risk: SpillRisk = "unknown"
    reason: str = ""


class CandidateConfig(BaseModel):
    """One configuration the engine may benchmark (including the baseline)."""

    candidate_id: str
    label: str
    model: ModelInfo
    runtime: RuntimeSettings = Field(default_factory=RuntimeSettings)
    safety: SafetyInfo = Field(default_factory=SafetyInfo)
    metadata: dict = Field(default_factory=dict)


# --- Benchmark result -----------------------------------------------------

class ResourceObservation(BaseModel):
    """What we observed on the machine while the candidate ran.

    All optional: on some platforms we can't read GPU VRAM, and that's fine —
    we record what we can and leave the rest ``None`` rather than guessing.
    """

    system_ram_used_mb: Optional[float] = None
    system_ram_growth_mb: Optional[float] = None
    gpu_vram_used_mb: Optional[float] = None
    cpu_percent: Optional[float] = None
    notes: Optional[str] = None


class BenchmarkTiming(BaseModel):
    """Wall-clock envelope for a single benchmark run."""

    started_at: Optional[str] = None    # ISO 8601 UTC
    completed_at: Optional[str] = None  # ISO 8601 UTC
    duration_seconds: Optional[float] = None


class BenchmarkResult(BaseModel):
    """The measured outcome of running one CandidateConfig.

    This is the optimization engine's richer result type. It is intentionally
    separate from ``app.schemas.BenchmarkResult`` (the Milestone 1 API contract),
    which stays unchanged. A *failed* run is fully representable: set ``status``
    to ``"failed"``, ``valid_output`` to ``False``, and fill ``error_message`` —
    the measured metrics simply stay ``None``.
    """

    benchmark_id: str
    candidate_id: str
    status: BenchmarkStatus = "pending"
    timing: BenchmarkTiming = Field(default_factory=BenchmarkTiming)

    # Which fixed prompt was used, so results are only compared like-for-like.
    prompt_version: Optional[str] = None
    prompt_id: Optional[str] = None

    # Measured performance metrics (None until actually measured).
    tokens_per_sec: Optional[float] = None
    total_tokens: Optional[int] = None
    time_to_first_token_ms: Optional[float] = None
    eval_duration_ms: Optional[float] = None
    load_duration_ms: Optional[float] = None

    # Resource + safety observations.
    resource_observation: ResourceObservation = Field(
        default_factory=ResourceObservation
    )
    detected_vram_spill: bool = False
    spill_signals: list[str] = Field(default_factory=list)

    # Validity / honesty flags.
    valid_output: bool = False
    error_message: Optional[str] = None
    confidence: Optional[float] = None  # 0..1, how trustworthy this measurement is

    # Optional passthrough of Ollama's own timing/metadata for auditing.
    raw_ollama_metadata: Optional[dict] = None


# --- Winner / recommendation ---------------------------------------------

class OptimizationWinner(BaseModel):
    """The candidate the engine selected as best (may be the baseline)."""

    candidate_id: str
    label: str
    reason: str = ""
    is_baseline: bool = False

    # Scoring breakdown (filled by winner.select_winner later; None for now).
    performance_score: Optional[float] = None
    stability_score: Optional[float] = None
    safety_score: Optional[float] = None
    total_score: Optional[float] = None


class OptimizationRecommendation(BaseModel):
    """Plain-language, user-facing recommendation derived from the winner."""

    summary: str = ""
    recommended_candidate_id: Optional[str] = None
    recommended_runtime: Optional[RuntimeSettings] = None
    quant_recommendation: Optional[str] = None
    notes: list[str] = Field(default_factory=list)


# --- Downstream artifacts (share card, submission, QA, telemetry) ---------

class ShareCardArtifact(BaseModel):
    """State + payload for the shareable result card image."""

    artifact_id: Optional[str] = None
    status: ShareCardStatus = "none"
    format: Optional[str] = None        # e.g. "png", "svg"
    file_path: Optional[str] = None
    image_data_uri: Optional[str] = None  # inline data: URI for the UI
    created_at: Optional[str] = None
    error: Optional[str] = None


class SubmissionStatus(BaseModel):
    """Tracks optional, opt-in submission of a run to a shared leaderboard."""

    state: SubmissionState = "not_submitted"
    submission_id: Optional[str] = None
    submitted_at: Optional[str] = None
    error: Optional[str] = None


class TelemetryState(BaseModel):
    """Opt-in telemetry consent for this run. Defaults to fully off."""

    enabled: bool = False
    consent_given: bool = False
    anonymized: bool = True


class QACheck(BaseModel):
    """A single automated quality/sanity check on a run."""

    name: str
    passed: bool
    detail: str = ""


class QAReport(BaseModel):
    """Aggregated QA verdict for a run (are the numbers trustworthy?)."""

    status: QAStatus = "pending"
    checks: list[QACheck] = Field(default_factory=list)
    summary: str = ""


# --- Top-level run --------------------------------------------------------

class AppInfo(BaseModel):
    """Which app + version produced this run (for reproducibility)."""

    name: str = "Hue Labs"
    version: Optional[str] = None
    platform: Optional[str] = None


class RunTiming(BaseModel):
    """Wall-clock envelope for the whole optimization run."""

    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    duration_seconds: Optional[float] = None


class OptimizationRun(BaseModel):
    """The complete record of one measured optimization run.

    This is the object the engine builds up and the frontend renders. It is the
    single source of truth that share card, submission, telemetry, and QA all
    read from, so keep it JSON-serializable and additive across schema versions.
    """

    run_id: str
    schema_version: str = SCHEMA_VERSION

    app: AppInfo = Field(default_factory=AppInfo)
    hardware: Optional[HardwareInfo] = None
    model: Optional[ModelInfo] = None

    # Baseline is tracked separately so we always have an honest reference point.
    baseline_config: Optional[CandidateConfig] = None
    baseline_result: Optional[BenchmarkResult] = None

    # The candidates we tried and their measured results (parallel lists by id).
    candidate_configs: list[CandidateConfig] = Field(default_factory=list)
    candidate_results: list[BenchmarkResult] = Field(default_factory=list)

    winner: Optional[OptimizationWinner] = None
    recommendation: Optional[OptimizationRecommendation] = None

    telemetry: TelemetryState = Field(default_factory=TelemetryState)
    submission: SubmissionStatus = Field(default_factory=SubmissionStatus)
    share_card: ShareCardArtifact = Field(default_factory=ShareCardArtifact)
    qa_report: QAReport = Field(default_factory=QAReport)

    timing: RunTiming = Field(default_factory=RunTiming)
