"""Minimal tests for the Measured Optimization Engine contracts.

The backend has no pytest setup yet, so this file is written to run either way:

    * under pytest (if it gets added later), or
    * standalone:  python tests/test_optimization_schemas.py   (from backend/)

It only checks the contract-level guarantees promised in Milestone 2:
build a run, serialize it, verify the default schema version, and confirm a
*failed* benchmark result is still representable.
"""

from __future__ import annotations

import json
import os
import sys

# Make `app` importable when run directly (sys.path[0] would be tests/, not backend/).
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.optimization.engine import MeasuredOptimizationEngine
from app.optimization.schemas import (
    SCHEMA_VERSION,
    BenchmarkResult,
    OptimizationRun,
)


def test_optimization_run_can_be_created() -> None:
    run = MeasuredOptimizationEngine().create_run(model="llama3.2:3b")
    assert isinstance(run, OptimizationRun)
    assert run.run_id
    assert run.model is not None and run.model.name == "llama3.2:3b"


def test_optimization_run_serializes_to_json() -> None:
    run = MeasuredOptimizationEngine().create_run(model="llama3.2:3b")
    payload = run.model_dump_json()
    decoded = json.loads(payload)  # round-trips through JSON cleanly
    assert decoded["run_id"] == run.run_id
    assert decoded["schema_version"] == SCHEMA_VERSION


def test_default_schema_version_is_optimization_run_v1() -> None:
    run = OptimizationRun(run_id="test-run")
    assert run.schema_version == "optimization-run-v1"


def test_failed_benchmark_result_can_be_represented() -> None:
    failed = BenchmarkResult(
        benchmark_id="b1",
        candidate_id="c1",
        status="failed",
        valid_output=False,
        error_message="Ollama reported no generated tokens.",
    )
    assert failed.status == "failed"
    assert failed.valid_output is False
    assert failed.tokens_per_sec is None
    # Still fully serializable despite the failure.
    assert json.loads(failed.model_dump_json())["error_message"]


def _run_all() -> None:
    tests = [
        test_optimization_run_can_be_created,
        test_optimization_run_serializes_to_json,
        test_default_schema_version_is_optimization_run_v1,
        test_failed_benchmark_result_can_be_represented,
    ]
    for test in tests:
        test()
        print(f"  ok  {test.__name__}")
    print(f"\n{len(tests)} passed")


if __name__ == "__main__":
    _run_all()
