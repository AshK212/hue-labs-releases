# Hue Labs — QA & Release Validation

This folder is the release-validation framework for **Milestone 2**. It is
documentation only — it does not run code or change the app.

## Purpose

Give a repeatable, honest way to validate a build before release:

- Confirm the **live desktop app** behaves correctly across representative hardware.
- Confirm the **Milestone 2 backend capabilities** (measured optimization, spill
  analysis, winner selection, quant recommendation, submission, telemetry, privacy,
  licensing) behave correctly at the level they are currently reachable.
- Make explicit what is **real vs. mock/placeholder** so testers don't chase
  features that are intentionally not wired yet (see `KNOWN_LIMITATIONS.md`).

> **Read this first — scope reality check.**
> The running app today exercises the **Milestone 1 flow** (hardware → recommend →
> download → baseline benchmark → static optimized profile → results) **plus** the
> new **Result Card** UI and **Settings** (Privacy + License) UI. The Milestone 2
> **Measured Optimization Engine, Submission, and Telemetry** are implemented and
> unit-tested but are **not yet wired to HTTP endpoints or auto-invoked** in the
> desktop app. Privacy/License toggles persist in the **frontend only** and are not
> yet synced to the backend services. Validate those layers where they are actually
> reachable: the **backend test suite** and, for UI, the **Settings/Result Card**
> screens. This is called out per-item in the matrix and checklist.

## Documents

| File | Use it to… |
|------|-----------|
| `TEST_MATRIX.md` | Validate the 8 capability areas across 8 GB / 12 GB / 16 GB+ GPUs. |
| `SMOKE_TEST.md` | Walk the full install → launch → … → exit user journey once. |
| `RELEASE_CHECKLIST.md` | Sign-off gate before shipping a build. |
| `KNOWN_LIMITATIONS.md` | Intentional mocks/placeholders and what unblocks them. |

## How to execute release validation

1. **Build the candidate** per [`docs/RELEASE.md`](../docs/RELEASE.md)
   (`npm run build` → `npm run backend:build` → `npm run dist`).
2. **Run the backend test suite** (validates the M2 engine/spill/winner/quant/
   submission/telemetry/privacy/licensing that aren't yet surfaced in the UI):
   ```
   cd backend
   for t in optimization_schemas engine_create_run engine_optimize executor adapter \
            spill winner quant submission telemetry privacy licensing; do
     .venv/Scripts/python.exe tests/test_$t.py
   done
   ```
   All suites must print `N passed`.
3. **Install the produced installer** on a clean Windows VM and run
   `SMOKE_TEST.md` end-to-end.
4. **Run `TEST_MATRIX.md`** on at least one machine per GPU tier (or the closest
   available; note substitutions).
5. **Complete `RELEASE_CHECKLIST.md`** and record pass/fail + notes.
6. File any deviation not already in `KNOWN_LIMITATIONS.md` as a blocker.

## Expected workflow

```
Build ─► Backend tests ─► Clean-VM install ─► Smoke test ─► Test matrix (per tier)
      ─► Release checklist sign-off ─► Ship  (or) ─► File blockers
```

## Environment prerequisites

- Windows 11 x64 (primary target; the installer is Windows-only).
- **Ollama installed and running** — required for hardware-dependent model,
  benchmark, and optimization steps. Without it, those steps show guided
  "install/start Ollama" states (also worth verifying).
- A machine (or several) representing each GPU tier for the matrix.
- For backend-level checks: the backend virtualenv at `backend/.venv`.
