// Presentation-only data for the Shareable Result Card.
//
// This is the ONLY shape the <ResultCard /> component ever sees. It deliberately
// contains no benchmark internals, no OptimizationRun, no candidate configs — just
// display-ready strings (and a couple of presentation hints). All conversion and
// formatting from the backend OptimizationRun happens in ResultCardBuilder.ts.

export type ImprovementDirection = "up" | "flat" | "down";

export interface ResultCardData {
  /** Brand wordmark, e.g. "Hue Labs". */
  wordmark: string;
  /** Canonical site shown in the footer, e.g. "huelabs.ai". */
  site: string;

  /** Human hardware label, e.g. "NVIDIA RTX 3060 · 12 GB". */
  hardware: string;
  /** Display model name, e.g. "llama3.2:3b". */
  model: string;
  /** Quantization label, e.g. "Q4_K_M" (or "—" when unknown). */
  quant: string;

  /** Baseline throughput, formatted, e.g. "18.4" (or "—"). */
  beforeTps: string;
  /** Optimized throughput, formatted, e.g. "21.1" (or "—"). */
  afterTps: string;

  /** Signed improvement, formatted, e.g. "+14.7%" (or "—"). */
  improvement: string;
  /** Caption under the improvement, e.g. "faster" / "No measured gain". */
  improvementCaption: string;
  /** Presentation hint for styling the improvement (never a benchmark value). */
  improvementDirection: ImprovementDirection;

  /** Label above the "before" number (defaults to "Before"). */
  beforeLabel: string;
  /** Label above the "after" number (defaults to "After"). */
  afterLabel: string;

  /** Optimization score, formatted, e.g. "88" (or "—"). */
  score: string;
  /** Suffix rendered after the score, e.g. "/100". */
  scoreOutOf: string;

  // --- Methodology v2 (optional). When `method` is present the card renders the
  // method (and optional decision-threshold) callout INSTEAD of the score. ---
  /** Method value, e.g. "Median of 3 runs". */
  method?: string;
  /** Method callout label, e.g. "Method". */
  methodLabel?: string;
  /** Decision-threshold value, e.g. "5%". */
  thresholdValue?: string;
  /** Decision-threshold label, e.g. "Decision threshold". */
  thresholdLabel?: string;

  /** Version stamp, e.g. "v0.2.0" (or "" when unknown). */
  versionLabel: string;
  /** Human generated-at label, e.g. "Jul 4, 2026" (or ""). */
  generatedLabel: string;
}
