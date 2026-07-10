# Hue Labs — Release & Update Guide

Release engineering for the Windows desktop app (Electron 33 + electron-builder 25
+ NSIS, with a bundled PyInstaller FastAPI backend).

> **Scope of the current scaffold:** auto-update *infrastructure* is wired up, but
> **no real feed URL and no signing credentials are configured**. The app builds
> and runs unsigned, and updates safely no-op until a feed is provided. This doc
> is the checklist for turning the scaffold into real signed, auto-updating
> releases.

---

## 1. Architecture at a glance

```
electron-builder ─► NSIS installer  +  latest.yml + .blockmap  (the update feed)
        │                 (artifactName: HueLabs-${version}-${os}-${arch}.exe)
        ▼
Electron main (dist-electron/main.js)
   ├─ spawns the bundled backend (extraResources → backend/lao-backend.exe)
   └─ electron/updater.ts  ──► electron-updater  ──► reads app-update.yml → feed
```

- **Updater module:** [`electron/updater.ts`](../electron/updater.ts) — the only place
  update logic lives. Wired in [`electron/main.ts`](../electron/main.ts).
- **Feed metadata:** electron-builder emits `latest.yml` + `.blockmap` (differential
  downloads) next to the installer, and embeds `app-update.yml` inside the app from
  the `build.publish` config.

---

## 2. Release flow

1. Bump `version` in `package.json` (semver). Keep `appId`
   (`com.localaioptimizer.desktop`) **unchanged** — upgrades chain off it.
2. Build the frontend + electron main: `npm run build`.
3. Build the backend binary: `npm run backend:build` (PyInstaller → `backend/dist/lao-backend`).
4. **Sign the backend binary** (see §6) — required before packaging.
5. Package (and sign the app): `npm run dist` (add the Azure signing config from §5).
6. Publish artifacts + `latest.yml` + `.blockmap` to the release feed (§4).
7. Verify: fresh install, then upgrade from the previous version (§7).

> `npm run dist` currently produces an **unsigned** build and does **not** publish
> (no `--publish`). Publishing/signing are opt-in steps below.

---

## 3. Update flow (runtime)

Handled by `electron/updater.ts`, forwarded to the renderer as IPC events:

| Stage | electron-updater event | IPC channel | Behavior |
|-------|------------------------|-------------|----------|
| Checking | `checking-for-update` | `update:checking` | Fires on launch + every 6h. |
| Available | `update-available` | `update:available` | Auto-download starts. |
| None | `update-not-available` | `update:none` | — |
| Progress | `download-progress` | `update:progress` | `{ percent }` (uses `.blockmap` for diffs). |
| Ready | `update-downloaded` | `update:downloaded` | Marked pending; **installs on quit**. |
| Error | `error` | `update:error` | **Non-fatal** — logged, app keeps running. |

**Guarantees:**
- **Disabled in development** (`isDev` → no-op; there is no `app-update.yml` in dev).
- **Safe with no feed:** an unreachable/placeholder URL only emits `error`; the app
  starts and runs normally.
- **No crashes if the updater is unavailable:** all checks are wrapped; failures log
  and continue.

### Backend shutdown before install (no locked files)

When an update is staged, the installer must not run while the backend `.exe` is
still locked. The sequence (see `stopBackendAndWait` in
[`electron/backend.ts`](../electron/backend.ts) and the `before-quit` handler in
`updater.ts`):

1. User quits (or the app is told to quit).
2. `before-quit` fires: the updater sees a pending install, calls
   `event.preventDefault()`, and runs `onBeforeInstall()`.
3. `stopBackendAndWait()` sends `taskkill /T /F` to the backend process tree
   (reaping uvicorn/PyInstaller children) and **awaits the real `exit` event**
   (with an 8s timeout fallback).
4. Once the backend has exited and its files are unlocked,
   `autoUpdater.quitAndInstall(true, true)` runs the NSIS installer silently and
   relaunches the app afterward.

---

## 4. Release feed configuration (GitHub Releases)

The update feed is hosted on **GitHub Releases**, configured in `package.json` →
`build.publish`:

```json
{ "provider": "github", "owner": "AshK212", "repo": "hue-labs-releases", "releaseType": "draft" }
```

- **`owner`/`repo`** point at the releases repository (`AshK212/hue-labs-releases`).
  electron-builder writes these into the app's `app-update.yml`, so the installed
  app's updater knows to check that repo's Releases for `latest.yml` + the installer
  + `.blockmap` (GitHub serves range requests, so differential updates work).
- **`releaseType: "draft"`** — publishing uploads assets to a **draft** release. It
  stays invisible to users until a human reviews and clicks *Publish release* on
  GitHub. This is the safety gate: nothing auto-ships.
