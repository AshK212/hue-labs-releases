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
  // Mirror the choice into the backend so telemetry/benchmark gating is honored
  // server-side. Only booleans cross this boundary — never any secret.
  syncPrivacyToBackend(next);
}

/**
 * Push privacy settings to the local backend (`POST /api/privacy/settings`).
 * Never throws and never blocks the UI; carries booleans only. Resolves to
 * `true` when the backend accepted the update, `false` on any failure — callers
 * use that to decide whether it's safe to proceed (e.g. trigger app_open).
 */
export function syncPrivacyToBackend(settings: PrivacySettings): Promise<boolean> {
  try {
    return fetch("/api/privacy/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    })
      .then((r) => r.ok)
      .catch(() => false); // backend not up yet / offline — local value still applies
  } catch {
    return Promise.resolve(false); // fetch unavailable — best-effort only
  }
}

/**
 * Ask the backend to emit the launch `app_open` event. No body, no secret. The
 * backend gates on its persisted telemetry setting and emits at most once per
 * process. Best-effort; never throws.
 */
export function triggerAppOpen(): Promise<void> {
  try {
    return fetch("/api/telemetry/app-open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    })
      .then(() => undefined)
      .catch(() => undefined);
  } catch {
    return Promise.resolve();
  }
}

/**
 * Launch orchestration: sync the stored privacy settings to the backend FIRST,
 * and only trigger `app_open` if that sync resolved successfully. If the sync
 * fails (or throws), `app_open` is not triggered — so the backend never emits
 * app_open against a stale/unsynced telemetry preference.
 *
 * Dependencies are injectable purely so this ordering can be unit-tested.
 */
export async function announceAppOpenAfterSync(
  settings: PrivacySettings,
  deps: {
    sync?: (s: PrivacySettings) => Promise<boolean>;
    trigger?: () => Promise<void>;
  } = {}
): Promise<void> {
  const sync = deps.sync ?? syncPrivacyToBackend;
  const trigger = deps.trigger ?? triggerAppOpen;
  let synced = false;
  try {
    synced = await sync(settings);
  } catch {
    synced = false; // a rejected sync is treated as failure — no app_open
  }
  if (synced) {
    await trigger();
  }
}
