// Runner-agnostic tests for the result-card builder + helpers.
//
// The project has no unit-test runner installed (only Playwright e2e), and
// importing one (vitest/jest) would break `tsc -b`. So these tests are a plain,
// dependency-free module: call `runResultCardTests()` to execute them (e.g. from
// a scratch script or a future vitest wrapper). Everything here is pure — no DOM.

import { defaultFileName } from "./exporter";
import { buildResultCardData } from "./ResultCardBuilder";
import { buildSummary } from "./share";
import type { OptimizationRun } from "../../types";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(`FAIL: ${message} — got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
  }
}

/** A completed run with a clear winner (baseline 18.4 → 21.1 tok/s). */
function winningRun(): OptimizationRun {
  return {
    baseline_result: { tokens_per_sec: 18.4 },
    winner: { candidate_id: "balanced", total_score: 88.2 },
    candidate_results: [
      { candidate_id: "balanced", tokens_per_sec: 21.1 },
      { candidate_id: "performance", tokens_per_sec: 20.0 },
    ],
    recommendation: { quant_recommendation: "Q4_K_M" },
    model: { name: "llama3.2:3b", quantization: null },
    hardware: { gpus: [{ name: "NVIDIA RTX 3060", vram_gb: 12 }], cpu_name: "CPU", summary: "" },
    app: { version: "0.2.0" },
    timing: { completed_at: "2026-07-04T10:00:00Z", started_at: null },
  } as unknown as OptimizationRun;
}

/** A run where no candidate beat the baseline. */
function noWinnerRun(): OptimizationRun {
  return {
    baseline_result: { tokens_per_sec: 20.0 },
    winner: null,
    candidate_results: [{ candidate_id: "balanced", tokens_per_sec: 20.2 }],
    recommendation: null,
    model: { name: "llama3.2:3b:latest", quantization: "Q5_K_M" },
    hardware: { gpus: [], cpu_name: "AMD Ryzen 7", summary: "" },
    app: { version: null },
    timing: { completed_at: null, started_at: null },
  } as unknown as OptimizationRun;
}

export function runResultCardTests(): string {
  // 1. Builder mapping.
  const data = buildResultCardData(winningRun());
  assertEqual(data.hardware, "NVIDIA RTX 3060 · 12 GB", "hardware label");
  assertEqual(data.model, "llama3.2:3b", "model label");
  assertEqual(data.quant, "Q4_K_M", "quant from recommendation");
  assertEqual(data.beforeTps, "18.4", "before tps");
  assertEqual(data.afterTps, "21.1", "after tps (winner's result)");
  assertEqual(data.score, "88", "rounded optimization score");
  assertEqual(data.versionLabel, "v0.2.0", "version label");
  assertEqual(data.wordmark, "Hue Labs", "wordmark");
  assertEqual(data.site, "huelabs.ai", "site");

  // 2. Improvement formatting: (21.1 - 18.4) / 18.4 = +14.7%.
  assertEqual(data.improvement, "+14.7%", "improvement percent");
  assertEqual(data.improvementCaption, "faster", "improvement caption");
  assertEqual(data.improvementDirection, "up", "improvement direction");

  // 3. No winner → honest empties, model ":latest" trimmed, quant falls back.
  const none = buildResultCardData(noWinnerRun());
  assertEqual(none.afterTps, "—", "no-winner after tps");
  assertEqual(none.improvement, "—", "no-winner improvement");
  assertEqual(none.improvementCaption, "No measured gain", "no-winner caption");
  assertEqual(none.improvementDirection, "flat", "no-winner direction");
  assertEqual(none.model, "llama3.2:3b", "model trims :latest");
  assertEqual(none.quant, "Q5_K_M", "quant falls back to model quantization");
  assertEqual(none.hardware, "AMD Ryzen 7", "hardware falls back to CPU");
  assertEqual(none.versionLabel, "", "empty version label");

  // 4. Export helper: safe, descriptive filename.
  assertEqual(defaultFileName(data), "hue-labs-llama3-2-3b.png", "default filename");

  // 5. Share summary includes the model and site.
  const summary = buildSummary(data);
  assert(summary.includes("llama3.2:3b"), "summary includes model");
  assert(summary.includes("huelabs.ai"), "summary includes site");
  assert(summary.includes("+14.7%"), "summary includes improvement");

  return "12 checks passed";
}
