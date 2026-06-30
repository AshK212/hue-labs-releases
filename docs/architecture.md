# Architecture

## Overview

Three pieces, all running on the user's own machine:

```
┌──────────────────────┐      HTTP (/api)      ┌───────────────────────┐      HTTP       ┌──────────┐
│  Frontend (React)    │  ───────────────────► │  Backend (FastAPI)    │  ────────────►  │  Ollama  │
│  Vite + Tailwind     │  ◄─────────────────── │  Python local service │  ◄────────────  │  :11434  │
│  :5173               │                       │  :8000                │                 └──────────┘
└──────────────────────┘                       └───────────────────────┘
                                                         │
                                                         ▼
                                                 SQLite (history.db)
```

- **Frontend** is a calm, single-page dashboard. It never talks to Ollama directly —
  it only calls the backend, which keeps the UI simple and the logic testable.
- **Backend** is a thin FastAPI service: it detects hardware, bridges to Ollama,
  recommends a model, runs benchmarks, and defines the optimization profiles.
- **Ollama** is the local inference engine. We treat it as a dependency, never
  replace it.

The Vite dev server proxies `/api/*` to `http://127.0.0.1:8000`, so the frontend
uses relative URLs and there are no CORS issues in development.

## Backend modules

```
backend/app/
├── main.py                 FastAPI app + routes (the API surface)
├── config.py               Constants (Ollama host, benchmark prompt, paths)
├── schemas.py              Pydantic models = the API contract
├── storage.py              SQLite store for benchmark history
└── services/
    ├── hardware.py         OS / CPU / memory / GPU detection → plain language
    ├── ollama_client.py    Async HTTP bridge to Ollama (status, pull, generate)
    ├── recommender.py      Curated model catalog + hardware-based recommendation
    ├── optimization.py     Safe baseline vs optimized runtime profiles
    └── benchmark.py        Runs the fixed prompt, computes real tokens/sec
```

## API surface

| Method | Path | Purpose |
|--------|------|---------|
| GET  | `/health` | Liveness check. |
| GET  | `/hardware` | Detected hardware + plain-language summary. |
| GET  | `/ollama/status` | Is Ollama running? Installed models. |
| POST | `/ollama/pull` | One-click model download (`{ "model": "..." }`). |
| GET  | `/models/recommend` | Recommended model(s) + reasons + estimated tok/s. |
| POST | `/benchmark/run` | Run the benchmark (`{ "model": "...", "profile": "baseline" \| "optimized" }`). |
| POST | `/optimization/apply` | Return the optimized profile for this machine. |
| GET  | `/benchmark/history` | Recent measured runs. |

## How the benchmark stays honest

Ollama's `/api/generate` response includes `eval_count` (tokens generated) and
`eval_duration` (nanoseconds spent generating). We compute:

```
tokens_per_sec = eval_count / (eval_duration / 1e9)
```

This excludes model load time and network overhead, so the figure reflects real
generation throughput. Both baseline and optimized runs use the **same prompt**,
the **same model**, deterministic decoding (`temperature: 0`, fixed `seed`), and a
fixed `num_predict`, so the only thing that differs is the runtime profile.

## Data storage

SQLite (Python stdlib, zero extra dependency) at `backend/data/history.db`, one row
per benchmark run. Simple, file-based, and easy to inspect — appropriate for an MVP.

## Tech choices

- **FastAPI + httpx (async)** — small, modern, great for a local bridge service.
- **psutil** — reliable cross-platform CPU/memory; GPU via best-effort `nvidia-smi`
  / platform probes that never crash the request.
- **React + TypeScript + Vite + Tailwind** — fast dev loop and a polished, themeable UI.
