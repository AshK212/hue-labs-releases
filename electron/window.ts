/**
 * Window factory.
 *
 * Creates the two windows the app uses — a small frameless splash shown during
 * startup, and the main application window. All visual/window options are
 * sourced from config.ts so behaviour stays declarative here.
 */
import { BrowserWindow, shell } from "electron";
import path from "node:path";

import { BACKGROUND_COLOR, WINDOW, WINDOW_TITLE, splashHtmlPath } from "./config";
import { log } from "./logger";

/**
 * Route external links to the user's default browser instead of spawning a new
 * Electron window. Links in the UI that use `target="_blank"` (e.g. the Ollama
 * download page) trigger `window.open`, which Electron would otherwise open as
 * an in-app window. We deny that and hand the URL to the OS browser as a new
 * tab. Local app/backend URLs (127.0.0.1 / localhost) are never opened out.
 */
function openExternalLinksInBrowser(win: BrowserWindow): void {
  const isExternalHttp = (url: string): boolean => {
    try {
      const u = new URL(url);
      const isHttp = u.protocol === "http:" || u.protocol === "https:";
      const isLocal = u.hostname === "127.0.0.1" || u.hostname === "localhost";
      return isHttp && !isLocal;
    } catch {
      return false;
    }
  };

  // target="_blank" / window.open → open in the browser, never as an app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalHttp(url)) void shell.openExternal(url);
    return { action: "deny" };
  });

  // Plain external links (or any attempt to navigate the main window away from
  // the app) → keep the app put and send the URL to the browser instead.
  win.webContents.on("will-navigate", (event, url) => {
    if (isExternalHttp(url)) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });
}

/**
 * Create the frameless, always-centered splash window shown while the backend
 * boots. It has no web APIs exposed — it is purely presentational.
 */
export function createSplashWindow(): BrowserWindow {
  const splash = new BrowserWindow({
    width: 460,
    height: 300,
    frame: false,
    resizable: false,
    center: true,
    show: false,
    backgroundColor: BACKGROUND_COLOR,
    // Keep the splash above other windows so it reads as the app launching.
    alwaysOnTop: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  splash.loadFile(splashHtmlPath());
  splash.once("ready-to-show", () => splash.show());
  log.info("window", "splash window created");
  return splash;
}

/**
 * Create the main application window. It is created hidden and revealed by the
 * caller (main.ts) only once the UI has finished loading, so the user never
 * sees a blank white frame.
 */
export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: WINDOW.width,
    height: WINDOW.height,
    minWidth: WINDOW.minWidth,
    minHeight: WINDOW.minHeight,
    center: true,
    show: false,
    title: WINDOW_TITLE,
    backgroundColor: BACKGROUND_COLOR,
    autoHideMenuBar: true,
    // Custom title bar: hide the native caption + buttons but keep the native
    // frame so resizing, aero-snap and window shadows all still work. The
    // renderer draws its own draggable title bar and min/max/close controls.
    titleBarStyle: "hidden",
    webPreferences: {
      // Secure defaults: isolate the preload/context, no Node in the renderer.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // External links open in the default browser (a new tab), not a new app window.
  openExternalLinksInBrowser(win);

  // Keep the OS window title fixed to the product name even if the page tries
  // to change document.title.
  win.on("page-title-updated", (e) => {
    e.preventDefault();
    win.setTitle(WINDOW_TITLE);
  });

  // Tell the renderer when the maximize state changes so its restore/maximize
  // icon can stay in sync.
  win.on("maximize", () => win.webContents.send("window:maximized"));
  win.on("unmaximize", () => win.webContents.send("window:unmaximized"));

  log.info("window", "main window created");
  return win;
}
