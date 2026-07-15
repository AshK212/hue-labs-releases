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
# npm pkg get version

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

The production pipeline is fully automated — see **§9. Automated release pipeline**
below for the actual workflow. In short:

- **Windows runner** (NSIS + Trusted Signing are Windows-only).
- Node + npm, Python (for the PyInstaller backend build).
- Pipeline: `npm ci` → `npm run build` → `npm run backend:build` → **sign backend**
  (Azure Trusted Signing) → `electron-builder --win --publish always` (which signs
  the app/installer/portable and publishes the GitHub Release).
- **Auth:** Azure OIDC (workload identity federation) — **no client secret**.
  Publishing uses the built-in `GITHUB_TOKEN` (`contents: write`).
- **Verification gate:** every artifact's signature is verified before the job
  succeeds; a signing failure fails the workflow and nothing unsigned is published.

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

---

## 9. Automated release pipeline (GitHub Actions)

Workflow: [`.github/workflows/release.yml`](../.github/workflows/release.yml).
Trigger: **manual** (`workflow_dispatch`) with a `publish` toggle (uncheck for a
signed dry-run that builds + signs + verifies but does not publish).

### Flow

```
Checkout ─► install deps ─► npm run build ─► npm run backend:build
   ─► Azure login (OIDC) ─► sign backend exe ─► verify backend signature
   ─► electron-builder package + sign app/installer/portable  (--publish never)
   ─► verify ALL signatures ─► upload signed workflow artifacts
   ─► publish GitHub Release  (electron-builder --publish always)
```

Publishing is the **last** stage and only runs after every signature is verified
and the signed artifacts are uploaded. Signing/verification is the gate: any
failure fails the job **before** publish, so nothing unsigned is ever uploaded or
published. Publishing is still done entirely by electron-builder (it reads
owner/repo/releaseType from package.json — publishing logic unchanged). A dry run
(`publish` unchecked) builds, signs, verifies, and uploads, but skips publish.

### GitHub Environment

The job runs in the **`release`** environment. Create it under
**Settings → Environments → release** and (recommended) add required reviewers
and/or a branch/tag restriction so a human approves every production release.

### Azure authentication — OIDC (no secrets)

Authentication uses **workload identity federation**: the workflow requests an
OIDC token (`permissions: id-token: write`) and `azure/login@v2` exchanges it for
an Azure session. **There is no `AZURE_CLIENT_SECRET`.** Both the backend signing
step and electron-builder's Trusted Signing reuse that one session.

### Azure Trusted Signing

All signing uses one centralized config (defined once in the workflow `env:`):

| Setting | Value |
|---|---|
| Endpoint | `https://eus.codesigning.azure.net/` |
| Account | `huelabs` |
| Certificate profile | `huelabs-cert` |
| Region | East US |

What gets signed: **`lao-backend.exe`** (before packaging, via
`azure/trusted-signing-action`), then **`Hue Labs.exe`**, the **NSIS installer**,
and the **portable** exe (during packaging, via electron-builder's
`win.azureSignOptions`, injected as `-c.win.azureSignOptions.*` overrides — so
local `npm run dist` stays unsigned and no signing config is duplicated).

### Required GitHub **Variables** (Settings → Secrets and variables → Actions → Variables)

Non-secret identifiers — set as repository (or environment) **Variables**:

| Variable | Value |
|---|---|
| `AZURE_TENANT_ID` | `c6b55543-4230-4cb2-88e1-b8d5fbd696a9` |
| `AZURE_CLIENT_ID` | `9d08b865-0499-4811-9e19-a3ba3c3b6812` |
| `AZURE_SUBSCRIPTION_ID` | `8b212489-70de-4ea9-b25f-b8b2ca1214b9` |

The endpoint / account / certificate-profile are **not** IDs and live in the
workflow `env:` block (change them there if the signing account ever changes).

### Required GitHub **Secrets**

**None for Azure** (OIDC = no secret). Publishing uses the automatic
`GITHUB_TOKEN` (granted `contents: write`), which can create releases in this repo.

### Recovery / troubleshooting

- **`AADSTS700213` / no matching federated credential:** the federated credential
  subject doesn't match. It must match this workflow's request, e.g.
  `repo:AshK212/hue-labs-releases:environment:release` (environment credential) —
  configure it on the app registration to match the `release` environment.
- **`AuthorizationFailed` when signing:** the app registration lacks the
  **Trusted Signing Certificate Profile Signer** role on the `huelabs` account.
  Assign it (Access control (IAM) on the Trusted Signing account).
- **Signature `Status` not `Valid` in the verify step:** the job fails on purpose.
  Nothing is published. Re-run after fixing the role/credential.
- **Publish 403:** confirm the workflow runs in the same repo as `build.publish`
  (`AshK212/hue-labs-releases`) so `GITHUB_TOKEN` has write access; otherwise
  supply a PAT as `GH_TOKEN`.
- **Roll back a bad release:** delete (or unpublish) the GitHub Release and its
  assets — installed apps won't pick it up once it's gone from the feed.
- **Trusted-signing action version:** pinned to `azure/trusted-signing-action@v0.5.9`;
  bump to the latest patch if Microsoft releases a newer one.

### One-time client setup (before the first run)

1. Create the **`release`** GitHub Environment (optional reviewers).
2. Add the three repository **Variables** above.
3. On the Azure app registration (`AZURE_CLIENT_ID`), add a **federated credential**
   for GitHub Actions with subject `repo:AshK212/hue-labs-releases:environment:release`.
4. Assign the app registration the **Trusted Signing Certificate Profile Signer**
   role on the `huelabs` Trusted Signing account.
5. Run **Actions → Release → Run workflow** (leave *publish* checked).