- **No token is needed to build.** `owner`/`repo` are static config, so local builds
  work with **`--publish never`** and **without `GH_TOKEN`**. The token is only read
  when you explicitly publish.

### Local build (no publish, no token)

```
npm run dist -- --publish never
```

Produces the installer + `latest.yml` + `.blockmap` in `release/` and uploads nothing.

### Publish a release (draft on GitHub)

```
# PowerShell
$env:GH_TOKEN="ghp_xxx"; npm run dist -- --publish always

# bash
GH_TOKEN=ghp_xxx npm run dist -- --publish always
```

- `GH_TOKEN` must be a token with write access to `AshK212/hue-labs-releases`
  (classic PAT with `repo` scope, or a fine-grained token with *Contents: write*).
- This creates/updates a **draft** GitHub release for the current `version` and
  uploads the installer, `latest.yml`, and `.blockmap`.
- Go to the repo's **Releases** tab, verify the assets, then **Publish** the draft.
  Only then will installed apps see the update.

> Bump `version` in `package.json` before publishing — GitHub releases are keyed by
> the `v<version>` tag, and the updater compares against it.

---

## 5. Azure Trusted Signing setup

Signing is **not active by default** so unsigned local builds keep working. To sign:

- Config lives in [`build/azure-signing.example.yml`](../build/azure-signing.example.yml)
  (a `win.azureSignOptions` block using env placeholders). Merge it into
  `package.json` → `build.win`, or pass it as an override:
  `electron-builder --win -c ./build/azure-signing.example.yml`.

**Required Azure resources**
- A **Trusted Signing account** + a **certificate profile**.
- A completed one-time **identity validation** (Microsoft-issued).
- A **service principal** (or OIDC) with the **"Trusted Signing Certificate Profile
  Signer"** role.

**Required environment variables** (never commit real values)
```
AZURE_TENANT_ID
AZURE_CLIENT_ID
AZURE_CLIENT_SECRET          # or federated OIDC
AZURE_CODE_SIGNING_ENDPOINT  # e.g. https://wus2.codesigning.azure.net/
AZURE_CODE_SIGNING_ACCOUNT
AZURE_CERT_PROFILE_NAME
```
Timestamping uses Trusted Signing's RFC-3161 TSA — no separate cert needed.

---

## 6. Backend executable signing (required)

electron-builder signs the **app's own** executables, but the bundled Python backend
is shipped as `extraResources` and is **NOT** covered by that pass. Leaving it
unsigned causes SmartScreen/AV friction even when the app is signed.

**Requirement:** sign `backend/dist/lao-backend/lao-backend.exe` (and any child
`.exe`/`.dll` PyInstaller emits) **before** `electron-builder` packages them — e.g.
add a signing step to `scripts/build_backend.py` output or a dedicated CI step that
runs the same Trusted Signing credentials against the backend binaries.

---

## 7. CI requirements

- **Windows runner** (NSIS + signtool/Trusted Signing are Windows-only).
- Node + npm, Python (for the PyInstaller backend build).
- Pipeline: `npm ci` → `npm run build` → `npm run backend:build` → **sign backend**
  → `electron-builder --win --publish always` (with signing config).
- **Secrets:** `GH_TOKEN` (write access to `AshK212/hue-labs-releases`, for publishing
  to GitHub Releases — §4) and the Azure signing env vars (§5), injected as CI secrets —
  prefer OIDC/federated credentials over long-lived secrets where possible.
- **Verification gate:** install the produced installer, then install the next
  version over it and confirm auto-update applies (see checklist below).

### Upgrade verification checklist
- [ ] Fresh install succeeds; app launches; backend healthy.
- [ ] SmartScreen shows the publisher (once signed) — no "Unknown publisher".
- [ ] From version N, publishing N+1 triggers download → install-on-quit → relaunch on N+1.
- [ ] Differential update uses `.blockmap` (smaller download) when the host supports ranges.
- [ ] No leftover locked backend files after update; a second launch works.
- [ ] With an unreachable feed, the app still starts and logs a non-fatal updater error.

---

## 8. Notes & compatibility

- **Artifact naming** was normalized to `HueLabs-${version}-${os}-${arch}.${ext}`
  (installer) and `…-Portable.${ext}` (portable) — no spaces, so `latest.yml` URLs
  resolve. Previously the installer name contained a space that mismatched
  `latest.yml`.
- **`appId` is unchanged**, so installs from the pre-updater builds upgrade in place.
  Delete stale `Local AI Optimizer-*` artifacts from any feed — never publish them
  alongside the new `HueLabs-*` names.
- Per-user install (`nsis.perMachine: false`) means updates need **no elevation**.
  Switching to per-machine later would require elevation on every update.
