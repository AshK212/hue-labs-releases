/**
 * Central configuration for the Electron desktop shell.
 *
 * Everything the shell needs to know about ports, URLs, timeouts and the window
 * lives here so the rest of the code stays declarative. No business logic.
 */
import { app } from "electron";
import path from "node:path";

/** True when running the unpackaged app (npm run desktop), false in the installer. */
export const isDev = !app.isPackaged;

// --- Backend (FastAPI) ---------------------------------------------------
export const BACKEND_HOST = "127.0.0.1";
export const BACKEND_PORT = 8000;
export const BACKEND_URL = `http://${BACKEND_HOST}:${BACKEND_PORT}`;
export const HEALTH_URL = `${BACKEND_URL}/health`;
/** How long to wait for the backend health check before giving up. */
export const BACKEND_READY_TIMEOUT_MS = 60_000;

// --- Frontend ------------------------------------------------------------
/** In dev the Vite dev server hosts the UI (and proxies /api itself). */
export const DEV_SERVER_URL = "http://127.0.0.1:5173";
/**
 * In production the shell hosts the built frontend on this local port and
 * proxies /api -> the backend, mirroring Vite's dev proxy so the frontend's
 * relative /api calls keep working with zero changes to the React app.
 */
export const PROD_UI_HOST = "127.0.0.1";
export const PROD_UI_PORT = 5199;
export const PROD_UI_URL = `http://${PROD_UI_HOST}:${PROD_UI_PORT}`;

// --- Window --------------------------------------------------------------
export const WINDOW = {
  width: 1600,
  height: 1000,
  minWidth: 1200,
  minHeight: 800,
};
/** Matches the application background (body base colour in index.css). */
export const BACKGROUND_COLOR = "#f5f7fc";
export const WINDOW_TITLE = "Local AI Optimizer";

// --- Paths ---------------------------------------------------------------
/** The app root: the project folder in dev, the asar root in production. */
export function appRoot(): string {
  return app.getAppPath();
}

/** The built frontend directory (only used in production). */
export function frontendDistDir(): string {
  return path.join(appRoot(), "frontend", "dist");
}

/** The bundled backend executable produced by PyInstaller (production only). */
export function backendExePath(): string {
  return path.join(process.resourcesPath, "backend", "lao-backend.exe");
}

/** The backend source folder used to launch uvicorn in development. */
export function backendDevDir(): string {
  return path.join(appRoot(), "backend");
}

/** The splash screen HTML, resolvable in both dev and packaged builds. */
export function splashHtmlPath(): string {
  return path.join(appRoot(), "electron", "splash.html");
}
