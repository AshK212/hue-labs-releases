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
