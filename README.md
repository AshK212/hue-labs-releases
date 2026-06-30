# Local AI Optimizer

A friendly control layer on top of [Ollama](https://ollama.com) that makes running and
optimizing local AI models easy for **non-technical users** — zero terminal required.

> We are **not** replacing Ollama. We are building a calm, polished desktop-style app that
> sits on top of Ollama and guides a person through the whole workflow with one-click actions.

## The Milestone 1 workflow

```
Detect hardware → Recommend a model → One-click run (Ollama)
   → Baseline benchmark → Apply a safe optimization → Re-benchmark
   → Show honest before/after improvement
```

Everything happens in a clean UI. The only "honest" promise we make is:
**measured improvement on *this* machine** — no fake numbers.

## Repository structure

```
.
├── backend/    FastAPI local service (hardware detection, Ollama bridge, benchmark, optimization)
├── frontend/   React + TypeScript + Vite + Tailwind UI (the calm sky/cloud dashboard)
├── docs/       Scope, architecture, and the optimization note for the deliverable
├── design/     UI direction and product positioning
└── scripts/    Convenience scripts to run everything locally
```

## Quick start

You need: **Python 3.10+**, **Node 18+**, and (recommended) **[Ollama](https://ollama.com/download)**.
The app runs fine without Ollama installed — it will detect that and show friendly setup guidance.

### 1. Backend (FastAPI) — terminal A

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Backend runs at <http://localhost:8000> (interactive API docs at `/docs`).

### 2. Frontend (Vite) — terminal B

```powershell
cd frontend
npm install
npm run dev
```

Frontend runs at <http://localhost:5173> and talks to the backend on port 8000.

### One command (Windows)

```powershell
scripts\dev.ps1
```

Opens both services in separate windows.

## Target platform for Milestone 1

**Windows 11.** One platform, one or two models, honest and measurable gains. See
[docs/milestone-1-scope.md](docs/milestone-1-scope.md) for the full scope and
[docs/optimization-notes.md](docs/optimization-notes.md) for the deliverable note.

## Status

This is the **initial working scaffold**. Hardware detection, the Ollama bridge, and the
benchmark measure **real** values (Ollama reports true `eval_count` / `eval_duration`).
Any temporary mock data is clearly marked with `MOCK:` in code and never used as final logic.
