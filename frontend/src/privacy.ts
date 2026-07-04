/**
 * Privacy preferences — persisted with the same localStorage mechanism the theme
 * uses (see theme.ts). No new storage, no backend call. Getters/setters never
 * throw; if localStorage is unavailable we fall back to defaults in memory.
 *
 * Field names mirror the backend `PrivacySettings` contract so the two can be
 * synced later without a rename.
 */

export interface PrivacySettings {
  telemetry_enabled: boolean;
  benchmark_submission_enabled: boolean;
  crash_reports_enabled: boolean;
}

export const DEFAULT_PRIVACY: PrivacySettings = {
  telemetry_enabled: true,
  benchmark_submission_enabled: true,
  crash_reports_enabled: false,
};

const STORAGE_KEY = "lao.privacy";

/** Read persisted privacy settings, tolerating missing keys. Never throws. */
export function getStoredPrivacy(): PrivacySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PrivacySettings>;
      return { ...DEFAULT_PRIVACY, ...parsed };
    }
  } catch {
    /* localStorage unavailable / corrupt value — use defaults. */
  }
  return { ...DEFAULT_PRIVACY };
}

/** Persist privacy settings. Best-effort; the in-memory value still applies. */
export function setStoredPrivacy(next: PrivacySettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* Persistence is best-effort. */
  }
}
