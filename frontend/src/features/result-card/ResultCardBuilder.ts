// Converts a backend OptimizationRun into presentation-only ResultCardData.
//
// ALL formatting logic lives here — never inside the React component. The card
// only ever receives already-formatted strings, so it stays a dumb, exportable
// view. Nothing here fabricates data: when a value is missing we render "—".

import type {
  BenchmarkClassification,
  HardwareInfo,
  ModelInfo,
  OptimizationRun,
} from "../../types";
import type { ImprovementDirection, ResultCardData } from "./types";

/**
 * Optional presentation context from the Milestone-1 result page. When provided,
 * the card shows the tested-settings median (even when the candidate was NOT
 * accepted — we never hide a measured value), reflects the backend's own
 * comparison/classification, and renders a method (+ decision-threshold) callout
 * instead of the optimization score. All fields are optional; omitting the whole
 * object preserves the original single-argument behavior.
 */
export interface ResultCardOptions {
  /** Tested-settings median throughput (shown regardless of acceptance). */
  testedTps?: number | null;
  /** Backend classification — drives the caption/direction, never recomputed. */
  classification?: BenchmarkClassification | null;
  /** Backend signed comparison percentage. */
  comparisonPercent?: number | null;
  /** How many measured runs backed each side (for the "Median of N runs" line). */
  measuredRuns?: number | null;
  /** Backend decision threshold (percent), for the optional threshold callout. */
  thresholdPercent?: number | null;
  /** Override the "before"/"after" hero labels. */
  beforeLabel?: string;
  afterLabel?: string;
}

const WORDMARK = "Hue Labs";
const SITE = "huelabs.ai";
const EMPTY = "—";

/** Round throughput to one decimal, or dash when absent. */
function formatTps(value: number | null | undefined): string {
  return value == null ? EMPTY : value.toFixed(1);
}

/** Round the optimization score to a whole number, or dash. */
function formatScore(value: number | null | undefined): string {
  return value == null ? EMPTY : String(Math.round(value));
}

/** Human hardware label: primary GPU (+VRAM), else CPU / summary. */
function formatHardware(hardware: HardwareInfo | null): string {
  if (!hardware) return "Unknown hardware";
  const gpu = hardware.gpus?.[0];
  if (gpu) return gpu.vram_gb != null ? `${gpu.name} · ${gpu.vram_gb} GB` : gpu.name;
  return hardware.cpu_name || hardware.summary || "CPU only";
}

/** Model tag, trimmed of a redundant ":latest" suffix. */
function formatModel(model: ModelInfo | null): string {
  if (!model?.name) return EMPTY;
  return model.name.replace(/:latest$/i, "");
}

/** Quant from the recommendation, falling back to the model's own quant. */
function formatQuant(run: OptimizationRun): string {
  return run.recommendation?.quant_recommendation ?? run.model?.quantization ?? EMPTY;
}

/** Format a signed percentage plus its caption + direction hint. */
function formatImprovement(percent: number | null): {
  improvement: string;
  improvementCaption: string;
  improvementDirection: ImprovementDirection;
} {
  if (percent == null) {
    return { improvement: EMPTY, improvementCaption: "No measured gain", improvementDirection: "flat" };
  }
  const direction: ImprovementDirection =
    percent > 0.05 ? "up" : percent < -0.05 ? "down" : "flat";
  const sign = percent >= 0 ? "+" : "";
  const improvement = `${sign}${percent.toFixed(1)}%`;
  const caption =
    direction === "up" ? "faster" : direction === "down" ? "slower" : "No measured gain";
  return { improvement, improvementCaption: caption, improvementDirection: direction };
}

/** Locale date label from the run's completion (or start) timestamp. */
function formatGenerated(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Build the card's presentation data from a completed OptimizationRun.
 *
 * "Before" is the baseline throughput; "After" is the winning candidate's
 * measured throughput. When there is no winner, After/improvement stay empty —
 * we never invent an optimized number.
 */
export function buildResultCardData(
  run: OptimizationRun,
  opts?: ResultCardOptions
): ResultCardData {
  const beforeTps = run.baseline_result?.tokens_per_sec ?? null;

  const winnerId = run.winner?.candidate_id ?? null;
  const winnerResult = winnerId
    ? run.candidate_results.find((r) => r.candidate_id === winnerId) ?? null
    : null;
  // Prefer an explicit tested-settings value (result page) so the measured "after"
  // is never hidden just because the candidate wasn't accepted; else the winner's.
  const afterTps =
    opts?.testedTps != null ? opts.testedTps : winnerResult?.tokens_per_sec ?? null;

  // Improvement: use the backend comparison when provided (single source of
  // truth); otherwise compute from before/after for the generic path.
  const improvementPercent =
    opts?.comparisonPercent != null
      ? opts.comparisonPercent
      : beforeTps != null && afterTps != null && beforeTps > 0
      ? ((afterTps - beforeTps) / beforeTps) * 100
      : null;

  const { improvement, improvementCaption, improvementDirection } =
    opts?.classification != null
      ? formatFromClassification(opts.classification, improvementPercent)
      : formatImprovement(improvementPercent);

  const version = run.app?.version;

  const method =
    opts?.measuredRuns != null ? `Median of ${opts.measuredRuns} runs` : undefined;
  const thresholdValue =
    opts?.thresholdPercent != null ? `${opts.thresholdPercent}%` : undefined;

  return {
    wordmark: WORDMARK,
    site: SITE,
    hardware: formatHardware(run.hardware),
    model: formatModel(run.model),
    quant: formatQuant(run),
    beforeLabel: opts?.beforeLabel ?? "Before",
    afterLabel: opts?.afterLabel ?? "After",
    beforeTps: formatTps(beforeTps),
    afterTps: formatTps(afterTps),
    improvement,
    improvementCaption,
    improvementDirection,
    score: formatScore(run.winner?.total_score ?? null),
    scoreOutOf: "/100",
    method,
    methodLabel: method ? "Method" : undefined,
    thresholdValue,
    thresholdLabel: thresholdValue ? "Decision threshold" : undefined,
    versionLabel: version ? `v${version}` : "",
    generatedLabel: formatGenerated(run.timing?.completed_at ?? run.timing?.started_at),
  };
}

/** Caption/direction driven by the backend classification (no threshold recompute). */
function formatFromClassification(
  classification: BenchmarkClassification,
  percent: number | null
): { improvement: string; improvementCaption: string; improvementDirection: ImprovementDirection } {
  const improvement =
    percent == null ? EMPTY : `${percent >= 0 ? "+" : ""}${percent.toFixed(1)}%`;
  if (classification === "improved") {
    return { improvement, improvementCaption: "faster", improvementDirection: "up" };
  }
  if (classification === "slower") {
    return { improvement, improvementCaption: "slower", improvementDirection: "down" };
  }
  return { improvement, improvementCaption: "No meaningful change", improvementDirection: "flat" };
}
