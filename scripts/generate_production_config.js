/**
 * Generate the packaged production configuration for a release build.
 *
 * Reads the hosted-service settings from the environment and writes
 * `production-config/production.json`, which electron-builder bundles into the
 * app as an extraResource (see package.json "build".extraResources). At runtime
 * the Electron main process reads it and injects the values into the Python
 * backend child (see electron/production-config.ts).
 *
 * Environment (provided by CI — never hardcoded):
 *   HUE_LABS_API_KEY        the API key (from a GitHub Actions secret)
 *   HUE_LABS_API_BASE_URL   optional base URL override (omit to use the Python
 *                           backend's built-in default)
 *
 * Security: this script NEVER prints the key or URL — only whether each is set.
 * The generated file is git-ignored and must never be committed.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const OUT_DIR = path.join(__dirname, "..", "production-config");
const OUT_FILE = path.join(OUT_DIR, "production.json");

const apiKey = process.env.HUE_LABS_API_KEY || "";
const apiBaseUrl = process.env.HUE_LABS_API_BASE_URL || "";

if (!apiKey) {
  // Not fatal: the app must still build and launch; cloud submission is simply
  // disabled when no key is present.
  console.warn(
    "generate_production_config: HUE_LABS_API_KEY is not set — " +
      "writing config without a key (cloud submission will be disabled)."
  );
}

// Only include fields that have a value, so an absent override doesn't clobber
// the backend's built-in default base URL.
const config = {};
if (apiBaseUrl) config.apiBaseUrl = apiBaseUrl;
if (apiKey) config.apiKey = apiKey;

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(config, null, 2) + "\n", { encoding: "utf8" });

// Presence-only reporting — no secret values.
console.log(
  "generate_production_config: wrote " +
    path.relative(path.join(__dirname, ".."), OUT_FILE) +
    " (apiBaseUrl: " +
    (apiBaseUrl ? "set" : "default") +
    ", apiKey: " +
    (apiKey ? "present" : "absent") +
    ")"
);
