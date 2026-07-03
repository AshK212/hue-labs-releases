// Text/link sharing for the result card — separate from image export.
//
// Providers are kept in a small registry so new ones (LinkedIn, Reddit, native
// Web Share, …) can be added later without touching callers. Each provider works
// from the same presentation-only ResultCardData; none sees backend internals.

import type { ResultCardData } from "./types";

/** One-line, human summary suitable for a post or clipboard. */
export function buildSummary(data: ResultCardData): string {
  const gain =
    data.improvementDirection === "up" ? ` (${data.improvement} ${data.improvementCaption})` : "";
  return (
    `Optimized ${data.model} on ${data.hardware} with ${data.wordmark} — ` +
    `${data.beforeTps} → ${data.afterTps} tok/s${gain}. ` +
    `Optimization score ${data.score}${data.scoreOutOf}. ${data.site}`
  );
}

/** Copy the summary text to the clipboard. */
export async function copySummary(data: ResultCardData): Promise<void> {
  if (!navigator.clipboard?.writeText) {
    throw new Error("Clipboard text copy isn't supported here.");
  }
  await navigator.clipboard.writeText(buildSummary(data));
}

/** Open an X (Twitter) compose window pre-filled with the summary. */
export function shareToX(data: ResultCardData): void {
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(buildSummary(data))}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export interface ShareProvider {
  id: string;
  label: string;
  share: (data: ResultCardData) => void | Promise<void>;
}

/** Registry of available providers. Append new providers here. */
export const shareProviders: ShareProvider[] = [
  { id: "x", label: "Share on X", share: shareToX },
  { id: "copy", label: "Copy summary", share: copySummary },
];
