/**
 * Application entry point and startup orchestrator.
 *
 * Startup sequence:
 *   splash → start backend → health check → load UI → reveal main window
 *
 * Shutdown always tears down the backend process (and the production UI server)
 * so nothing is left running after the window closes.
 */
import { app, BrowserWindow, dialog, ipcMain } from "electron";

import { startBackend, stopBackend, waitForBackendReady } from "./backend";
import { DEV_SERVER_URL, WINDOW_TITLE, isDev } from "./config";
import { log } from "./logger";
import { startProdServer, stopProdServer } from "./server";
import { createMainWindow, createSplashWindow } from "./window";

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;

// Ensure only one instance runs; a second launch focuses the existing window.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(bootstrap).catch(fatal);
}

/** The full startup flow, run once the Electron runtime is ready. */
async function bootstrap(): Promise<void> {
  log.info("main", `starting ${WINDOW_TITLE} (${isDev ? "development" : "production"})`);

  // Renderer can ask for the app version over IPC (see preload.ts).
  ipcMain.handle("app:getVersion", () => app.getVersion());

  // Custom title bar controls: minimize / maximize-toggle / close, addressed to
  // whichever window sent the request.
  ipcMain.on("window:minimize", (e) => BrowserWindow.fromWebContents(e.sender)?.minimize());
  ipcMain.on("window:maximizeToggle", (e) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (!w) return;
    if (w.isMaximized()) w.unmaximize();
    else w.maximize();
  });
  ipcMain.on("window:close", (e) => BrowserWindow.fromWebContents(e.sender)?.close());
  ipcMain.handle(
    "window:isMaximized",
    (e) => BrowserWindow.fromWebContents(e.sender)?.isMaximized() ?? false
  );

  // 1. Show the splash immediately so the user gets instant feedback.
  splashWindow = createSplashWindow();

  // 2. Start the backend and wait until it reports healthy.
  try {
    startBackend();
    await waitForBackendReady();
  } catch (err) {
    return fatal(err);
  }

  // 3. Decide which URL hosts the UI: Vite in dev, our local server in prod.
  let uiUrl: string;
  try {
    uiUrl = isDev ? DEV_SERVER_URL : await startProdServer();
  } catch (err) {
    return fatal(err);
  }

  // 4. Create the (hidden) main window and load the UI.
  mainWindow = createMainWindow();
  log.info("main", `loading UI from ${uiUrl}`);
  await mainWindow.loadURL(uiUrl);

  // 5. Reveal the main window and dismiss the splash together.
  mainWindow.show();
  mainWindow.focus();
  splashWindow?.close();
  splashWindow = null;
  log.info("main", "application window ready");

  // Open devtools only when explicitly requested in dev via env flag.
  if (isDev && process.env.LAO_DEVTOOLS === "1") {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

/**
 * Handle any unrecoverable startup error: log it, tell the user plainly, clean
 * up, and exit. Never leave the app hanging on a blank window.
 */
function fatal(err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  log.error("main", `fatal startup error: ${message}`);
  splashWindow?.close();
  splashWindow = null;
  dialog.showErrorBox(
    `${WINDOW_TITLE} — startup failed`,
    `The application could not start.\n\n${message}\n\n` +
      `Please ensure nothing else is using the required ports and try again.`
  );
  cleanup();
  app.quit();
}

/** Tear down owned resources. Safe to call more than once. */
function cleanup(): void {
  stopBackend();
  stopProdServer();
}

// --- App-wide lifecycle wiring -------------------------------------------

// Quit when all windows are closed (standard behaviour on Windows/Linux).
app.on("window-all-closed", () => {
  app.quit();
});

// Re-create the window if the app is activated with no windows (mainly macOS).
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0 && !splashWindow) {
    bootstrap().catch(fatal);
  }
});

// Guarantee the backend is stopped no matter how the app exits.
app.on("before-quit", cleanup);
app.on("will-quit", cleanup);
process.on("exit", cleanup);
// Forward Ctrl+C in a dev terminal into a clean shutdown.
process.on("SIGINT", () => app.quit());
process.on("SIGTERM", () => app.quit());
