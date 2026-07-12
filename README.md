# Hue Labs

**Run and tune local AI on your own computer — no terminal, no guesswork.**

Hue Labs is a calm, native **Windows desktop app** that sits on top of
[Ollama](https://ollama.com) and walks anyone through running a local AI model,
measuring how fast it goes, and making it faster — with **honest, measured
results** and one‑click actions. Everything runs on your machine. Nothing about
your prompts or your work ever leaves it.

> We don't replace Ollama. We put a warm, polished experience in front of it so
> that "running AI locally" feels less like a command line and more like a good
> Mac app.

**Want to run or build it?** Start with **[RunGuide.md](RunGuide.md)**.

---

## What it feels like to use

You double‑click one icon. The app starts its own engine in the background, waits
until it's ready, and opens a single clean window — no browser, no URL bar,
nothing to start by hand. From there a short, friendly setup guides you through:

```
Detect your hardware  →  Recommend a model  →  Download it (one click)
   →  Measure your speed  →  Tune for your machine  →  Measure again
   →  See the honest before/after  →  Share your result
```

The one promise we make everywhere: **the numbers are real.** Speed is measured
on *your* computer using the model's own timing — never faked, never rounded up.
If a tune doesn't help on your hardware, the app says so plainly.

## What's inside

Hue Labs is one desktop app made of three cooperating parts:

- **A local backend** (Python / FastAPI) that detects your hardware, talks to
  Ollama, runs benchmarks, and powers the optimization engine.
- **A React + TypeScript interface** — the calm, warm dashboard and the guided
  setup you actually see.
- **An Electron shell** that launches the backend, hosts the UI, keeps everything
  in sync, and shuts it all down cleanly when you close the window.

When you launch the app:

```
Splash  →  Backend starts  →  Health check  →  UI loads  →  Window opens
```

The backend is stopped automatically whenever you quit — no stray processes, no
leftovers.

## Highlights

**Measured Optimization Engine.** Instead of guessing, Hue Labs tries a small,
safe set of runtime configurations tuned to your GPU/CPU, benchmarks each one
honestly, watches for VRAM "spill" (when a model overflows your graphics memory
and slows down), and picks a winner only when it's genuinely faster.

**Shareable Result Card.** Every run produces a clean, premium result card you
can **export as a PNG**, **copy to your clipboard**, or **share on X** — a nice
way to show off a real, measured improvement.

**Private by default.** Your models, prompts, and benchmarks never leave your
computer. Optional, fully **anonymous** usage analytics and benchmark sharing are
**off unless you turn them on** in Settings — and there's nothing personal in
them, ever.

**Automatic updates.** The app can keep itself up to date via GitHub Releases,
with a careful shutdown sequence so an update never interrupts a running model.

**Built for a real release.** Windows installer, auto‑start backend, code‑signing
setup, and a full QA checklist are all in place for shipping to real users.

## Honesty & privacy

- **Local‑first.** All AI work happens on your machine through Ollama. No account,
  no internet connection required to use the app.
- **Real measurements only.** Throughput comes straight from the model's reported
  timing. We never fabricate a result.
- **Opt‑in, anonymous.** Usage analytics and community benchmark submission are
  disabled by default and contain no prompts and no personal data. You control
  them in **Settings → Privacy**.

## Project layout

```
.
├── backend/     FastAPI service — hardware detection, Ollama bridge, benchmarks,
│                and the optimization/submission/telemetry/privacy/licensing modules
├── frontend/    React + TypeScript + Vite + Tailwind UI, including the Result Card
├── electron/    Desktop shell — main process, window, backend supervisor, auto-updater
├── scripts/     Dev helpers + the PyInstaller backend-bundling scripts
├── build/       Installer icons + the code-signing config example
├── docs/        Architecture, release guide, and engineering notes
├── qa/          Release validation: test matrix, smoke test, checklist, known limits
└── design/      Product direction and UI positioning
```

The Electron shell is intentionally thin — no business logic lives in it. Ports,
window size, and paths are centralized in
[electron/config.ts](electron/config.ts).

## Tech stack

- **Desktop:** Electron 33, packaged with electron-builder (NSIS installer),
  auto-updates via electron-updater.
- **Backend:** Python 3 + FastAPI, bundled into a standalone executable with
  PyInstaller. Talks to Ollama over its local HTTP API.
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS.
- **Platform:** Windows 11 (x64).

## Getting started

- **Run or build the app:** **[RunGuide.md](RunGuide.md)** — the step‑by‑step guide
  for development and for producing the installer.
- **Ship a release:** **[docs/RELEASE.md](docs/RELEASE.md)** — the GitHub Releases
  update flow, code‑signing setup, and CI notes.
- **Validate a build:** **[qa/](qa/)** — the test matrix, smoke test, and release
  checklist used before shipping.

[Ollama](https://ollama.com/download) is recommended but optional — if it isn't
installed or running, the app detects that and shows friendly guidance instead of
failing.

## Current status

The core product is **complete and packaged as a Windows desktop app**: guided
setup, hardware detection, model recommendation and download, honest baseline and
optimized benchmarks, the measured optimization engine, and the shareable result
card all work end to end.

A few integrations are intentionally **staged for the client's own services** and
currently run against safe placeholders:

- **Auto‑updates** are wired to **GitHub Releases** (configured; publishing is a
  deliberate, token‑gated step).
- **Community benchmark submission** and **anonymous telemetry** are complete and
  opt‑in, pointing at mock endpoints until the production URLs are provided.
- **Licensing / Pro features** ship as a working scaffold, ready to connect to the
  billing provider.
- **Code signing** (Azure Trusted Signing) is set up but not enabled by default, so
  local builds stay simple.

Every placeholder is documented — see [qa/KNOWN_LIMITATIONS.md](qa/KNOWN_LIMITATIONS.md)
and [docs/RELEASE.md](docs/RELEASE.md).
