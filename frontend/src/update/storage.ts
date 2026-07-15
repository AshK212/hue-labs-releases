// Persisted update state, using the same localStorage convention as theme /
// privacy / license (`lao.*`). Never throws.

export interface UpdateStore {
  /** Last version the user acknowledged (for the one-time "Updated" dialog). */
  lastSeenVersion?: string;
  /** Epoch ms of the last successful check (for "Last checked" across launches). */
  lastChecked?: number;
  /** Version whose restart banner the user dismissed with "Later". */
  dismissedVersion?: string;
}

const STORAGE_KEY = "lao.update";

export function readUpdateStore(): UpdateStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as UpdateStore;
  } catch {
    /* unavailable / corrupt — start fresh. */
  }
  return {};
}

export function writeUpdateStore(next: UpdateStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* best-effort. */
  }
}
