// Runner-agnostic test for privacy persistence.
//
// No unit-test runner is installed; importing one would break `tsc -b`. Call
// `runPrivacyTests()` to execute (verified via esbuild+node). It installs a fake
// localStorage so the pure get/set helpers can be exercised in Node.

import { DEFAULT_PRIVACY, getStoredPrivacy, setStoredPrivacy } from "./privacy";

function makeLocalStorage(): Storage {
  const map = new Map<string, string>();
  const store = {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    get length() {
      return map.size;
    },
  };
  return store as unknown as Storage;
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

export function runPrivacyTests(): string {
  (globalThis as { localStorage?: Storage }).localStorage = makeLocalStorage();

  // Defaults when nothing is stored.
  const defaults = getStoredPrivacy();
  assert(defaults.telemetry_enabled === true, "default telemetry on");
  assert(defaults.benchmark_submission_enabled === true, "default submission on");
  assert(defaults.crash_reports_enabled === false, "default crash off");

  // Round-trip persistence.
  setStoredPrivacy({ ...DEFAULT_PRIVACY, telemetry_enabled: false });
  const reloaded = getStoredPrivacy();
  assert(reloaded.telemetry_enabled === false, "telemetry persisted off");
  assert(reloaded.benchmark_submission_enabled === true, "submission stays on");

  // Partial/legacy stored value is filled from defaults.
  localStorage.setItem("lao.privacy", JSON.stringify({ telemetry_enabled: false }));
  const partial = getStoredPrivacy();
  assert(partial.benchmark_submission_enabled === true, "missing keys filled from defaults");
  assert(partial.crash_reports_enabled === false, "missing crash key filled from defaults");

  return "7 checks passed";
}
