# Hue Labs — Known Limitations (Milestone 2)

These are **intentional** for the current milestone — scaffolds and mocks that are
architecture-complete but not yet connected to production services. Listed so QA
doesn't treat them as bugs. Each notes **impact** and **what unblocks it**.

## Mocks & placeholders

### 1. Mock license validation — no real licensing server
- **What:** `app/licensing/client.py` recognizes only `HUE-DEV-12345` and `TEST-PRO`
  (→ ACTIVE/PRO); everything else → INVALID. Frontend (`license.ts`) mirrors this.
- **Impact:** No real key issuance/verification; entitlements are local only.
- **Unblocks:** A real licensing endpoint + swapping the mock client (interface is
  async-ready). **Requires client:** licensing server + validation API.

### 2. Mock submission endpoint
- **What:** `app/submission/client.py` defaults to `mock://hue-labs/submissions`
  (deterministic id, no network). Real endpoint via `HUE_LABS_SUBMISSION_ENDPOINT`.
- **Impact:** Results aren't sent anywhere; no leaderboard/aggregation.
- **Unblocks:** A hosted submission/leaderboard service + endpoint URL.
  **Requires client:** submission backend + URL.

### 3. Mock telemetry endpoint
- **What:** `app/telemetry/client.py` defaults to `mock://hue-labs/telemetry`.
  Real endpoint via `HUE_LABS_TELEMETRY_ENDPOINT`.
- **Impact:** No analytics are actually transmitted.
- **Unblocks:** An analytics ingestion endpoint. **Requires client:** telemetry
  service + URL.

### 4. Azure Trusted Signing placeholders — unsigned builds by default
- **What:** `build/azure-signing.example.yml` holds a placeholder `azureSignOptions`
  block (env-var placeholders), **not** wired into the default build. `npm run dist`
  produces an **unsigned** installer.
- **Impact:** Windows SmartScreen shows "Unknown publisher"; possible AV friction.
- **Unblocks:** Azure Trusted Signing account + identity validation + service
  principal, and enabling the config. **Requires client:** Azure resources + creds.

### 5. No production release feed
- **What:** `build.publish` is a **generic** provider pointing at
  `${env.HUE_LABS_UPDATE_FEED_URL}` — no real URL committed.
- **Impact:** Auto-update finds no feed; the app logs a non-fatal error and runs
  normally. No over-the-air updates until configured.
- **Unblocks:** A static HTTPS host (Azure Blob / S3 / GitHub Releases) serving
  `latest.yml` + installer + `.blockmap`, and the URL set at release.
  **Requires client:** feed hosting + URL.

## Integration gaps (implemented but not yet wired end-to-end)

### 6. Measured Optimization Engine not surfaced in the UI
- **What:** `MeasuredOptimizationEngine.optimize` (candidates → benchmark → winner →
  quant) is implemented and unit-tested but has **no HTTP endpoint** and isn't called
  by the app. The live "Optimization" screen uses the Milestone 1 static profile
  (`/optimization/apply` + `/benchmark/run`).
- **Impact:** Spill detection, winner scoring, and quant recommendation are not
  visible to end users yet.
- **Unblocks:** An endpoint (e.g. `POST /optimization/run`) + frontend wiring.

### 7. Submission & Telemetry not auto-invoked
- **What:** Both services are exposed but nothing in the app triggers them (no
  "submit result" action, no event emission). No routes expose them.
- **Impact:** Even with real endpoints, no data flows until the app calls them.
- **Unblocks:** UI actions/event hooks + endpoints.

### 8. Privacy & License settings persist frontend-only (not synced to backend)
- **What:** Toggles/keys persist in `localStorage` (`lao.privacy`, `lao.license`).
  The backend `PrivacyService`/`LicenseService` persist separately (SQLite) and are
  **not** connected to the UI (no sync endpoint).
- **Impact:** Changing a privacy toggle in the UI does **not** yet gate the backend
  telemetry/submission services; UI license state is independent of backend gates.
- **Unblocks:** A small `GET/PUT` privacy+license endpoint bridging the two. Field
  names already match to make this trivial.

### 9. Backend executable signing
- **What:** electron-builder would sign the app's own binaries, but the bundled
  PyInstaller backend (`lao-backend.exe`) is shipped as `extraResources` and is **not**
  covered by that pass.
- **Impact:** Even a signed app ships an unsigned backend → SmartScreen/AV friction.
- **Unblocks:** A separate signing step for the backend binaries (documented in
  `docs/RELEASE.md`). **Requires client:** same signing creds as #4.

## Platform / hardware

### 10. No macOS or Linux support
- **What:** Packaging targets **Windows x64 only** (NSIS + portable). Hardware/paths
  assume Windows (`taskkill`, `nvidia-smi`, PowerShell probes, `.venv/Scripts`).
- **Impact:** Not installable/validated on Mac/Linux.
- **Unblocks:** Cross-platform targets + macOS notarization (Apple Developer account).

### 11. GPU VRAM only reliably read on NVIDIA
- **What:** VRAM comes from `nvidia-smi`; AMD/Intel typically report the GPU **name**
  with `vram_gb = null`. Apple Silicon uses unified memory as a proxy.
- **Impact:** VRAM-bucket-dependent logic (candidate generation, spill budgets) is
  most accurate on NVIDIA; non-NVIDIA falls back to conservative defaults.
- **Unblocks:** Vendor-specific VRAM probes if AMD/Intel become primary targets.

### 12. GPU driver version not detected
- **What:** `SubmissionPayload.driver_version` is always `null` (the hardware probe
  doesn't read it).
- **Impact:** Driver data absent from submissions.
- **Unblocks:** Add a driver-version probe (out of scope this milestone).

## Runtime constraints
- **Ollama is a hard dependency** for model/benchmark/optimization steps. If it isn't
  running, those flows show guidance rather than failing — expected behavior.
- **Single fixed backend port (8000) / UI port (5199 in prod).** No auto-fallback if a
  port is occupied.
