/**
 * Packaged production configuration loader.
 *
 * The installed app ships a small `production.json` (an Electron extraResource,
 * generated at build time from a GitHub secret) that carries the hosted Hue Labs
 * service URL and API key. This module reads and validates that file and works
 * out which values to inject into the Python backend child process.
 *
 * Security & safety contract:
 *   - This is the ONLY place the packaged file is read. The values it yields are
 *     injected into the backend child's environment and nowhere else — never the
 *     renderer, preload, or IPC.
 *   - Nothing here logs a secret. `summarizeProductionConfig` returns presence
 *     booleans only, for a safe one-line log.
 *   - Every function is total: a missing, unreadable, or malformed file yields
 *     `null`, never a thrown exception, so the app always launches.
 *
 * Deliberately dependency-free (only `node:fs`/`node:path`, no `electron`) so it
 * can be unit-tested as plain compiled JS without an Electron runtime.
 */
import fs from "node:fs";
import path from "node:path";

/** Shape of the packaged production configuration. Both fields are optional. */
export interface ProductionConfig {
  /** Base URL of the hosted Hue Labs service. */
  apiBaseUrl?: string;
  /** API key for authenticated cloud submissions. */
  apiKey?: string;
}

/** The API env vars injected into the backend child process. */
export interface ProductionEnv {
  HUE_LABS_API_BASE_URL?: string;
  HUE_LABS_API_KEY?: string;
}

/** Basename of the packaged config file placed at the resources root. */
export const PRODUCTION_CONFIG_BASENAME = "production.json";

/**
 * Parse production config JSON text. Returns `null` for empty/malformed input,
 * a non-object, or an object with neither usable string field. Never throws.
 */
export function parseProductionConfig(raw: string | null | undefined): ProductionConfig | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null; // malformed JSON — treated as "no config", value never surfaced
  }

  if (typeof parsed !== "object" || parsed === null) return null;

  const obj = parsed as Record<string, unknown>;
  const apiBaseUrl = typeof obj.apiBaseUrl === "string" ? obj.apiBaseUrl : undefined;
  const apiKey = typeof obj.apiKey === "string" ? obj.apiKey : undefined;

  // Nothing usable → behave as if there were no config at all.
  if (apiBaseUrl === undefined && apiKey === undefined) return null;

  return { apiBaseUrl, apiKey };
}

/**
 * Read the packaged config file text from a resources directory. Returns `null`
 * if the file is absent or unreadable. Never throws.
 */
export function readProductionConfigText(resourcesPath: string): string | null {
  try {
    const file = path.join(resourcesPath, PRODUCTION_CONFIG_BASENAME);
    if (!fs.existsSync(file)) return null;
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

/**
 * Load and validate the packaged config from a resources directory. Returns
 * `null` when the file is missing or malformed. Never throws.
 */
export function loadProductionConfig(resourcesPath: string): ProductionConfig | null {
  return parseProductionConfig(readProductionConfigText(resourcesPath));
}

/**
 * Resolve the API env values to inject into the backend child.
 *
 * Precedence: an explicit `process.env` value always wins (so a developer or
 * operator can override), then the packaged file, then nothing. Only defined,
 * non-empty values are returned — an absent key means cloud submission stays
 * disabled downstream.
 */
export function resolveProductionEnv(
  env: NodeJS.ProcessEnv,
  fileConfig: ProductionConfig | null
): ProductionEnv {
  const out: ProductionEnv = {};

  const baseUrl = env.HUE_LABS_API_BASE_URL || fileConfig?.apiBaseUrl;
  const apiKey = env.HUE_LABS_API_KEY || fileConfig?.apiKey;

  if (baseUrl) out.HUE_LABS_API_BASE_URL = baseUrl;
  if (apiKey) out.HUE_LABS_API_KEY = apiKey;

  return out;
}

/**
 * A redaction-safe, one-line summary for logging. Reports only whether each
 * value is present — it NEVER contains the API key or the base URL itself.
 */
export function summarizeProductionConfig(injected: ProductionEnv): string {
  const base = injected.HUE_LABS_API_BASE_URL ? "set" : "default";
  const key = injected.HUE_LABS_API_KEY ? "present" : "absent (cloud submission disabled)";
  return `apiBaseUrl ${base}, apiKey ${key}`;
}
