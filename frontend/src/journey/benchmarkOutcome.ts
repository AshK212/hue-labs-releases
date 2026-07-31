// Presentation mapping for a benchmark comparison outcome.
//
// This is PRESENTATION ONLY. The business rule (the 5% acceptance threshold and
// the improved / no_meaningful_difference / slower decision) lives in the
// backend comparison service and is the single source of truth. Here we only map
// an already-decided classification onto UI affordances (tone, whether to tout
// "what changed"). No thresholds are re-implemented.

import type { BenchmarkClassification } from "../types";

export interface OutcomePresentation {
  /** True only for a confirmed improvement — drives the "faster" styling. */
  improved: boolean;
  /** Only tout the changed settings when there was a real gain. */
  showChanges: boolean;
  /** Visual tone for the metric/accent. */
  tone: "green" | "neutral" | "blue";
}

export function outcomePresentation(
  classification: BenchmarkClassification | null | undefined
): OutcomePresentation {
  switch (classification) {
    case "improved":
      return { improved: true, showChanges: true, tone: "green" };
    case "slower":
      return { improved: false, showChanges: false, tone: "blue" };
    case "no_meaningful_difference":
    default:
      // Includes the fallback when no comparison is available.
      return { improved: false, showChanges: false, tone: "neutral" };
  }
}

/** A neutral, honest fallback message when the backend comparison is absent. */
export const FALLBACK_OUTCOME_MESSAGE =
  "Your original configuration is kept.";

export interface OutcomeCopy {
  /** Result-page heading. Never implies an optimization was applied unless one was. */
  heading: string;
  /** Body copy for the outcome. */
  message: string;
}

/**
 * Heading + body copy for a backend-decided outcome. The classification is the
 * backend's decision (single source of truth) — this only maps it to wording and
 * never re-derives the threshold. For a confirmed improvement we render the
 * backend's own message; the other outcomes use precise copy that does not imply
 * an optimization was applied.
 */
export function outcomeCopy(
  classification: BenchmarkClassification | null | undefined,
  improvedMessage: string
): OutcomeCopy {
  switch (classification) {
    case "improved":
      return { heading: "Performance improved", message: improvedMessage };
    case "slower":
      return {
        heading: "Analysis complete",
        message:
          "Your current configuration performed better. The tested settings reduced " +
          "throughput, so we recommend keeping your current configuration.",
      };
    case "no_meaningful_difference":
    default:
      return {
        heading: "Analysis complete",
        message:
          "Your current configuration is already performing well. The tested settings " +
          "produced no meaningful improvement, so we recommend keeping your current " +
          "configuration.",
      };
  }
}

export interface DashboardRecommendation {
  /** Short action headline, e.g. "Keep current configuration". */
  headline: string;
  /** One-line reason, e.g. "The tested settings did not exceed the 5% decision threshold." */
  detail: string;
}

/**
 * Dashboard "Latest recommendation" copy for a backend-decided outcome. Uses the
 * backend classification and threshold; never recomputes the decision. Mirrors the
 * result-page policy: only a confirmed improvement recommends the tested settings.
 */
export function dashboardRecommendation(
  classification: BenchmarkClassification | null | undefined,
  thresholdPercent: number | null | undefined
): DashboardRecommendation {
  switch (classification) {
    case "improved":
      return {
        headline: "Use tested settings",
        detail: "A confirmed improvement was measured.",
      };
    case "slower":
      return {
        headline: "Keep current configuration",
        detail: "The tested settings reduced performance.",
      };
    case "no_meaningful_difference":
    default: {
      const t = thresholdPercent == null ? 5 : thresholdPercent;
      return {
        headline: "Keep current configuration",
        detail: `The tested settings did not exceed the ${t}% decision threshold.`,
      };
    }
  }
}

/** Signed percentage for display, e.g. "+12.3%" / "-0.6%" (or "—" when absent). */
export function formatDifference(percent: number | null | undefined): string {
  if (percent == null) return "—";
  const sign = percent >= 0 ? "+" : "";
  return `${sign}${percent.toFixed(1)}%`;
}

/**
 * Caption under the measured difference. Uses the backend-provided threshold for
 * the "within X%" wording — the frontend never recomputes the decision.
 */
export function differenceCaption(
  classification: BenchmarkClassification | null | undefined,
  thresholdPercent: number | null | undefined
): string {
  switch (classification) {
    case "improved":
      return "Confirmed improvement";
    case "slower":
      return "Current configuration recommended";
    case "no_meaningful_difference":
    default: {
      const t = thresholdPercent == null ? 5 : thresholdPercent;
      return `Within the ${t}% decision threshold`;
    }
  }
}
