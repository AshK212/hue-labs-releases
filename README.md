# Hue Labs

A friendly control layer on top of [Ollama](https://ollama.com) that makes running and
optimizing local AI models easy for **non-technical users** — zero terminal required.

> We are **not** replacing Ollama. We are building a calm, polished **native desktop app**
> that sits on top of Ollama and guides a person through the whole workflow with one-click
> actions.

**Looking to run or build it?** See **[RunGuide.md](RunGuide.md)**.

## What it is

Hue Labs ships as a **native Windows desktop application** (Electron). The user
double-clicks one icon; the app starts its own backend, waits until it's ready, and opens a
single clean window. There is no browser, no URL bar, and nothing to start by hand.

Under the hood it is three parts wrapped in a desktop shell:

- a **FastAPI** service that detects hardware, talks to Ollama, and runs benchmarks,
- a **React + TypeScript** UI (the calm sky/cloud dashboard), and
- an **Electron** shell that launches both, hosts the UI, and shuts everything down on exit.

## The Milestone 1 workflow

```
Detect hardware → Recommend a model → One-click run (Ollama)
   → Baseline benchmark → Apply a safe optimization → Re-benchmark
   → Show honest before/after improvement
```

Everything happens in a clean UI. The only "honest" promise we make is:
**measured improvement on *this* machine** — no fake numbers.

## How the desktop app starts

When the user launches the app:

```
Splash screen → Backend starts → Health check → Frontend loads → Main window opens
```

- **Development:** Vite serves the UI and proxies `/api` to the backend.
- **Production:** a tiny local server inside the shell serves the built UI and proxies
  `/api` to the backend — mirroring the dev proxy so the React app's relative `/api` calls
  (and the streaming model download) work identically with **no frontend changes**.

The backend is terminated automatically whenever the window closes.

## Repository structure

```
.
├── backend/     FastAPI local service (hardware detection, Ollama bridge, benchmark, optimization)
├── frontend/    React + TypeScript + Vite + Tailwind UI (the calm sky/cloud dashboard)
├── electron/    Desktop shell — main process, window, backend supervisor, prod UI server, preload
├── scripts/     Dev helpers + the PyInstaller backend-bundling scripts
├── build/       Application / installer icons (electron-builder buildResources)
├── docs/        Scope, architecture, and the optimization note for the deliverable
└── design/      UI direction and product positioning
```

The Electron shell is intentionally thin and declarative — no business logic lives in it.
See the module headers in [electron/](electron/) for details; ports, window size, and paths
are all centralized in [electron/config.ts](electron/config.ts).

## Window & platform

- **Window:** 1600 × 1000, minimum 1200 × 800, centered, native title bar,
  title "Hue Labs", background matching the app (`#f5f7fc`).
- **Target platform for Milestone 1:** **Windows 11.** One platform, one or two models,
  honest and measurable gains. See [docs/milestone-1-scope.md](docs/milestone-1-scope.md)
  for the full scope and [docs/optimization-notes.md](docs/optimization-notes.md) for the
  deliverable note.

## Ollama

**[Ollama](https://ollama.com/download)** is recommended but optional. The app runs fine
without it installed — it detects that and shows friendly setup guidance instead of failing.

## Status

This is the **initial working scaffold**, now packaged as a desktop application. Hardware
detection, the Ollama bridge, and the benchmark measure **real** values (Ollama reports true
`eval_count` / `eval_duration`). Any temporary mock data is clearly marked with `MOCK:` in
code and never used as final logic.
