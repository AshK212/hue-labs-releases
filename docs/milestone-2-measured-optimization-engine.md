# Milestone 2 — Measured Optimization Engine (Scaffolding Result)

**Status:** Contract-only scaffolding complete. **No search logic runs yet.**
**Date:** 2026-07-04
**Scope of this document:** exactly what was built in the first Milestone 2 step,
what is a placeholder, and what remains. Written so an external planner (e.g.
ChatGPT) can generate correct, non-conflicting prompts for the next steps.

> **Guardrails that still hold (do not break in any future step):**
> - The frontend **never** calls Ollama directly. Everything goes through the
>   FastAPI backend.
> - Milestone 1 behavior is **unchanged** — existing benchmark, optimization,
>   history, dashboard, and onboarding flows work exactly as before.
> - **No fabricated numbers.** Every measured field defaults to `null`/`None`
>   and is only filled from a real measured run.

---

## 1. What this step delivered

A clean, versioned **data contract + module skeleton** for the measured
optimization loop, on both backend (Pydantic) and frontend (TypeScript), plus
minimal tests. This is deliberately *only* the shape — the actual candidate
search, scoring, spill detection, and quant logic are stubbed with `TODO`s.

### Files created

**Backend** — new package `backend/app/optimization/`:

| File | Purpose | State |
|------|---------|-------|
| `__init__.py` | Package exports (`MeasuredOptimizationEngine`, schemas, `SCHEMA_VERSION`). | Done |
| `schemas.py` | All Pydantic data contracts for a measured run. | Done (contract) |
| `engine.py` | `MeasuredOptimizationEngine.create_run(...)` — assembles a valid run from existing data. | Placeholder shell |
| `winner.py` | `select_winner(...)` — winner selection. | Placeholder (baseline-safe) |
| `spill.py` | `detect_vram_spill(...)` + spill-signal constants. | Placeholder |
| `quant.py` | `recommend_quant(...)` + GPU memory buckets. | Placeholder |

**Backend tests** — new:

| File | Purpose |
|------|---------|
| `backend/tests/test_optimization_schemas.py` | 4 minimal tests. Runs standalone (`python tests/test_optimization_schemas.py`) or under pytest. |

**Frontend** — edited:

| File | Change |
|------|--------|
| `frontend/src/types.ts` | Appended Milestone 2 TypeScript mirrors of the backend schemas, under a clearly-marked M2 section. Milestone 1 types untouched. |

### What was NOT touched
`backend/app/schemas.py`, `main.py`, `benchmark.py`, `storage.py`,
`services/optimization.py`, and all Electron/UI code are unchanged. No new API
endpoints were added. No new runtime dependency was added (Pydantic v2 and
TypeScript were already present).

---

## 2. Data contract (source of truth)

Backend: `backend/app/optimization/schemas.py`.
Frontend mirror: the "Milestone 2" section of `frontend/src/types.ts`.
Field names are **snake_case on both sides** so JSON maps 1:1.

### Schema versioning
- `SCHEMA_VERSION = "optimization-run-v1"` (backend constant).
- `OptimizationRun.schema_version` defaults to that value.
- Frontend exposes `OptimizationSchemaVersion = "optimization-run-v1"`.
- Bump this string on any breaking shape change; consumers branch on it.

### Top-level object: `OptimizationRun`
The single source of truth a run produces. Share card, submission, telemetry,
and QA all read from this one object.

| Field | Type | Notes |
|-------|------|-------|
| `run_id` | `str` | UUID. |
| `schema_version` | `str` | Defaults `"optimization-run-v1"`. |
| `app` | `AppInfo` | `{ name="Hue Labs", version, platform }`. |
| `hardware` | `HardwareInfo \| null` | **Reuses the Milestone 1 `HardwareInfo` type.** |
| `model` | `ModelInfo \| null` | The model being optimized. |
| `baseline_config` | `CandidateConfig \| null` | Reference config. |
| `baseline_result` | `BenchmarkResult \| null` | Reference measurement. |
| `candidate_configs` | `CandidateConfig[]` | Configs tried (parallel to results by `candidate_id`). |
| `candidate_results` | `BenchmarkResult[]` | Measured results. |
| `winner` | `OptimizationWinner \| null` | Selected best. |
| `recommendation` | `OptimizationRecommendation \| null` | User-facing advice. |
| `telemetry` | `TelemetryState` | Opt-in; defaults fully off. |
| `submission` | `SubmissionStatus` | Defaults `not_submitted`. |
| `share_card` | `ShareCardArtifact` | Defaults `status="none"`. |
| `qa_report` | `QAReport` | Defaults `status="pending"`. |
| `timing` | `RunTiming` | Wall-clock envelope. |

