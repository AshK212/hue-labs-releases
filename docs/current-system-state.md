# Hue Labs — Current System State (Snapshot for Planning)

**Date:** 2026-07-04
**Purpose:** a single, accurate snapshot of the whole system as it stands right
now, so an external planner (e.g. ChatGPT) can write correct prompts for the
next work without re-reading the codebase. This describes *what exists*, not
aspirations.

---

## 1. What the product is

**Hue Labs** is a desktop app that sits on top of **Ollama** and helps a
non-technical user pick, download, benchmark, and safely optimize a local LLM —
showing **honest, measured** before/after results on their own machine.

- Design system / brand: **Hue Labs** (`huelabs.ai`) is canonical. Carbon/Green
  are dev-only themes.
- **Milestone 1: complete and approved.** **Milestone 2: just started** (the
  Measured Optimization Engine — currently contract-only scaffolding).

## 2. Tech stack

| Layer | Tech |
|-------|------|
| Desktop shell | Electron (TypeScript) — `electron/` |
| Frontend | React 18 + TypeScript + Vite + Tailwind — `frontend/` |
| Backend | Python **FastAPI** local service — `backend/app/` |
| Data | SQLite (stdlib) at `backend/data/history.db` |
| Inference | **Ollama** local HTTP API at `127.0.0.1:11434` |
| Packaging | Windows installer; auto backend startup on app launch |

**Hard rule:** the frontend never calls Ollama directly — only the FastAPI
backend does. All model/benchmark/optimization logic lives in the backend.

## 3. Runtime topology

```
Electron shell
  ├─ spawns/monitors ─► Backend (FastAPI, :8000) ─HTTP─► Ollama (:11434)
  │                          │
  │                          └─► SQLite (history.db)
  └─ loads ─► Frontend (React, Vite :5173 in dev)
                 └─ calls /api/* ─► backend (Vite proxies /api → :8000)
```

## 4. Repository layout (top level)

```
Work/
├── backend/              FastAPI service (+ .venv, data/, tests/)
│   └── app/
│       ├── main.py, config.py, schemas.py, storage.py
│       ├── services/     hardware, ollama_client, recommender, optimization, benchmark
│       └── optimization/ ★ NEW (Milestone 2): schemas, engine, winner, spill, quant
├── frontend/             React app (src/: screens, dashboard, journey, components, api)
├── electron/             Electron main/preload/window/backend-launcher
├── docs/                 architecture.md, milestone-1-scope.md, optimization-notes.md,
│                         milestone-2-measured-optimization-engine.md, current-system-state.md
├── scripts/, build/, release/, dist-electron/
├── README.md, RunGuide.md, package.json
```

## 5. Backend API surface (live endpoints — all Milestone 1)

| Method | Path | Purpose |
|--------|------|---------|
| GET  | `/health` | Liveness. |
| GET  | `/hardware` | Detected OS/CPU/RAM/GPU + plain-language summary. |
| GET  | `/ollama/status` | Ollama installed/running + installed models. |
| POST | `/ollama/pull` | One-click model download (blocking). |
| POST | `/ollama/pull/stream` | Download with NDJSON progress stream. |
| GET  | `/models/recommend` | Recommended model(s) + reasons + est. tok/s. |
| POST | `/benchmark/run` | Run fixed benchmark, `profile: baseline\|optimized`. |
| POST | `/optimization/apply` | Return the safe optimized profile. |
| GET  | `/benchmark/history` | Recent measured runs from SQLite. |

> **No Milestone 2 endpoints exist yet.** The measured optimization engine is not
> wired to any route.

Frontend calls these via a small typed client: `frontend/src/api/client.ts`.

## 6. Frontend structure (Milestone 1, working)

- **Journey / onboarding**: `src/journey/` (steps, labels, context, model download).
- **Screens**: `src/screens/` — Welcome, Setup, Scanning, Hardware,
  Recommendation, Baseline, Optimize, Results.
- **Dashboard**: `src/dashboard/` — sections, widgets, data hook.
- **Components**: `src/components/` — brand visuals, cards, metrics, window
  controls, charts, etc.
- **Types**: `src/types.ts` — mirrors backend Pydantic schemas (snake_case). Now
  also contains the **Milestone 2** type mirrors (contract-only; no UI yet).
- **Theme**: `src/theme.ts`, `ThemeProvider.tsx` (Hue Labs design system).

## 7. The honesty policy (core product principle)

Every number shown is **measured on the user's machine** using Ollama's own
reported timing:

```
tokens_per_sec = eval_count / (eval_duration_ns / 1e9)
```

Both baseline and optimized runs use the **same prompt, same model, deterministic
decoding** (`temperature: 0`, fixed `seed`), and a fixed output length, so only
the runtime profile differs. Nothing is hardcoded or faked. Modest, real gains
are acceptable. **This principle must carry into Milestone 2.**

## 8. Milestone 1 capabilities (done)

Hardware detection · model recommendation · Ollama integration · model download
(with streaming progress) · benchmark · static optimization (baseline vs
optimized runtime profiles) · before/after comparison · dashboard · settings ·
onboarding · Windows installer · auto backend startup.

Optimization profiles applied (real Ollama `options`, hardware-aware, safe):
`num_gpu=999` on GPU machines, `num_thread=<physical cores>` on CPU-only,
`num_batch=512` on ≥8 GB RAM. Details in
[`optimization-notes.md`](optimization-notes.md).

## 9. Milestone 2 so far (just this step)

Contract-only scaffolding for the **Measured Optimization Engine**:
`backend/app/optimization/` (schemas + placeholder engine/winner/spill/quant),
matching TypeScript types in `frontend/src/types.ts`, and minimal tests. No
search, no scoring, no endpoints, no UI yet. **Full detail (fields, placeholder
behavior, naming conflicts, next steps) is in
[`milestone-2-measured-optimization-engine.md`](milestone-2-measured-optimization-engine.md)
— read that before planning the next Milestone 2 prompt.**

## 10. Constraints any next prompt must respect

1. Frontend must not call Ollama directly.
2. Do not break Milestone 1 flows (benchmark, optimization, history, dashboard,
   onboarding, installer, auto-start).
3. No fabricated/hardcoded benchmark numbers — measure or leave `null`.
4. Keep backend `app/schemas.py` (M1 contract) and the M2
   `app/optimization/schemas.py` separate; mind the dual `BenchmarkResult`
   naming (frontend M2 type = `MeasuredBenchmarkResult`).
5. Keep schema versioning (`optimization-run-v1`); bump on breaking changes.
6. Keep code clean and simple; do not over-engineer.
7. Telemetry and submission are **opt-in** and consent-gated by contract default.

## 11. How to run (reference)

See [`RunGuide.md`](../RunGuide.md) for full steps. In short: the Electron app
launches the FastAPI backend automatically; Ollama must be installed and running
for model/benchmark features. Backend tests:
`python backend/tests/test_optimization_schemas.py` (from `backend/`). Frontend
typecheck: `tsc -b` in `frontend/`.
