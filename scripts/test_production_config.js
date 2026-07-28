/**
 * Focused tests for the packaged production-config loader
 * (electron/production-config.ts).
 *
 * Runs against the COMPILED module, so compile the Electron sources first:
 *
 *     npm run test:electron        (compiles, then runs this)
 *
 * or, if dist-electron is already built:
 *
 *     node scripts/test_production_config.js
 *
 * Deterministic and offline — uses only temp files. No Electron runtime needed
 * because production-config.ts is dependency-free (node:fs / node:path only).
 */
"use strict";

const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const COMPILED = path.join(__dirname, "..", "dist-electron", "production-config.js");
if (!fs.existsSync(COMPILED)) {
  console.error(
    "Compiled module not found: " +
      COMPILED +
      "\nRun `npm run electron:compile` first (or use `npm run test:electron`)."
  );
  process.exit(1);
}

const {
  parseProductionConfig,
  loadProductionConfig,
  resolveProductionEnv,
  summarizeProductionConfig,
  PRODUCTION_CONFIG_BASENAME,
} = require(COMPILED);

/** Create a temp "resources" dir, optionally with a production.json file. */
function tmpResources(content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hue-prodcfg-"));
  if (content !== undefined) {
    fs.writeFileSync(path.join(dir, PRODUCTION_CONFIG_BASENAME), content);
  }
  return dir;
}

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

// 1. Environment precedence -------------------------------------------------
test("environment precedence: process.env overrides the packaged file", () => {
  const fileConfig = { apiBaseUrl: "https://file.example", apiKey: "file-key" };
  const env = {
    HUE_LABS_API_BASE_URL: "https://env.example",
    HUE_LABS_API_KEY: "env-key",
  };
  const out = resolveProductionEnv(env, fileConfig);
  assert.strictEqual(out.HUE_LABS_API_BASE_URL, "https://env.example");
  assert.strictEqual(out.HUE_LABS_API_KEY, "env-key");
});

test("environment precedence: packaged file used when env is absent", () => {
  const fileConfig = { apiBaseUrl: "https://file.example", apiKey: "file-key" };
  const out = resolveProductionEnv({}, fileConfig);
  assert.strictEqual(out.HUE_LABS_API_BASE_URL, "https://file.example");
  assert.strictEqual(out.HUE_LABS_API_KEY, "file-key");
});

// 2. Packaged config loading ------------------------------------------------
test("packaged config loading: a valid file parses to both fields", () => {
  const dir = tmpResources(JSON.stringify({ apiBaseUrl: "https://x", apiKey: "k" }));
  assert.deepStrictEqual(loadProductionConfig(dir), {
    apiBaseUrl: "https://x",
    apiKey: "k",
  });
});

// 3. Missing config ---------------------------------------------------------
test("missing config: returns null and injects nothing", () => {
  const dir = tmpResources(); // no production.json in the dir
  assert.strictEqual(loadProductionConfig(dir), null);
  const out = resolveProductionEnv({}, null);
  assert.deepStrictEqual(out, {});
  assert.strictEqual("HUE_LABS_API_KEY" in out, false);
});

// 4. Malformed config -------------------------------------------------------
test("malformed config: invalid JSON returns null without throwing", () => {
  assert.strictEqual(parseProductionConfig("{ not json"), null);
  const dir = tmpResources("{ not json");
  assert.strictEqual(loadProductionConfig(dir), null);
});

test("malformed config: wrong-typed fields are ignored", () => {
  assert.strictEqual(parseProductionConfig(JSON.stringify({ apiKey: 123 })), null);
  assert.strictEqual(parseProductionConfig(JSON.stringify([1, 2, 3])), null);
});

// 5. Secret is never in a log/summary --------------------------------------
test("api key and base url never appear in the log summary", () => {
  const secret = "super-secret-key-123";
  const url = "https://private.internal.example";
  const out = resolveProductionEnv({}, { apiBaseUrl: url, apiKey: secret });
  const summary = summarizeProductionConfig(out);
  assert.ok(!summary.includes(secret), "summary must not contain the API key");
  assert.ok(!summary.includes(url), "summary must not contain the base URL value");
  assert.match(summary, /apiKey present/);

  // And the absent case reports disablement, still without any value.
  const absent = summarizeProductionConfig(resolveProductionEnv({}, null));
  assert.match(absent, /cloud submission disabled/);
});

let failed = 0;
for (const [name, fn] of tests) {
  try {
    fn();
    console.log("  ok  " + name);
  } catch (err) {
    failed += 1;
    console.error("FAIL  " + name + "\n      " + (err && err.message));
  }
}
console.log("\n" + (tests.length - failed) + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
