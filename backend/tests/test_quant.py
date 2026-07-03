"""Tests for measured quant recommendation (Milestone 2).

Runs under pytest or standalone:

    python tests/test_quant.py   (from backend/)

Deterministic — fixed inputs, no randomness, no benchmarking, no Ollama.
"""

from __future__ import annotations

import os
import sys

# Make `app` importable when run directly.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.optimization.quant import recommend_quant


def test_spill_detected_downgrades() -> None:
    rec = recommend_quant(current_quant="Q4_K_M", detected_vram_spill=True)
    assert rec.action == "downgrade"
    assert rec.recommended_quant == "Q3_K_M"
    assert rec.reason  # explains why


def test_poor_tps_downgrades() -> None:
    rec = recommend_quant(
        current_quant="Q5_K_M",
        tokens_per_second=10.0,
        baseline_tokens_per_second=20.0,  # 50% of baseline → poor
    )
    assert rec.action == "downgrade"
    assert rec.recommended_quant == "Q4_K_M"
    assert rec.confidence == "high"


def test_stable_keeps() -> None:
    rec = recommend_quant(
        current_quant="Q4_K_M",
        hardware_bucket="12gb",
        tokens_per_second=20.0,
        baseline_tokens_per_second=20.0,  # stable, no spill
    )
    assert rec.action == "keep"
    assert rec.recommended_quant == "Q4_K_M"
    assert rec.confidence == "high"


def test_high_end_gpu_suggests_upgrade() -> None:
    rec = recommend_quant(
        current_quant="Q4_K_M",
        hardware_bucket="24gb_plus",
        tokens_per_second=40.0,
        baseline_tokens_per_second=35.0,   # strong
        available_vram_mb=24000,
        model_size_mb=4000,                # plenty of headroom
    )
    assert rec.action == "upgrade"
    assert rec.recommended_quant == "Q5_K_M"
    assert rec.confidence == "medium"


def test_model_too_large_changes_model() -> None:
    rec = recommend_quant(
        current_quant="Q4_K_M",
        available_vram_mb=6000,
        model_size_mb=20000,  # >> VRAM → no quant will fit it
    )
    assert rec.action == "change_model"
    assert rec.recommended_quant is None
    assert rec.confidence == "high"


def test_spill_at_smallest_quant_changes_model() -> None:
    rec = recommend_quant(current_quant="Q2_K", detected_vram_spill=True)
    assert rec.action == "change_model"
    assert rec.recommended_quant is None


def test_insufficient_data_keeps_with_low_confidence() -> None:
    rec = recommend_quant(current_quant="Q4_K_M")
    assert rec.action == "keep"
    assert rec.confidence == "low"


def _run_all() -> None:
    tests = [
        test_spill_detected_downgrades,
        test_poor_tps_downgrades,
        test_stable_keeps,
        test_high_end_gpu_suggests_upgrade,
        test_model_too_large_changes_model,
        test_spill_at_smallest_quant_changes_model,
        test_insufficient_data_keeps_with_low_confidence,
    ]
    for test in tests:
        test()
        print(f"  ok  {test.__name__}")
    print(f"\n{len(tests)} passed")


if __name__ == "__main__":
    _run_all()
