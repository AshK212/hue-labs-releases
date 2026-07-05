# Hue Labs — Release Checklist (Milestone 2)

Complete before shipping a build. Each item lists **how to verify** and **pass
criteria**. `[mock]`/`[BE]` items validate an intentionally-mocked or
backend-only capability — see `KNOWN_LIMITATIONS.md`.

Build under test: __________________   Date: __________   Signed off by: __________

## Packaging & install
- [ ] **Windows installer builds** — `npm run dist` produces `HueLabs-<version>-win-x64.exe`
      (NSIS) + `…-Portable.exe` + `latest.yml` + `.blockmap` in `release/`.
- [ ] **Artifact name has no spaces** and matches the `latest.yml` reference.
- [ ] **Clean install** on a fresh Windows 11 x64 VM succeeds (per-user, choosable
      folder, shortcuts created).
- [ ] **No crashes** on launch, through onboarding, on the dashboard, or on exit
      (check `desktop.log`).

## Runtime
- [ ] **Backend starts** — `lao-backend.exe` launches, `/health` passes, UI loads.
- [ ] **Backend stops on exit** — no orphaned backend process; no locked files.
- [ ] **Benchmark** — baseline run returns measured tok/s; appears in history.
- [ ] **Optimization** — optimized profile applies and re-benchmarks (M1 live path).
      `[BE]` Measured engine validated via `test_engine_optimize.py`.

## Result Card
- [ ] **Result Card renders** with correct hardware/model/quant/before→after/score;
      no gain → "No measured gain".
- [ ] **Export PNG** downloads a valid image.
- [ ] **Copy Clipboard** places a PNG on the clipboard (paste to confirm).
- [ ] **Share X** opens the X composer pre-filled with the summary.

## Milestone 2 backend (validate via test suite)
- [ ] **Submission** `[mock][BE]` — `test_submission.py` passes; mock submit →
      `submitted`; opt-out → `opted_out`; payload has no prompts/internals.
- [ ] **Telemetry** `[mock][BE]` — `test_telemetry.py` passes; opt-out → `skipped`;
      no PII/prompt fields; all six event names present.
- [ ] **Privacy** — Settings toggles persist (localStorage); defaults telemetry ON,
      submission ON, crash OFF. `[BE]` `test_privacy.py` passes (backend gating).
- [ ] **License** — `HUE-DEV-12345` / `TEST-PRO` activate to ACTIVE/PRO; unknown key
      rejected; persists; Remove works. `[BE]` `test_licensing.py` passes.

## Update scaffold
- [ ] **Disabled in development** (no update check when unpackaged).
- [ ] **Safe with no feed** — packaged app with no `HUE_LABS_UPDATE_FEED_URL` starts
      normally; updater logs a non-fatal error only.
- [ ] **Install-on-quit path documented** — backend stopped (`stopBackendAndWait`)
      before `quitAndInstall`; see `docs/RELEASE.md`.
- [ ] **`appId` unchanged** (`com.localaioptimizer.desktop`) for upgrade compatibility.

## Code signing configuration
- [ ] **Signing config present but inert by default** — `build/azure-signing.example.yml`
      exists with env-var placeholders; default `dist` is **unsigned** (does not
      require credentials).
- [ ] **Signing/feed steps documented** in `docs/RELEASE.md` (Azure Trusted Signing,
      required env vars, **backend-exe signing requirement**, feed hosting).
- [ ] *(When signing is enabled for a real release)* installer + app **and the bundled
      `lao-backend.exe`** are signed; SmartScreen shows the publisher.

## Regression
- [ ] **Backend test suite green** — all `backend/tests/test_*.py` print `N passed`.
- [ ] **Frontend build green** — `npm run build` (tsc + vite) exits 0.
- [ ] **Electron main build green** — `npm run electron:compile` exits 0.

## Final
- [ ] `KNOWN_LIMITATIONS.md` reviewed; no undocumented gaps.
- [ ] Release notes drafted (version bump, changes, known limitations).
- [ ] Go / No-go: ☐ Go  ☐ No-go — reason: __________________________________
