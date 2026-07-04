/**
 * Auto-update lifecycle for the desktop shell (electron-updater).
 *
 * Responsibilities (and nothing else — no window, backend, or UI logic lives here):
 *   - check for updates
 *   - download updates
 *   - install updates (on quit, after the backend is stopped cleanly)
 *   - forward update events to the renderer
 *
 * Safety guarantees:
 *   - Disabled entirely in development (no app-update.yml, nothing to install).
 *   - Never throws into startup: a missing/unreachable feed only logs an error.
 *   - Installation waits for the caller-provided `onBeforeInstall` hook so the
 *     bundled Python backend is stopped and its files unlocked before the NSIS
 *     installer swaps them. See docs/RELEASE.md for the full shutdown sequence.
 */
import { app, BrowserWindow } from "electron";
import { autoUpdater } from "electron-updater";

import { isDev } from "./config";
import { log } from "./logger";

export interface UpdaterOptions {
  /** How the updater reaches the current main window to forward events. */
  getWindow: () => BrowserWindow | null;
  /**
   * Awaited right before the installer runs. Must stop the backend and release
   * any file locks. Provided by main.ts (stopBackendAndWait).
   */
  onBeforeInstall: () => Promise<void>;
  /** Re-check cadence in ms. 0 disables periodic checks. Default: 6 hours. */
  checkIntervalMs?: number;
}

let initialized = false;
let pendingInstall = false;
let installing = false;

/** Send an update event to the renderer if a live window exists. */
function emit(win: BrowserWindow | null, channel: string, payload?: unknown): void {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

/**
 * Wire up the auto-updater. Idempotent and a no-op in development. Call once the
 * main window exists so events can be forwarded to the UI.
 */
export function initAutoUpdater(options: UpdaterOptions): void {
  if (initialized) return;

  if (isDev) {
    // No packaged installer + no app-update.yml in dev — checking would only error.
    log.info("updater", "development mode — auto-updates disabled");
    return;
  }
  initialized = true;

  const { getWindow, onBeforeInstall, checkIntervalMs = 6 * 60 * 60 * 1000 } = options;

  // We manage install timing ourselves so the backend can be stopped first.
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;

  // Route electron-updater's own logging into our unified log.
  autoUpdater.logger = {
    info: (m?: unknown) => log.info("updater", String(m)),
    warn: (m?: unknown) => log.warn("updater", String(m)),
    error: (m?: unknown) => log.error("updater", String(m)),
    debug: (m: string) => log.info("updater", m),
  };

  // --- Lifecycle events ---------------------------------------------------

  autoUpdater.on("checking-for-update", () => {
    log.info("updater", "checking for updates");
    emit(getWindow(), "update:checking");
  });

  autoUpdater.on("update-available", (info) => {
    log.info("updater", `update available: ${info.version}`);
    emit(getWindow(), "update:available", { version: info.version });
  });

  autoUpdater.on("update-not-available", (info) => {
    log.info("updater", `no update available (current ${info.version})`);
    emit(getWindow(), "update:none", { version: info.version });
  });

  autoUpdater.on("download-progress", (progress) => {
    const percent = Math.round(progress.percent);
    const kbps = Math.round(progress.bytesPerSecond / 1024);
    log.info("updater", `downloading update: ${percent}% (${kbps} KB/s)`);
    emit(getWindow(), "update:progress", { percent, bytesPerSecond: progress.bytesPerSecond });
  });

  autoUpdater.on("update-downloaded", (info) => {
    pendingInstall = true;
    log.info("updater", `update downloaded: ${info.version} — will install on quit`);
    emit(getWindow(), "update:downloaded", { version: info.version });
  });

  autoUpdater.on("error", (err) => {
    // A missing/unreachable feed (e.g. the placeholder URL) lands here. This is
    // non-fatal by design — the app must keep working with no update server.
    const message = err instanceof Error ? err.message : String(err);
    log.error("updater", `updater error (non-fatal): ${message}`);
    emit(getWindow(), "update:error", { message });
  });

  // --- Install on quit ----------------------------------------------------
  // If an update is staged, intercept quit, stop the backend cleanly, then run
  // the installer. Registered after main.ts's own before-quit cleanup, so the
  // backend has already been signalled; we then wait for it to actually exit.
  app.on("before-quit", (event) => {
    if (!pendingInstall || installing) return;
    installing = true;
    event.preventDefault();
    log.info("updater", "staged update pending — stopping backend before install");
    onBeforeInstall()
      .catch((err) =>
        log.error("updater", `backend shutdown before install failed: ${String(err)}`)
      )
      .finally(() => {
        log.info("updater", "backend stopped — running installer (quitAndInstall)");
        // isSilent=true (no NSIS UI), isForceRunAfter=true (relaunch after update).
        autoUpdater.quitAndInstall(true, true);
      });
  });

  // Initial check shortly after startup, then on an interval.
  void safeCheck();
  if (checkIntervalMs > 0) {
    setInterval(() => void safeCheck(), checkIntervalMs);
  }
}

/** Trigger an update check now. Never throws. */
export async function checkForUpdates(): Promise<void> {
  if (!initialized) return;
  await safeCheck();
}

/** True once an update has been downloaded and is waiting to install on quit. */
export function isUpdatePending(): boolean {
  return pendingInstall;
}

async function safeCheck(): Promise<void> {
  try {
    await autoUpdater.checkForUpdates();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error("updater", `checkForUpdates failed (non-fatal): ${message}`);
  }
}
