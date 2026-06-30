# Optimization Notes (Deliverable)

This is the short note required by Milestone 1: what we tested, the prompt, the
optimization applied, and how the before/after result is presented.

> **Honesty policy:** every number shown in the app is measured on the user's own
> machine using Ollama's reported timing. We never hardcode or fabricate results.
> Modest gains are expected and acceptable — the point is that they are *real*.

## Tested platform

- **OS:** Windows 11 (single platform for Milestone 1).
- **Engine:** Ollama (local HTTP API at `127.0.0.1:11434`).
- **Hardware:** the user's own machine; detected automatically and shown in the UI.
  _(Fill in the exact CPU/GPU/RAM of the demo machine when recording the video.)_

## Model used

- **Primary:** `llama3.2:3b` (recommended on machines with ≥ 8 GB RAM).
- **Light alternative:** `llama3.2:1b` (for ≤ 8 GB RAM).

## Benchmark prompt

A single fixed prompt is used for **every** run so comparisons are fair:

```
Explain what a CPU does in a computer, in three short sentences,
using simple language a beginner can understand.
```

Run settings shared by both profiles (for repeatability):

- `num_predict = 200` (bounded output length)
- `temperature = 0` and `seed = 42` (deterministic decoding)

Throughput is computed from Ollama's own measurement:

```
tokens_per_sec = eval_count / (eval_duration / 1e9)
```

## Optimization applied

We compare two **runtime profiles** — only the Ollama runtime options change, the
model and prompt are identical.

### Baseline profile
Ollama defaults (plus the shared repeatability settings above). This is what an
untuned user gets out of the box.

### Optimized profile (hardware-aware, conservative)

| Setting | When applied | Why it's safe / why it can help |
|---------|--------------|---------------------------------|
| `num_thread = <physical cores>` | CPU-only machines | Avoids oversubscribing hyperthreaded logical cores, which often *reduces* throughput. Pinning to physical cores is a common, low-risk win. |
| `num_gpu = 999` | Machines with a GPU (NVIDIA / Apple) | Asks Ollama to offload as many layers as fit in VRAM. Ollama caps this to what actually fits, so it's safe on small GPUs. |
| `num_batch = 512` | Machines with ≥ 8 GB RAM | Larger prompt batch improves prompt-processing throughput at a small, bounded memory cost. |

All of these are **standard, documented Ollama options** passed in the `options`
field of `/api/generate`. They change *how* the model runs, never *what* it outputs
in a way that would distort the measurement.

> See [`backend/app/services/optimization.py`](../backend/app/services/optimization.py)
> for the exact logic.

## Before/after result format

The final screen shows three tiles plus an explanation:

| Field | Example | Source |
|-------|---------|--------|
| **Before** | `18.4 tok/s` | Baseline benchmark run |
| **After** | `21.1 tok/s` | Optimized benchmark run |
| **Improvement** | `+14.7% faster` | `(after − before) / before × 100` |
| **What changed** | "Match CPU threads to physical cores (num_thread=8)" | The optimized profile's `changed_settings` |

Wording shown to the user: **“Measured improvement on this machine — same prompt,
same model, only the runtime settings changed.”**

## Recording the demo

1. Note the demo machine's detected hardware (shown in Step 1).
2. Run the baseline; record the tok/s.
3. Apply optimization; run the optimized benchmark; record the tok/s.
4. Capture the before/after screen with the improvement % and the "what changed" list.
5. Paste the actual numbers into the **Tested platform** section above.

> If a particular machine shows little or no gain, that's fine and honest — report
> it as-is. The optimization is conservative by design.
