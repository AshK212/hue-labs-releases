// Runner-agnostic test for the license activation flow.
//
// No unit-test runner is installed; call `runLicenseTests()` to execute (verified
// via esbuild+node). Installs a fake localStorage so the pure helpers run in Node.

import {
  activateLicense,
  clearLicense,
  getStoredLicense,
  hasFeature,
  validateLicenseKey,
} from "./license";

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

export function runLicenseTests(): string {
  (globalThis as { localStorage?: Storage }).localStorage = makeLocalStorage();

  // Default (nothing stored).
  const initial = getStoredLicense();
  assert(initial.status === "UNKNOWN", "default status UNKNOWN");
  assert(initial.plan === "FREE", "default plan FREE");
  assert(hasFeature("unlimited_optimization", initial) === false, "free lacks pro feature");

  // Activate a recognized dev key.
  const active = activateLicense("hue-dev-12345"); // case-insensitive
  assert(active.status === "ACTIVE", "activated status ACTIVE");
  assert(active.plan === "PRO", "activated plan PRO");
  assert(hasFeature("unlimited_optimization", active) === true, "pro grants feature");

  // Persisted across reads.
  assert(getStoredLicense().status === "ACTIVE", "activation persisted");

  // Invalid key → INVALID, not persisted over the active one? (we only persist valid)
  const invalid = validateLicenseKey("NOPE");
  assert(invalid.status === "INVALID", "unknown key INVALID");
  assert(hasFeature("unlimited_optimization", invalid) === false, "invalid lacks feature");

  // Clear.
  const cleared = clearLicense();
  assert(cleared.status === "UNKNOWN", "cleared status UNKNOWN");
  assert(getStoredLicense().status === "UNKNOWN", "clear persisted");

  return "10 checks passed";
}
