// Runner-agnostic tests for the benchmark outcome presentation mapping.
//
// The project has no unit-test runner installed (only Playwright e2e), and
// importing one would break `tsc -b`. So — like ResultCardBuilder.test.ts — this
// is a plain, dependency-free module: call `runBenchmarkOutcomeTests()` to
// execute it. Everything here is pure (no DOM, no network).
//
// NOTE: the 5% acceptance rule is intentionally NOT tested here — it lives in the
// backend comparison service (see backend/tests/test_comparison.py). This file
// only checks the presentation mapping of an already-decided classification.

import {
  outcomePresentation,
  dashboardRecommendation,
  FALLBACK_OUTCOME_MESSAGE,
} from "./benchmarkOutcome";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(
      `FAIL: ${message} — got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`
    );
  }
}

export function runBenchmarkOutcomeTests(): void {
  // Improved → green, touts changes.
  const improved = outcomePresentation("improved");
  assertEqual(improved.improved, true, "improved.improved");
  assertEqual(improved.showChanges, true, "improved.showChanges");
  assertEqual(improved.tone, "green", "improved.tone");

  // No meaningful difference → neutral, no changes touted.
  const same = outcomePresentation("no_meaningful_difference");
  assertEqual(same.improved, false, "no_meaningful_difference.improved");
  assertEqual(same.showChanges, false, "no_meaningful_difference.showChanges");
  assertEqual(same.tone, "neutral", "no_meaningful_difference.tone");

  // Slower → not improved, no changes touted, blue accent.
  const slower = outcomePresentation("slower");
  assertEqual(slower.improved, false, "slower.improved");
  assertEqual(slower.showChanges, false, "slower.showChanges");
  assertEqual(slower.tone, "blue", "slower.tone");

  // Missing classification falls back to the neutral, honest outcome.
  const missing = outcomePresentation(null);
  assertEqual(missing.improved, false, "missing.improved");
  assertEqual(missing.tone, "neutral", "missing.tone");
  assert(FALLBACK_OUTCOME_MESSAGE.length > 0, "fallback message is non-empty");

  // Dashboard recommendation: only a confirmed improvement recommends tested settings.
  const recImproved = dashboardRecommendation("improved", 5);
  assertEqual(recImproved.headline, "Use tested settings", "improved rec headline");
  const recNeutral = dashboardRecommendation("no_meaningful_difference", 5);
  assertEqual(recNeutral.headline, "Keep current configuration", "neutral rec headline");
  assert(recNeutral.detail.includes("5%"), "neutral rec mentions threshold");
  const recSlower = dashboardRecommendation("slower", 5);
  assertEqual(recSlower.headline, "Keep current configuration", "slower rec headline");
  assert(
    recSlower.detail.toLowerCase().includes("reduced"),
    "slower rec explains reduced performance"
  );

  // eslint-disable-next-line no-console
  console.log("all benchmark-outcome tests passed");
}
