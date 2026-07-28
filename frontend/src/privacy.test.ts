// Runner-agnostic test for privacy persistence.
//
// No unit-test runner is installed; importing one would break `tsc -b`. Call
// `runPrivacyTests()` to execute (verified via esbuild+node). It installs a fake
// localStorage so the pure get/set helpers can be exercised in Node.

import {
  announceAppOpenAfterSync,
  DEFAULT_PRIVACY,
  getStoredPrivacy,
  setStoredPrivacy,
} from "./privacy";

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

// --- app_open startup ordering (Stage 4.1) --------------------------------

export async function runAppOpenOrderingTests(): Promise<string> {
  const settings = { ...DEFAULT_PRIVACY };

  // 1. Privacy sync runs BEFORE app_open, and app_open runs when sync succeeds.
  {
    const order: string[] = [];
    await announceAppOpenAfterSync(settings, {
      sync: async () => {
        order.push("sync");
        return true;
      },
      trigger: async () => {
        order.push("trigger");
      },
    });
    assert(order.join(",") === "sync,trigger", "sync must run before trigger");
  }

  // 2. A failed sync (resolves false) must NOT trigger app_open.
  {
    let triggered = false;
    await announceAppOpenAfterSync(settings, {
      sync: async () => false,
      trigger: async () => {
        triggered = true;
      },
    });
    assert(triggered === false, "failed sync must not trigger app_open");
  }

  // 3. A rejected sync (throws) must NOT trigger app_open.
  {
    let triggered = false;
    await announceAppOpenAfterSync(settings, {
      sync: async () => {
        throw new Error("network down");
      },
      trigger: async () => {
        triggered = true;
      },
    });
    assert(triggered === false, "rejected sync must not trigger app_open");
  }

  // 4. A successful sync triggers app_open exactly once.
  {
    let count = 0;
    await announceAppOpenAfterSync(settings, {
      sync: async () => true,
      trigger: async () => {
        count += 1;
      },
    });
    assert(count === 1, "successful sync triggers app_open exactly once");
  }

  return "4 checks passed";
}