### `CandidateConfig`
| Field | Type |
|-------|------|
| `candidate_id` | `str` |
| `label` | `str` |
| `model` | `ModelInfo` |
| `runtime` | `RuntimeSettings` |
| `safety` | `SafetyInfo` |
| `metadata` | `dict` / `Record<string, unknown>` |

**`ModelInfo`**: `name`, `family?`, `parameter_size?`, `quantization?`, `size_gb?`.

**`RuntimeSettings`** (real Ollama/llama.cpp knobs; `null` = Ollama default):
`gpu_layers` (num_gpu), `context_size` (num_ctx), `batch_size` (num_batch),
`threads` (num_thread), `flash_attention`, `kv_cache_quantization` (e.g. `f16`,
`q8_0`, `q4_0`).

**`SafetyInfo`**: `estimated_vram_mb?`, `max_allowed_vram_mb?`,
`spill_risk` (`low|medium|high|unknown`), `reason`.

### `BenchmarkResult` (Milestone 2 — richer than the M1 one)
> **Naming:** the backend class is `BenchmarkResult` inside the `optimization`
> namespace. On the frontend it is exported as **`MeasuredBenchmarkResult`**
> because the name `BenchmarkResult` is already taken by the Milestone 1 type.
> See the naming-conflict note in §5.

| Field | Type | Notes |
|-------|------|-------|
| `benchmark_id` | `str` | |
| `candidate_id` | `str` | Links to a `CandidateConfig`. |
| `status` | `pending\|running\|success\|failed\|skipped` | |
| `timing` | `BenchmarkTiming` | `started_at?`, `completed_at?`, `duration_seconds?`. |
| `prompt_version` | `str \| null` | Only compare like-for-like prompts. |
| `prompt_id` | `str \| null` | |
| `tokens_per_sec` | `number \| null` | **null until measured.** |
| `total_tokens` | `number \| null` | |
| `time_to_first_token_ms` | `number \| null` | |
| `eval_duration_ms` | `number \| null` | |
| `load_duration_ms` | `number \| null` | |
| `resource_observation` | `ResourceObservation` | RAM/VRAM/CPU snapshot. |
| `detected_vram_spill` | `bool` | |
| `spill_signals` | `string[]` | From the frozen constants in `spill.py`. |
| `valid_output` | `bool` | |
| `error_message` | `str \| null` | |
| `confidence` | `number \| null` | 0..1 measurement trust. |
| `raw_ollama_metadata` | `dict \| null` | Passthrough for auditing. |

**`ResourceObservation`**: `system_ram_used_mb?`, `system_ram_growth_mb?`,
`gpu_vram_used_mb?`, `cpu_percent?`, `notes?`.

### `OptimizationWinner`
`candidate_id`, `label`, `reason`, `is_baseline`, and four nullable scores:
`performance_score`, `stability_score`, `safety_score`, `total_score`.

### `OptimizationRecommendation`
`summary`, `recommended_candidate_id?`, `recommended_runtime? (RuntimeSettings)`,
`quant_recommendation?`, `notes: string[]`.

### Downstream artifact contracts
- **`ShareCardArtifact`**: `artifact_id?`, `status` (`none|pending|generated|failed`),
  `format?`, `file_path?`, `image_data_uri?`, `created_at?`, `error?`.
- **`SubmissionStatus`**: `state` (`not_submitted|pending|submitted|failed|opted_out`),
  `submission_id?`, `submitted_at?`, `error?`.
- **`TelemetryState`**: `enabled`, `consent_given`, `anonymized` — all default so
  telemetry is off and consent-gated.
- **`QAReport`**: `status` (`pending|passed|failed|skipped`), `checks: QACheck[]`,
  `summary`. **`QACheck`**: `name`, `passed`, `detail`.

---

## 3. Behavior of the placeholder code

### `engine.py` — `MeasuredOptimizationEngine.create_run(...)`
```
create_run(model, hardware=None, app_version=None,
           baseline_result=None, optimized_result=None) -> OptimizationRun
```
- Builds a **valid, serializable** `OptimizationRun`.
- If Milestone 1 `BenchmarkResult`s are passed in, it *reflects* them into the
  new schema: maps `options` keys (`num_gpu→gpu_layers`, `num_ctx→context_size`,
  `num_batch→batch_size`, `num_thread→threads`) and copies the real measured
  `tokens_per_sec`/`output_tokens`/`total_seconds`. **Nothing is synthesized.**
