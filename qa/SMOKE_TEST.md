# Hue Labs — Smoke Test (full user journey)

One end-to-end pass on a **clean Windows 11 x64 VM** with **Ollama installed**.
Record pass/fail and notes per step. Steps marked **[mock/BE]** are not yet
user-reachable in this build — verify them at the backend level (see
`KNOWN_LIMITATIONS.md`) or mark **N/A (backend-validated)**.

Backend log for diagnosis: `%APPDATA%\Hue Labs\logs\desktop.log`.

| # | Step | What to do | Expected result | ✓ |
|---|------|-----------|-----------------|---|
| 1 | **Install** | Run `HueLabs-<version>-win-x64.exe`. | NSIS assisted installer (per-user), lets you choose folder, creates Desktop + Start-menu shortcuts named "Hue Labs". Windows SmartScreen shows "Unknown publisher" (unsigned — expected, see limitations). | ☐ |
| 2 | **Launch** | Open Hue Labs from the shortcut. | Splash window appears immediately; only one instance runs (relaunch focuses the existing window). | ☐ |
| 3 | **Backend startup** | Wait after splash. | Bundled backend (`lao-backend.exe`) starts; `/health` passes; UI loads once healthy. `desktop.log` shows "health check passed". | ☐ |
| 4 | **Hardware detection** | Proceed through onboarding to the Hardware screen. | Correct OS/CPU/RAM and GPU (+VRAM on NVIDIA); plain-language summary. | ☐ |
| 5 | **Download model** | On the Recommendation screen, download the recommended model. | Live streaming progress (real byte counts); completes; model shows installed. If Ollama is stopped, a clear "start Ollama" guidance appears instead. | ☐ |
| 6 | **Benchmark** | Run the baseline benchmark. | Measured tokens/sec (from Ollama timing); result recorded in history. | ☐ |
| 7 | **Optimization** | Apply optimization and re-run. | Hardware-aware optimized profile applied; measured optimized tok/s shown. Gain may be modest/zero — reported honestly. *(This is the M1 static profile; the M2 measured engine is backend-only — step [mock/BE].)* | ☐ |
| 8 | **Result / Share Card** | View the Results screen. | Before → After tiles, "what changed", and the **Share Card** (hardware, model, quant, before→after, improvement %, score). No gain → "No measured gain". | ☐ |
| 9 | **Share Card actions** | Click Export PNG, Copy card, Share on X. | PNG downloads; card copied to clipboard as image; X composer opens with a summary. Buttons disable while busy; failures show a friendly inline message. | ☐ |
| 10 | **Submission** | *(Not user-triggered in this build.)* | **[mock/BE]** Validate `test_submission.py`: mock submit → `submitted`; opt-out → `opted_out`. Mark N/A in live smoke. | ☐ |
| 11 | **Telemetry** | *(Not auto-emitted in this build.)* | **[mock/BE]** Validate `test_telemetry.py`: opt-out → `skipped`; no PII/prompt fields. Mark N/A in live smoke. | ☐ |
| 12 | **Settings persistence** | Dashboard → Settings. Change theme; toggle Privacy "Anonymous usage analytics" and "Anonymous benchmark submission". Close and relaunch. | Theme, privacy toggles persist across restart (localStorage `lao.theme`, `lao.privacy`). "Crash reporting" toggle is present but **disabled** ("Coming soon"). | ☐ |
| 13 | **License activation** | Settings → License. Enter `HUE-DEV-12345` (or `TEST-PRO`), click Activate. | Status → **ACTIVE**, Plan → **PRO**; "Remove license" appears; persists across restart (localStorage `lao.license`). An unknown key shows "not recognized" and stays FREE/UNKNOWN. *(Mock validation — no server.)* | ☐ |
| 14 | **Update check** | Observe on launch (packaged build). | With **no feed configured**, the updater logs a **non-fatal** error and the app runs normally. In a dev run the updater is **disabled** entirely. `desktop.log` shows "updater" lines but no crash. | ☐ |
| 15 | **Exit** | Close the window. | App quits cleanly; backend process is terminated (no orphaned `lao-backend.exe` in Task Manager); no locked files. | ☐ |

## Sign-off
- Tester / date: ________________________
- Build version: ________________________
- Result: ☐ Pass  ☐ Pass with notes  ☐ Fail
- Notes / deviations: ____________________________________________
