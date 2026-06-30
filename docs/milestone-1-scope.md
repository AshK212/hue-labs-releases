# Milestone 1 — Scope

## Goal

A polished MVP workflow that a **non-technical person** can complete end-to-end with
**zero terminal use**:

> Detect hardware → recommend a model → one-click run via Ollama → baseline benchmark
> → apply a safe optimization → re-benchmark → show an honest before/after improvement.

## In scope

| # | Step | What it does |
|---|------|--------------|
| 1 | **Detect hardware** | OS, CPU, memory, GPU; Apple Silicon / NVIDIA detection where possible. |
| 2 | **Show hardware** | Plain-language summary in the UI — no jargon. |
| 3 | **Recommend a model** | 1–2 curated Ollama models, with the *reason* and an estimated tok/s range. |
| 4 | **One-click run** | Check if Ollama is installed/running; friendly guidance if not; one-click pull if the model is missing. |
| 5 | **Baseline benchmark** | A fixed, repeatable prompt; measure real output tokens/sec; store the result. |
| 6 | **Safe optimization** | Apply at least one real, conservative Ollama runtime adjustment. No faked results. |
| 7 | **Re-benchmark** | Same prompt, optimized profile; compare against baseline. |
| 8 | **Before/after screen** | Baseline tok/s, optimized tok/s, improvement %, what changed, honest wording. |
| 9 | **Docs note** | Tested platform, model, prompt, optimization, before/after format. |

## Constraints (from the client)

- Zero terminal use for the end user.
- Polished and usable by a non-technical person.
- **Ollama only** for this milestone.
- **One platform**: Windows 11.
- **One or two models**: `llama3.2:3b` (primary) and `llama3.2:1b` (light alternative).
- Gains must be **honest and measurable**. Modest gains are acceptable.

## Out of scope (Milestone 1)

- Multiple inference engines (llama.cpp directly, LM Studio, vLLM, etc.).
- Cross-platform packaging (macOS / Linux installers).
- Large model catalog, model search, or fine-tuning.
- Streaming token-by-token UI, chat interface.
- Cloud sync or accounts.

## Deliverables

1. Committed code (backend + frontend + docs + design).
2. A short demo video of the full workflow.
3. A short note on the settings tuned — see [optimization-notes.md](optimization-notes.md).

## Definition of done

- A non-technical user can open the app and reach a before/after result without typing a command.
- The before/after numbers are produced by real Ollama measurements (`eval_count` / `eval_duration`).
- If Ollama is missing, the UI guides the user to install and run it.
