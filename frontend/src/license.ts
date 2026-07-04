/**
 * License scaffold — mock validation + localStorage persistence (same mechanism
 * as theme.ts / privacy.ts). No payments, no checkout, no backend call yet.
 *
 * The recognized keys and plan→feature mapping mirror the backend
 * (app/licensing) so the two can be wired together later without a rename.
 */

export type LicenseStatus = "ACTIVE" | "TRIAL" | "EXPIRED" | "INVALID" | "UNKNOWN";

export interface LicenseState {
  status: LicenseStatus;
  license_key: string | null;
  plan: string;
  validated_at: string | null;
  expires_at: string | null;
  features: string[];
}

const PLAN_FEATURES: Record<string, string[]> = {
  FREE: ["basic_optimization"],
  PRO: [
    "basic_optimization",
    "unlimited_optimization",
    "advanced_candidates",
    "priority_submission",
  ],
};

// Keys the mock recognizes (case-insensitive) → plan.
const KNOWN_KEYS: Record<string, string> = {
  "HUE-DEV-12345": "PRO",
  "TEST-PRO": "PRO",
};

export const DEFAULT_LICENSE: LicenseState = {
  status: "UNKNOWN",
  license_key: null,
  plan: "FREE",
  validated_at: null,
  expires_at: null,
  features: PLAN_FEATURES.FREE,
};

const STORAGE_KEY = "lao.license";

/** Effective plan: FREE unless a valid, entitled license grants more. */
function effectivePlan(state: LicenseState): string {
  const entitled = state.status === "ACTIVE" || state.status === "TRIAL";
  return entitled && PLAN_FEATURES[state.plan] ? state.plan : "FREE";
}

/** Centralized feature check (mirror of the backend gates). */
export function hasFeature(feature: string, state: LicenseState): boolean {
  return PLAN_FEATURES[effectivePlan(state)].includes(feature);
}

/** Mock-validate a key into a LicenseState. Unknown keys → INVALID. */
export function validateLicenseKey(key: string): LicenseState {
  const trimmed = (key || "").trim();
  const plan = KNOWN_KEYS[trimmed.toUpperCase()];
  if (plan) {
    return {
      status: "ACTIVE",
      license_key: trimmed,
      plan,
      validated_at: new Date().toISOString(),
      expires_at: null,
      features: PLAN_FEATURES[plan],
    };
  }
  return { ...DEFAULT_LICENSE, status: "INVALID" };
}

/** Read persisted license, tolerating missing keys. Never throws. */
export function getStoredLicense(): LicenseState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LicenseState>;
      return { ...DEFAULT_LICENSE, ...parsed };
    }
  } catch {
    /* unavailable / corrupt — use default. */
  }
  return { ...DEFAULT_LICENSE };
}

/** Persist license state. Best-effort. */
export function setStoredLicense(next: LicenseState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* best-effort. */
  }
}

/** Validate + persist (valid states only) and return the resulting state. */
export function activateLicense(key: string): LicenseState {
  const state = validateLicenseKey(key);
  if (state.status !== "INVALID") setStoredLicense(state);
  return state;
}

/** Remove any license, persisting and returning the default free state. */
export function clearLicense(): LicenseState {
  setStoredLicense(DEFAULT_LICENSE);
  return { ...DEFAULT_LICENSE };
}
