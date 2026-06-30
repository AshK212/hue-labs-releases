// Tiny typed API client. All calls go through the Vite proxy at /api -> :8000.

import type {
  ApplyOptimizationResponse,
  BenchmarkResult,
  HardwareInfo,
  OllamaStatus,
  PullEvent,
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

  /**
   * Download a model while streaming real progress. Reads the NDJSON response
   * line by line and hands each parsed event to `onEvent`. Pass an AbortSignal
   * to cancel: aborting tears down the request and the upstream download.
   */
  pullModelStream: async (
    model: string,
    onEvent: (event: PullEvent) => void,
    signal?: AbortSignal
  ): Promise<void> => {
    const resp = await fetch(`${BASE}/ollama/pull/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model }),
      signal,
    });
    if (!resp.ok || !resp.body) {
      throw new Error(`Couldn't start the download (HTTP ${resp.status}).`);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const flushLine = (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      try {
        onEvent(JSON.parse(trimmed) as PullEvent);
      } catch {
        /* ignore malformed partial line */
      }
    };

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        flushLine(buffer.slice(0, nl));
        buffer = buffer.slice(nl + 1);
      }
    }
    flushLine(buffer);
  },

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
