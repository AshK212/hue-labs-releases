/**
 * Backend lifecycle manager.
 *
 * Owns the FastAPI process for the whole app session:
 *   - starts it (uvicorn in dev, the PyInstaller exe in production),
 *   - waits until its /health endpoint answers,
 *   - guarantees it is terminated when Electron exits.
 *
 * This module knows nothing about windows or the UI — it only manages a child
 * process and reports readiness. No backend business logic lives here.
 */
import { app } from "electron";
import { spawn, type ChildProcess } from "node:child_process";
import http from "node:http";
import path from "node:path";

import {
  BACKEND_HOST,
  BACKEND_PORT,
  BACKEND_READY_TIMEOUT_MS,
  HEALTH_URL,
  backendDevDir,
  backendExePath,
  isDev,
} from "./config";
import { log } from "./logger";

/** The running backend child process, or null when not started / stopped. */
let backendProcess: ChildProcess | null = null;
/** Guard so we only ever send one shutdown signal. */
let stopping = false;
/**
 * Resolves when the current backend process has actually exited. Lets callers
 * (the updater) wait for the process to die before replacing its files. Starts
 * resolved because nothing is running yet.
 */
let backendExited: Promise<void> = Promise.resolve();

/**
 * Launch the backend process.
 *
 * In development we invoke uvicorn from the project's virtualenv against the
 * live source tree (so the existing `app.main:app` runs unchanged). In
 * production we launch the self-contained executable produced by PyInstaller,
 * which bundles Python and every dependency.
 */
export function startBackend(): ChildProcess {
  if (backendProcess) {
    log.warn("backend", "startBackend() called but a process is already running");
    return backendProcess;
  }

  // Both entry points read host/port from the environment so the shell stays
  // the single source of truth for where the backend listens.
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    LAO_BACKEND_HOST: BACKEND_HOST,
    LAO_BACKEND_PORT: String(BACKEND_PORT),
    // Keep Python output unbuffered so our log forwarding is real-time.
    PYTHONUNBUFFERED: "1",
  };

  if (isDev) {
    const cwd = backendDevDir();
    const python = path.join(cwd, ".venv", "Scripts", "python.exe");
    log.info("backend", `dev mode — launching uvicorn via ${python}`);
    backendProcess = spawn(
      python,
      [
        "-m",
        "uvicorn",
        "app.main:app",
        "--host",
        BACKEND_HOST,
        "--port",
        String(BACKEND_PORT),
      ],
      { cwd, env, windowsHide: true }
    );
  } else {
    const exe = backendExePath();
    // Inside the read-only install directory the backend's default data folder
    // isn't writable, so redirect its SQLite history DB to the per-user data
    // dir. config.py already honours LAO_DATA_DIR — no backend change needed.
    env.LAO_DATA_DIR = path.join(app.getPath("userData"), "data");
    log.info("backend", `production mode — launching bundled backend ${exe}`);
    log.info("backend", `data directory: ${env.LAO_DATA_DIR}`);
    backendProcess = spawn(exe, [], {
      cwd: path.dirname(exe),
      env,
      windowsHide: true,
    });
  }

  // Forward the backend's stdout/stderr into our unified log so problems are
  // visible in dev consoles and production log files alike.
  backendProcess.stdout?.on("data", (d: Buffer) =>
    log.info("backend:out", d.toString().trimEnd())
  );
  backendProcess.stderr?.on("data", (d: Buffer) =>
    // uvicorn writes its normal access/info log to stderr; not an error per se.
    log.info("backend:err", d.toString().trimEnd())
  );

  backendProcess.on("exit", (code, signal) => {
    log.info("backend", `process exited (code=${code}, signal=${signal})`);
    backendProcess = null;
  });
  backendProcess.on("error", (err) => {
    log.error("backend", `failed to start backend process: ${err.message}`);
  });

  // Track this process's exit so callers can await a clean shutdown. The handle
  // is captured now because stopBackend() clears `backendProcess` eagerly.
  const started = backendProcess;
  backendExited = new Promise<void>((resolve) => {
    started.once("exit", () => resolve());
  });
  // A fresh process means a fresh shutdown cycle.
  stopping = false;

  return backendProcess;
}

/**
 * Resolve once the backend answers a health check, or reject after the
 * configured timeout. Polls every 400 ms so startup feels responsive.
 */
export function waitForBackendReady(
  timeoutMs: number = BACKEND_READY_TIMEOUT_MS
): Promise<void> {
  const started = Date.now();
  const intervalMs = 400;

  return new Promise<void>((resolve, reject) => {
    const attempt = () => {
      pingHealth()
        .then(() => {
          log.info("backend", `health check passed after ${Date.now() - started}ms`);
          resolve();
        })
        .catch(() => {
          if (Date.now() - started > timeoutMs) {
            reject(
              new Error(
                `Backend did not become healthy within ${timeoutMs}ms (${HEALTH_URL}).`
              )
            );
            return;
          }
          setTimeout(attempt, intervalMs);
        });
    };
    attempt();
  });
}

/** Single GET /health probe. Resolves on HTTP 200, rejects otherwise. */
function pingHealth(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const req = http.get(HEALTH_URL, { timeout: 2000 }, (res) => {
      // Drain the response so the socket is freed.
      res.resume();
      if (res.statusCode === 200) resolve();
      else reject(new Error(`health status ${res.statusCode}`));
    });
    req.on("timeout", () => req.destroy(new Error("health timeout")));
    req.on("error", reject);
  });
}

/**
 * Terminate the backend process. Safe to call multiple times and from exit
 * handlers. Uses taskkill on Windows to also reap any child processes uvicorn
 * or PyInstaller may have spawned.
 */
export function stopBackend(): void {
  if (!backendProcess || stopping) return;
  stopping = true;

  const proc = backendProcess;
  log.info("backend", `stopping backend (pid=${proc.pid})`);

  try {
    if (process.platform === "win32" && proc.pid) {
      // /T kills the whole process tree, /F forces it. This reliably stops
      // uvicorn's reloader/worker children and the bundled exe's subprocess.
      spawn("taskkill", ["/pid", String(proc.pid), "/T", "/F"], {
        windowsHide: true,
      });
    } else {
      proc.kill("SIGTERM");
    }
  } catch (err) {
    log.error("backend", `error while stopping backend: ${String(err)}`);
  } finally {
    backendProcess = null;
  }
}

/**
 * Stop the backend and wait until the process has *actually* exited (or a
 * timeout elapses), so its files are unlocked before an in-place update replaces
 * them. Used by the updater immediately before quitAndInstall.
 *
 * Shutdown sequence:
 *   1. stopBackend() sends taskkill /T /F (Windows) or SIGTERM to the process
 *      tree — this reaps uvicorn's children and the PyInstaller subprocess.
 *   2. We await the process's real "exit" event (tracked in `backendExited`).
 *   3. If it hasn't exited within `timeoutMs`, we resolve anyway (best effort)
 *      rather than blocking the update forever.
 */
export async function stopBackendAndWait(timeoutMs = 8000): Promise<void> {
  stopBackend();
  await Promise.race([
    backendExited,
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}