- Calls `winner.select_winner(...)` (currently baseline-safe).
- **Does not** generate candidates or run any search.

### `winner.py` — `select_winner(...)`
- Returns a **baseline-safe** `OptimizationWinner` (with `is_baseline=True`,
  scores `None`) when a baseline exists, else `None`.
- Carries `TODO` for the real weighted scoring:
  **performance 65% + stability 20% + safety 15%**, disqualifying any candidate
  that spilled VRAM or produced invalid output.

### `spill.py` — `detect_vram_spill(...)`
- Returns `(False, [])` for now.
- Defines the **frozen spill-signal vocabulary** (used by `spill_signals`):
  `estimated_vram_exceeds_budget`, `tokens_per_second_regression`,
  `system_ram_growth`, `gpu_memory_pressure`, `ollama_allocation_warning`
  (exported as constants + `ALL_SPILL_SIGNALS`).

### `quant.py` — `recommend_quant(...)`
- Returns `None` for now.
- `gpu_memory_bucket(hardware)` **is** implemented (real, non-faked): classifies
  primary GPU VRAM into buckets `8gb` / `12gb` / `16gb_plus` / `unknown`
  (constants + `ALL_GPU_BUCKETS`). The `recommend_quant` mapping itself is TODO.

---

## 4. Verification performed

- **Backend tests pass** (4/4): run can be created, serializes to JSON, default
  `schema_version == "optimization-run-v1"`, and a *failed* `BenchmarkResult` is
  representable + serializable.
- **Existing app still imports**: `import app.main` and `import app.optimization`
  both succeed.
- **Frontend typecheck passes**: `tsc -b` exits 0 with the new types added.
- **Reflection sanity check**: `create_run` with legacy baseline+optimized
  results correctly populated runtime settings, baseline metrics, and a
  baseline winner, and serialized to JSON.

---

## 5. Known naming conflict (important for next prompts)

There are **two** `BenchmarkResult` types by design:

| Context | Type name | Lives in | Meaning |
|---------|-----------|----------|---------|
| Milestone 1 (unchanged) | `BenchmarkResult` | `app/schemas.py` / `types.ts` | The existing simple API result. |
| Milestone 2 | `BenchmarkResult` (backend) / `MeasuredBenchmarkResult` (frontend) | `app/optimization/schemas.py` / `types.ts` M2 section | The richer measured result. |

Backend keeps them in **separate module namespaces** (no collision). Frontend
renames the M2 one to `MeasuredBenchmarkResult` (single file, names must be
unique). **Do not "unify" or rename these without an explicit migration step.**

---

## 6. What the next steps will build (all currently TODO)

Ordered roughly by dependency. None of this exists yet.

1. **Candidate generation** — produce a safe set of `CandidateConfig`s from the
   hardware + model (bounded, hardware-aware, safety-estimated).
2. **Measured search loop** — benchmark each candidate honestly (reuse the M1
   benchmark path / Ollama timing), fill `BenchmarkResult` including TTFT, load
   duration, and `resource_observation`.
3. **Real spill detection** — implement `detect_vram_spill` against the frozen
   signals; set `detected_vram_spill` + `spill_signals`.
4. **Winner scoring** — implement the 65/20/15 weighting in `select_winner`;
   disqualify spilled/invalid candidates.
5. **Quant recommendation** — implement `recommend_quant` on the GPU buckets.
6. **API endpoints** — expose the run (e.g. `POST /optimization/run`,
   `GET /optimization/run/{id}`); wire storage.
7. **Share card generation** — fill `ShareCardArtifact` (image/data URI).
8. **Submission** — opt-in `SubmissionStatus` flow to a shared leaderboard.
9. **Telemetry** — consent-gated `TelemetryState`.
10. **QA report** — automated `QACheck`s that gate trust before display/submit.
11. **Frontend UI** — screens that render `OptimizationRun` (not built yet).

See also: [`architecture.md`](architecture.md) (M1 system),
[`optimization-notes.md`](optimization-notes.md) (M1 honesty policy + profiles),
[`current-system-state.md`](current-system-state.md) (full snapshot/index).
