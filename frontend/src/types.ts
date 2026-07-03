// TypeScript mirrors of the backend Pydantic schemas (app/schemas.py).
// Keep these in sync with the API contract.

export interface GpuInfo {
  name: string;
  vendor: string;
  vram_gb: number | null;
}

export interface HardwareInfo {
  os_name: string;
  os_version: string;
  cpu_name: string;
  cpu_cores_physical: number;
  cpu_cores_logical: number;
  memory_total_gb: number;
  memory_available_gb: number;
  gpus: GpuInfo[];
  is_apple_silicon: boolean;
  summary: string;
}

export interface OllamaModel {
  name: string;
  size_gb: number | null;
}

export interface OllamaStatus {
  installed: boolean;
  running: boolean;
  version: string | null;
  models: OllamaModel[];
  message: string;
}

export interface ModelRecommendation {
  model: string;
  display_name: string;
  reason: string;
  estimated_tokens_per_sec: string;
  download_size_gb: number;
  already_installed: boolean;
}

export interface RecommendationResponse {
  primary: ModelRecommendation;
  alternatives: ModelRecommendation[];
}

export interface BenchmarkResult {
  model: string;
  profile: string;
  tokens_per_sec: number;
  output_tokens: number;
  total_seconds: number;
  prompt: string;
  options: Record<string, unknown>;
  created_at: string;
}

export type PullPhase =
  | "preparing"
  | "downloading"
  | "verifying"
  | "finalizing"
  | "complete"
  | "error";

export interface PullEvent {
  phase: PullPhase;
  status?: string;
  digest?: string;
  total?: number; // bytes, when reported
  completed?: number; // bytes, when reported
  error?: string;
}

// A stored benchmark run as returned by /benchmark/history.
export interface BenchmarkRun {
  id: number;
  model: string;
  profile: string;
  tokens_per_sec: number;
  output_tokens: number;
  total_seconds: number;
  options_json: string;
  created_at: string;
}

export interface OptimizationProfile {
  name: string;
  label: string;
  description: string;
  options: Record<string, unknown>;
  changed_settings: string[];
}

export interface ApplyOptimizationResponse {
  profile: OptimizationProfile;
  explanation: string;
}

// ===========================================================================
// Milestone 2 — Measured Optimization Engine
// ---------------------------------------------------------------------------
// Mirrors of the backend Pydantic models in
// `backend/app/optimization/schemas.py`. Field names are snake_case to match
// the backend JSON exactly, just like the Milestone 1 types above.
//
// IMPORTANT: These do NOT replace the Milestone 1 `BenchmarkResult` /
// `OptimizationProfile` types. Those remain the live API contract. Nothing here
// is wired to a UI or an endpoint yet — these are contract-only types so the
// frontend and backend agree on shape ahead of the measured optimization work.
//
// Naming note: the backend calls its richer result type `BenchmarkResult` too,
// but that name is already taken here by the Milestone 1 type, so the Milestone
// 2 version is exposed as `MeasuredBenchmarkResult` to avoid a conflict.
// ===========================================================================

// Bump alongside backend SCHEMA_VERSION when OptimizationRun changes shape.
export type OptimizationSchemaVersion = "optimization-run-v1";

// Shared string-literal vocabularies (mirror the backend Literal types).
export type SpillRisk = "low" | "medium" | "high" | "unknown";
export type BenchmarkStatus =
  | "pending"
  | "running"
  | "success"
  | "failed"
  | "skipped";
export type SubmissionState =
  | "not_submitted"
  | "pending"
  | "submitted"
  | "failed"
  | "opted_out";
export type ShareCardStatus = "none" | "pending" | "generated" | "failed";
export type QAStatus = "pending" | "passed" | "failed" | "skipped";

// --- Candidate configuration ----------------------------------------------

export interface ModelInfo {
  name: string; // Ollama tag, e.g. "llama3.2:3b"
  family: string | null;
  parameter_size: string | null;
  quantization: string | null;
  size_gb: number | null;
}

// Real, tunable runtime knobs. null means "leave at Ollama's default".
export interface RuntimeSettings {
  gpu_layers: number | null; // num_gpu
  context_size: number | null; // num_ctx
  batch_size: number | null; // num_batch
  threads: number | null; // num_thread
  flash_attention: boolean | null;
  kv_cache_quantization: string | null; // e.g. "f16", "q8_0", "q4_0"
}

