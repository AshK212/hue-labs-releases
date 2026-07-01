/**
 * Production UI host.
 *
 * In development Vite serves the React app and proxies `/api` to the backend.
 * In a packaged build there is no Vite, so this tiny Node HTTP server takes its
 * place: it serves the pre-built static frontend and reverse-proxies every
 * `/api/*` request to the FastAPI backend (stripping the `/api` prefix), exactly
 * mirroring the dev proxy in vite.config.ts.
 *
 * Because the UI and its API calls share one origin, the React app's relative
 * `/api` fetches keep working with zero changes, and streaming responses (the
 * model-download progress stream) pass straight through via piping.
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

import { BACKEND_HOST, BACKEND_PORT, PROD_UI_HOST, PROD_UI_PORT, frontendDistDir } from "./config";
import { log } from "./logger";

/** Common file extensions -> Content-Type for the static file server. */
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
};

let server: http.Server | null = null;

/**
 * Start the production UI server. Resolves with the URL to load once it is
 * listening. No-op guard if already started.
 */
export function startProdServer(): Promise<string> {
  if (server) return Promise.resolve(`http://${PROD_UI_HOST}:${PROD_UI_PORT}`);

  const root = frontendDistDir();
  log.info("server", `serving built frontend from ${root}`);

  return new Promise((resolve, reject) => {
    server = http.createServer((req, res) => {
      const url = req.url ?? "/";
      if (url === "/api" || url.startsWith("/api/")) {
        proxyToBackend(req, res);
      } else {
        serveStatic(root, url, res);
      }
    });

    server.on("error", (err) => {
      log.error("server", `UI server error: ${err.message}`);
      reject(err);
    });

    server.listen(PROD_UI_PORT, PROD_UI_HOST, () => {
      const address = `http://${PROD_UI_HOST}:${PROD_UI_PORT}`;
      log.info("server", `production UI available at ${address}`);
      resolve(address);
    });
  });
}

/** Stop the UI server (called on app shutdown). */
export function stopProdServer(): void {
  server?.close();
  server = null;
}

/**
 * Reverse-proxy an `/api/*` request to the backend, rewriting `/api/foo` to
 * `/foo`. The request and response bodies are piped so streaming endpoints work
 * unchanged.
 */
function proxyToBackend(req: http.IncomingMessage, res: http.ServerResponse): void {
  const rewrittenPath = (req.url ?? "/api").replace(/^\/api/, "") || "/";
  const options: http.RequestOptions = {
    host: BACKEND_HOST,
    port: BACKEND_PORT,
    method: req.method,
    path: rewrittenPath,
    headers: { ...req.headers, host: `${BACKEND_HOST}:${BACKEND_PORT}` },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    log.error("server", `proxy error for ${req.url}: ${err.message}`);
    if (!res.headersSent) res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ detail: "Backend unavailable." }));
  });

  req.pipe(proxyReq);
}

/**
 * Serve a static asset from the built frontend. Unknown paths fall back to
 * index.html so the single-page app can handle client-side routing.
 */
function serveStatic(root: string, rawUrl: string, res: http.ServerResponse): void {
  // Strip query string and decode, then resolve safely inside the root.
  const pathname = decodeURIComponent(rawUrl.split("?")[0]);
  let filePath = path.join(root, pathname);

  // Prevent path traversal outside the served directory.
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || stats.isDirectory()) {
      // Directory or missing file -> serve the SPA entry point.
      filePath = path.join(root, "index.html");
    }
    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
      res.end(data);
    });
  });
}
