"""Tests for the Benchmark Submission Pipeline (Milestone 2).

Runs under pytest or standalone:

    python tests/test_submission.py   (from backend/)

Deterministic — the default client uses the local mock transport (no network),
and failure cases inject stub transports. No real network calls.
"""

from __future__ import annotations

import asyncio
import json
import os
import sys

# Make `app` importable when run directly.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.optimization.schemas import (
    AppInfo,
    BenchmarkResult,
    CandidateConfig,
    ModelInfo,
    OptimizationRecommendation,
    OptimizationRun,
    OptimizationWinner,
    RuntimeSettings,
)
from app.schemas import GpuInfo, HardwareInfo
from app.submission.client import SubmissionClient, SubmissionResponse
from app.submission.schemas import SUBMISSION_SCHEMA_VERSION
from app.submission.service import SubmissionService


def _run(*, with_winner: bool = True) -> OptimizationRun:
    hardware = HardwareInfo(
        os_name="Windows 11", os_version="x", cpu_name="AMD Ryzen 7 5800X",
        cpu_cores_physical=8, cpu_cores_logical=16,
        memory_total_gb=32.0, memory_available_gb=16.0,
        gpus=[GpuInfo(name="NVIDIA RTX 3060", vendor="NVIDIA", vram_gb=12.0)],
    )
    winner = OptimizationWinner(candidate_id="balanced", label="Balanced", total_score=88.0) if with_winner else None
    return OptimizationRun(
        run_id="run-1",
        app=AppInfo(name="Hue Labs", version="0.2.0"),
        hardware=hardware,
        model=ModelInfo(name="llama3.2:3b", quantization="Q4_K_M"),
        baseline_result=BenchmarkResult(
            benchmark_id="b0", candidate_id="baseline", status="success",
            tokens_per_sec=18.4, valid_output=True, prompt_version="prompt-v1",
        ),
        candidate_configs=[
            CandidateConfig(
                candidate_id="balanced", label="Balanced", model=ModelInfo(name="llama3.2:3b"),
                runtime=RuntimeSettings(gpu_layers=999, batch_size=512),
            )
        ],
        candidate_results=[
            BenchmarkResult(
                benchmark_id="b1", candidate_id="balanced", status="success",
                tokens_per_sec=21.1, valid_output=True,
            )
        ],
        winner=winner,
        recommendation=OptimizationRecommendation(
            recommended_candidate_id="balanced",
            recommended_runtime=RuntimeSettings(gpu_layers=999, batch_size=512),
            quant_recommendation="Q4_K_M",
        ),
    )


def test_payload_mapping() -> None:
    payload = SubmissionService().build_payload(_run())
    assert payload.schema_version == SUBMISSION_SCHEMA_VERSION
    assert payload.app_version == "0.2.0"
    assert payload.prompt_version == "prompt-v1"
    assert payload.gpu == "NVIDIA RTX 3060"
    assert payload.vram_mb == 12288          # 12 GB → MB
    assert payload.driver_version is None    # not detected → honest None
    assert payload.cpu == "AMD Ryzen 7 5800X"
    assert payload.ram_mb == 32768           # 32 GB → MB
    assert payload.model == "llama3.2:3b"
    assert payload.quant == "Q4_K_M"
    assert payload.optimization_settings == {"gpu_layers": 999, "batch_size": 512}
    assert payload.before_tokens_per_second == 18.4
    assert payload.after_tokens_per_second == 21.1
    assert round(payload.improvement_percent, 1) == 14.7
    assert payload.score == 88.0


def test_serialization_excludes_internals() -> None:
    payload = SubmissionService().build_payload(_run())
    decoded = json.loads(payload.model_dump_json())
    assert decoded["schema_version"] == "submission-v1"
    # No benchmark internals leak into the payload.
    for leaked in ("candidate_results", "spill_signals", "raw_ollama_metadata", "timing", "benchmark_id"):
        assert leaked not in decoded


def test_no_winner_maps_to_empty_result() -> None:
    payload = SubmissionService().build_payload(_run(with_winner=False))
    assert payload.after_tokens_per_second is None
    assert payload.improvement_percent is None
    assert payload.score is None
    assert payload.before_tokens_per_second == 18.4  # baseline still reported


def test_mock_submission_updates_state() -> None:
    service = SubmissionService()  # default = local mock client, no network
    run = asyncio.run(service.submit_run(_run()))
    assert run.submission.state == "submitted"
    assert run.submission.submission_id and run.submission.submission_id.startswith("sub_")
    assert run.submission.submitted_at is not None
    assert run.submission.error is None


def test_mock_submission_is_deterministic() -> None:
    service = SubmissionService()
    a = asyncio.run(service.submit_run(_run())).submission.submission_id
    b = asyncio.run(service.submit_run(_run())).submission.submission_id
    assert a == b  # same payload → same id, no randomness


def test_submission_failure_rejected() -> None:
    async def rejecting_transport(endpoint: str, body: dict) -> SubmissionResponse:
        return SubmissionResponse(ok=False, error="Endpoint rejected the submission", status_code=422)

    service = SubmissionService(client=SubmissionClient(transport=rejecting_transport))
    run = asyncio.run(service.submit_run(_run()))
    assert run.submission.state == "failed"
    assert "rejected" in (run.submission.error or "")
    assert run.submission.submission_id is None


def test_submission_failure_transport_raises() -> None:
    async def exploding_transport(endpoint: str, body: dict) -> SubmissionResponse:
        raise RuntimeError("connection reset")

    service = SubmissionService(client=SubmissionClient(transport=exploding_transport))
    run = asyncio.run(service.submit_run(_run()))
    assert run.submission.state == "failed"
    assert "connection reset" in (run.submission.error or "")


def test_default_client_is_mock_no_network() -> None:
    # With no endpoint configured and no env var, the client is the local mock.
    os.environ.pop("HUE_LABS_SUBMISSION_ENDPOINT", None)
    client = SubmissionClient()
    assert client.is_mock is True
    assert client.endpoint == "mock://hue-labs/submissions"


def _run_all() -> None:
    tests = [
        test_payload_mapping,
        test_serialization_excludes_internals,
        test_no_winner_maps_to_empty_result,
        test_mock_submission_updates_state,
        test_mock_submission_is_deterministic,
        test_submission_failure_rejected,
        test_submission_failure_transport_raises,
        test_default_client_is_mock_no_network,
    ]
    for test in tests:
        test()
        print(f"  ok  {test.__name__}")
    print(f"\n{len(tests)} passed")


if __name__ == "__main__":
    _run_all()