export interface SafetyInfo {
  estimated_vram_mb: number | null;
  max_allowed_vram_mb: number | null;
  spill_risk: SpillRisk;
  reason: string;
}

export interface CandidateConfig {
  candidate_id: string;
  label: string;
  model: ModelInfo;
  runtime: RuntimeSettings;
  safety: SafetyInfo;
  metadata: Record<string, unknown>;
}

// --- Measured benchmark result --------------------------------------------

export interface ResourceObservation {
  system_ram_used_mb: number | null;
  system_ram_growth_mb: number | null;
  gpu_vram_used_mb: number | null;
  cpu_percent: number | null;
  notes: string | null;
}

export interface BenchmarkTiming {
  started_at: string | null; // ISO 8601 UTC
  completed_at: string | null; // ISO 8601 UTC
  duration_seconds: number | null;
}

// Milestone 2 counterpart of the backend's optimization `BenchmarkResult`.
// Metrics are nullable and stay null until actually measured — a failed run is
// fully representable (status "failed", valid_output false, error_message set).
export interface MeasuredBenchmarkResult {
  benchmark_id: string;
  candidate_id: string;
  status: BenchmarkStatus;
  timing: BenchmarkTiming;
  prompt_version: string | null;
  prompt_id: string | null;
  tokens_per_sec: number | null;
  total_tokens: number | null;
  time_to_first_token_ms: number | null;
  eval_duration_ms: number | null;
  load_duration_ms: number | null;
  resource_observation: ResourceObservation;
  detected_vram_spill: boolean;
  spill_signals: string[];
  valid_output: boolean;
  error_message: string | null;
  confidence: number | null; // 0..1
  raw_ollama_metadata: Record<string, unknown> | null;
}

// --- Winner / recommendation ----------------------------------------------

export interface OptimizationWinner {
  candidate_id: string;
  label: string;
  reason: string;
  is_baseline: boolean;
  performance_score: number | null;
  stability_score: number | null;
  safety_score: number | null;
  total_score: number | null;
}

export interface OptimizationRecommendation {
  summary: string;
  recommended_candidate_id: string | null;
  recommended_runtime: RuntimeSettings | null;
  quant_recommendation: string | null;
  notes: string[];
}

// --- Downstream artifacts (share card, submission, QA, telemetry) ----------

export interface ShareCardArtifact {
  artifact_id: string | null;
  status: ShareCardStatus;
  format: string | null; // e.g. "png", "svg"
  file_path: string | null;
  image_data_uri: string | null; // inline data: URI for the UI
  created_at: string | null;
  error: string | null;
}

export interface SubmissionStatus {
  state: SubmissionState;
  submission_id: string | null;
  submitted_at: string | null;
  error: string | null;
}

export interface TelemetryState {
  enabled: boolean;
  consent_given: boolean;
  anonymized: boolean;
}

export interface QACheck {
  name: string;
  passed: boolean;
  detail: string;
}

export interface QAReport {
  status: QAStatus;
  checks: QACheck[];
  summary: string;
}

// --- Top-level run ---------------------------------------------------------

export interface AppInfo {
  name: string;
  version: string | null;
  platform: string | null;
}

export interface RunTiming {
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
}

// The complete record of one measured optimization run — the single source of
// truth the share card, submission, telemetry, and QA features all read from.
export interface OptimizationRun {
  run_id: string;
  schema_version: OptimizationSchemaVersion | string;
  app: AppInfo;
  hardware: HardwareInfo | null; // reuses the Milestone 1 HardwareInfo type
  model: ModelInfo | null;
  baseline_config: CandidateConfig | null;
  baseline_result: MeasuredBenchmarkResult | null;
  candidate_configs: CandidateConfig[];
  candidate_results: MeasuredBenchmarkResult[];
  winner: OptimizationWinner | null;
  recommendation: OptimizationRecommendation | null;
  telemetry: TelemetryState;
  submission: SubmissionStatus;
  share_card: ShareCardArtifact;
  qa_report: QAReport;
  timing: RunTiming;
}
