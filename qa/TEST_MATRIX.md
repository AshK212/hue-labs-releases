# Hue Labs — Test Matrix (GPU tiers × capabilities)

Validate each capability across three GPU tiers. Run on real hardware where
possible; otherwise note the substitution.

**Legend — how to verify:**
- **[UI]** — reachable in the running desktop app.
- **[API]** — reachable via the local backend HTTP API (`http://127.0.0.1:8000`).
- **[BE]** — backend-only capability, **not yet surfaced in the UI**; validate with
  the backend test suite / a Python REPL. See `KNOWN_LIMITATIONS.md`.

**GPU tiers** map to the candidate-generation VRAM buckets in
[`backend/app/optimization/candidates.py`](../backend/app/optimization/candidates.py):

| Tier | Bucket | Tuned presets generated (besides Baseline) |
|------|--------|---------------------------------------------|
| 8 GB (≤ ~8 GB) | `under_8gb` / `8gb` | Balanced, Memory Safe (Performance dropped for safety) |
| 12 GB | `12gb` | Balanced, Performance, Memory Safe |
| 16 GB+ | `16gb` / `24gb_plus` | Balanced, Performance, Memory Safe |

> No dedicated GPU / unreadable VRAM falls back to `under_8gb` (most conservative).
> Apple Silicon uses unified memory as the VRAM proxy (not a shipping target — see
> limitations).

---

## Per-capability expectations

### 1. Hardware detection **[UI][API]** — `GET /hardware`
- Correct OS, CPU name, physical/logical cores, total/available RAM.
- Primary GPU name + VRAM (NVIDIA reports VRAM via `nvidia-smi`; AMD/Intel often
  report the name only with `vram_gb = null`).
- Plain-language `summary` string renders on the Hardware screen.

| Check | 8 GB | 12 GB | 16 GB+ |
|-------|:----:|:-----:|:------:|
| GPU name detected | ☐ | ☐ | ☐ |
| VRAM value present (NVIDIA) | ☐ | ☐ | ☐ |
| Summary shown on Hardware screen | ☐ | ☐ | ☐ |

### 2. Model recommendation **[UI][API]** — `GET /models/recommend`
- Primary recommendation + alternatives with plain reasons and est. tok/s.
- Lighter model bias on smaller RAM/VRAM; heavier allowed on 16 GB+.
- "Already installed" flag correct against Ollama's model list.

| Check | 8 GB | 12 GB | 16 GB+ |
|-------|:----:|:-----:|:------:|
| Primary + alternatives shown | ☐ | ☐ | ☐ |
| Reasoning matches tier | ☐ | ☐ | ☐ |

### 3. VRAM spill detection **[BE]**
`app/optimization/spill.py` — validated via `tests/test_spill.py`. **Not surfaced
in the UI.** Expected classification:
- **Hard** signals confirm a spill (`detected_vram_spill = true`):
  `estimated_vram_exceeds_budget`, `gpu_memory_pressure`, `ollama_allocation_warning`.
- **Soft** signals are advisory only (do **not** alone confirm):
  `tokens_per_second_regression`, `system_ram_growth`.
- Smaller tiers should more readily hit the budget/pressure signals for aggressive
  candidates.

| Check | 8 GB | 12 GB | 16 GB+ |
|-------|:----:|:-----:|:------:|
| `test_spill.py` passes | ☐ | ☐ | ☐ |
| Hard signal → detected=true | ☐ | ☐ | ☐ |
| Soft-only → detected=false (advisory) | ☐ | ☐ | ☐ |

