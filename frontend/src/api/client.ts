// Tiny typed API client. All calls go through the Vite proxy at /api -> :8000.

import type {
  ApplyOptimizationResponse,
  BenchmarkResult,
  HardwareInfo,
  OllamaStatus,
  RecommendationResponse,
} from "../types";

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!resp.ok) {
    let detail = resp.statusText;
    try {
      const body = await resp.json();
      detail = body.detail ?? detail;
    } catch {
      /* keep statusText */
    }
    throw new Error(detail);
  }
  return resp.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string }>("/health"),

  hardware: () => request<HardwareInfo>("/hardware"),

  ollamaStatus: () => request<OllamaStatus>("/ollama/status"),

  recommend: () => request<RecommendationResponse>("/models/recommend"),

  pullModel: (model: string) =>
    request<{ status: string }>("/ollama/pull", {
      method: "POST",
      body: JSON.stringify({ model }),
    }),

  runBenchmark: (model: string, profile: "baseline" | "optimized") =>
    request<BenchmarkResult>("/benchmark/run", {
      method: "POST",
      body: JSON.stringify({ model, profile }),
    }),

  applyOptimization: (model: string) =>
    request<ApplyOptimizationResponse>("/optimization/apply", {
      method: "POST",
      body: JSON.stringify({ model }),
    }),
};
