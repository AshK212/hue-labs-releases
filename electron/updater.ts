/**
 * Auto-update lifecycle for the desktop shell (electron-updater).
 *
 * This is the single owner of update state in the main process. It:
 *   - checks / downloads / installs updates (install waits for a clean backend
 *     shutdown via the caller's `onBeforeInstall` hook),
 *   - tracks one consolidated `UpdateSnapshot` and pushes it to the renderer as a
 *     single `update:state` event (no granular event soup, no polling),
 *   - exposes IPC so the UI can read the current state, trigger a check, and
 *     request an immediate restart-to-update.
 *
 * Safety:
 *   - In development there is no `app-update.yml`; auto-checks are disabled, but
 *     the IPC still answers (state stays "idle") so the UI never errors.
 *   - Never throws into startup — a missing/unreachable feed just sets an error
 *     state and the app keeps running.
 */
import { app, BrowserWindow, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";

import { isDev } from "./config";
import { log } from "./logger";

export type UpdateStatus =
  | "idle"
  | "checking"
  | "up_to_date"
  | "update_available"
  | "downloading"
  | "downloaded"
  | "restart_required"
  | "error";

export interface UpdateSnapshot {
  status: UpdateStatus;
  /** Version of the available/downloaded update (null when none). */
  availableVersion: string | null;
  percent: number;
  bytesPerSecond: number;
  /** Epoch ms of the last check start (null until first check). */
  lastChecked: number | null;
  error: string | null;
  /** False in development (nothing to update). */
  autoUpdatesEnabled: boolean;
}

export interface UpdaterOptions {
  getWindow: () => BrowserWindow | null;
  /** Awaited before the installer runs — must stop the backend and free locks. */
  onBeforeInstall: () => Promise<void>;
  /** Re-check cadence in ms. 0 disables periodic checks. Default: 6 hours. */
  checkIntervalMs?: number;
}

let initialized = false;
let ipcRegistered = false;
let pendingInstall = false;
let installing = false;
let getWindowRef: () => BrowserWindow | null = () => null;
let onBeforeInstallRef: (() => Promise<void>) | null = null;

const state: UpdateSnapshot = {
  status: "idle",
  availableVersion: null,
  percent: 0,
  bytesPerSecond: 0,
  lastChecked: null,
  error: null,
  autoUpdatesEnabled: !isDev,
};

function pushState(patch: Partial<UpdateSnapshot>): void {
  Object.assign(state, patch);
  const win = getWindowRef();
  if (win && !win.isDestroyed()) win.webContents.send("update:state", { ...state });
}

/** Register the renderer-facing IPC once (works in dev and production). */
function registerIpc(): void {
  if (ipcRegistered) return;
  ipcRegistered = true;

  ipcMain.handle("update:getState", () => ({ ...state }));
  ipcMain.handle("update:check", async () => {
    await safeCheck();
    return { ...state };
  });
  ipcMain.on("update:restart", () => {
    void installNow();
  });
}

/**
 * Wire up the auto-updater. Idempotent. Registers IPC always; only arms the
 * actual electron-updater flow in production.
 */
export function initAutoUpdater(options: UpdaterOptions): void {
  if (initialized) return;
  initialized = true;

  getWindowRef = options.getWindow;
  onBeforeInstallRef = options.onBeforeInstall;
  registerIpc();

  if (isDev) {
    log.info("updater", "development mode — auto-updates disabled (IPC still answers)");
    pushState({ status: "idle", autoUpdatesEnabled: false });
    return;
  }

  const { checkIntervalMs = 6 * 60 * 60 * 1000 } = options;

  // We manage install timing ourselves so the backend can be stopped first.
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.logger = {
    info: (m?: unknown) => log.info("updater", String(m)),
    warn: (m?: unknown) => log.warn("updater", String(m)),
    error: (m?: unknown) => log.error("updater", String(m)),
    debug: (m: string) => log.info("updater", m),
  };

  // --- Lifecycle events → one consolidated snapshot -----------------------

  autoUpdater.on("checking-for-update", () => {
    log.info("updater", "checking for updates");
    pushState({ status: "checking", error: null, lastChecked: Date.now() });
  });

  autoUpdater.on("update-available", (info) => {
    log.info("updater", `update available: ${info.version}`);
    pushState({ status: "update_available", availableVersion: info.version });
  });

  autoUpdater.on("update-not-available", (info) => {
    log.info("updater", `no update available (current ${info.version})`);
    pushState({ status: "up_to_date", availableVersion: null, lastChecked: Date.now() });
  });

  autoUpdater.on("download-progress", (progress) => {
    pushState({
      status: "downloading",
      percent: Math.round(progress.percent),
      bytesPerSecond: progress.bytesPerSecond,
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    pendingInstall = true;
    log.info("updater", `update downloaded: ${info.version} — restart required`);
    // Emitted once; we go straight to the actionable "restart_required" state.
    pushState({ status: "restart_required", availableVersion: info.version, percent: 100 });
  });

  autoUpdater.on("error", (err) => {
    const message = err instanceof Error ? err.message : String(err);
    log.error("updater", `updater error (non-fatal): ${message}`);
    pushState({ status: "error", error: message, lastChecked: Date.now() });
  });

  // --- Install on quit ----------------------------------------------------
  app.on("before-quit", (event) => {
    if (!pendingInstall || installing) return;
    installing = true;
    event.preventDefault();
    log.info("updater", "staged update pending — stopping backend before install");
    runInstall();
  });

  // Initial check shortly after startup, then on an interval.
  void safeCheck();
  if (checkIntervalMs > 0) setInterval(() => void safeCheck(), checkIntervalMs);
}

/** Explicit restart-to-update (from the UI). Same clean sequence as on-quit. */
async function installNow(): Promise<void> {
  if (isDev || !pendingInstall || installing) return;
  installing = true;
  log.info("updater", "restart-to-update requested by UI");
  runInstall();
}

/** Stop the backend, then run the NSIS installer and relaunch. */
function runInstall(): void {
  const stop = onBeforeInstallRef ? onBeforeInstallRef() : Promise.resolve();
  stop
    .catch((err) =>
      log.error("updater", `backend shutdown before install failed: ${String(err)}`)
    )
    .finally(() => {
      log.info("updater", "backend stopped — running installer (quitAndInstall)");
      autoUpdater.quitAndInstall(true, true);
    });
}

async function safeCheck(): Promise<void> {
  if (isDev) return; // nothing to check without a packaged app-update.yml
  try {
    await autoUpdater.checkForUpdates();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error("updater", `checkForUpdates failed (non-fatal): ${message}`);
    pushState({ status: "error", error: message, lastChecked: Date.now() });
  }
}