### 4. Optimization
Two distinct layers — validate both and keep them separate:
- **[UI][API] Static optimized profile (Milestone 1, live):** `POST /optimization/apply`
  returns a hardware-aware profile; the Optimize screen applies it and re-benchmarks.
  Expect a *measured* before/after (gain may be modest or ~0 — that's honest).
- **[BE] Measured Optimization Engine (Milestone 2):** `MeasuredOptimizationEngine.optimize`
  generates candidates, benchmarks sequentially, selects a winner (perf 65 / stability
  20 / safety 15, ≥5% improvement), and recommends a quant. Validated via
  `tests/test_engine_optimize.py`, `test_winner.py`, `test_quant.py`,
  `test_candidates`/`test_engine_create_run.py`. **Not yet invoked from the UI.**

| Check | 8 GB | 12 GB | 16 GB+ |
|-------|:----:|:-----:|:------:|
| [UI] Optimized profile applies + re-benchmarks | ☐ | ☐ | ☐ |
| [BE] Candidate count ≤ 4, presets match tier | ☐ | ☐ | ☐ |
| [BE] Winner requires ≥5% measured gain | ☐ | ☐ | ☐ |
| [BE] Quant advice sane for tier (upgrade only on 16 GB+ headroom) | ☐ | ☐ | ☐ |

### 5. Benchmark **[UI][API]** — `POST /benchmark/run`
- Runs the fixed prompt; tokens/sec computed from Ollama's real `eval_count`/
  `eval_duration` (never fabricated).
- Baseline vs optimized use the same prompt/model/deterministic decoding.
- History persists (`GET /benchmark/history`).

| Check | 8 GB | 12 GB | 16 GB+ |
|-------|:----:|:-----:|:------:|
| Baseline tok/s measured | ☐ | ☐ | ☐ |
| Optimized tok/s measured | ☐ | ☐ | ☐ |
| Run appears in history | ☐ | ☐ | ☐ |

### 6. Submission **[BE]**
`app/submission/` — validated via `tests/test_submission.py`. **Mock endpoint**
(`mock://hue-labs/submissions`) by default; no network. **Not user-triggered.**
- `SubmissionPayload` carries only headline fields (no prompts/internals).
- `benchmark_submission_enabled = false` → `submission.state = "opted_out"`, nothing sent.

| Check | 8 GB | 12 GB | 16 GB+ |
|-------|:----:|:-----:|:------:|
| `test_submission.py` passes | ☐ | ☐ | ☐ |
| Mock submit → `submitted` + id | ☐ | ☐ | ☐ |
| Opt-out → `opted_out`, no send | ☐ | ☐ | ☐ |

### 7. Telemetry **[BE]**
`app/telemetry/` — validated via `tests/test_telemetry.py`. **Mock endpoint**
(`mock://hue-labs/telemetry`). **Not auto-emitted.**
- Events: `first_run`, `detect_complete`, `first_optimization_complete`,
  `card_shared`, `submission_sent`, `upgrade_click`.
- Opt-out → `skipped`, client never called. No PII / prompts / logs in payload.

| Check | 8 GB | 12 GB | 16 GB+ |
|-------|:----:|:-----:|:------:|
| `test_telemetry.py` passes | ☐ | ☐ | ☐ |
| Opt-out → skipped (no send) | ☐ | ☐ | ☐ |
| No personal/prompt fields in event | ☐ | ☐ | ☐ |

### 8. Share Card **[UI]**
`frontend/src/features/result-card/` — rendered on the Results screen from the
current before/after run.
- Card shows hardware, model, quant, Before → After tok/s, improvement %, score.
- No winner / no gain → "No measured gain" (no fabricated %).
- Actions: **Export PNG**, **Copy card**, **Share on X** (buttons disabled while busy;
  friendly inline error on failure).

| Check | 8 GB | 12 GB | 16 GB+ |
|-------|:----:|:-----:|:------:|
| Card renders with correct hardware/model | ☐ | ☐ | ☐ |
| Export PNG saves a file | ☐ | ☐ | ☐ |
| Copy card → clipboard image | ☐ | ☐ | ☐ |
| Share on X opens composer | ☐ | ☐ | ☐ |

---

## Tier substitution log
Record actual hardware used per tier (and any substitution):

| Tier | Machine / GPU used | VRAM | Notes |
|------|--------------------|------|-------|
| 8 GB |  |  |  |
| 12 GB |  |  |  |
| 16 GB+ |  |  |  |
