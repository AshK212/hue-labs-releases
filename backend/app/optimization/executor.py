"""Benchmark executor for the Measured Optimization Engine (Milestone 2, scaffold).

Runs candidate configurations **sequentially** and maps each real measured run
into the new :class:`BenchmarkResult` schema, then attaches spill analysis. It
does not select a winner, recommend a quant, or build a share card — those stay
in their own modules.

Reuse, not duplication
----------------------
The tokens/sec measurement already lives in the Milestone 1 benchmark service
(``app.services.benchmark.run_benchmark``), which computes throughput from
Ollama's own timing. This executor reuses that service through a small,
**injectable** adapter (:data:`BenchmarkRunner`) rather than re-implementing any
benchmarking. Tests inject a deterministic stub adapter, so no Ollama call and no
fabricated numbers are involved.

Scaffold limitation (documented on purpose)
-------------------------------------------
The Milestone 1 service derives Ollama options from a *profile name*
("baseline" | "optimized"), not from a candidate's full :class:`RuntimeSettings`.
So for now the default adapter maps the baseline candidate → "baseline" and every
tuned candidate → "optimized". Applying each candidate's exact runtime settings
requires extending the benchmark service to accept explicit options; that is a
later step. Until then, only real values returned by the service are populated —
unmeasured fields stay ``None``.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Awaitable, Callable, Optional

from app import schemas as api_schemas  # Milestone 1 API contract
from app.optimization.schemas import (
    BenchmarkResult,
    BenchmarkTiming,
    CandidateConfig,
)
from app.optimization.spill import detect_vram_spill
from app.schemas import HardwareInfo

# An adapter that produces a real Milestone 1 benchmark result for a candidate.
# Injectable so it can be reused (default) or stubbed deterministically (tests).
BenchmarkRunner = Callable[
    [CandidateConfig, Optional[HardwareInfo]], Awaitable[api_schemas.BenchmarkResult]
]

# Identifies the fixed Milestone 1 prompt these measurements used.
_PROMPT_ID = "milestone1-fixed-prompt"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class BenchmarkSession:
    """Progress state for one sequential benchmark session. Backend-only."""

    run_id: str
    current_candidate: Optional[str] = None  # candidate_id currently running
    total_candidates: int = 0
    completed: int = 0
    cancelled: bool = False
    started_at: Optional[str] = None
    finished_at: Optional[str] = None


async def _default_benchmark_runner(
    candidate: CandidateConfig, hardware: Optional[HardwareInfo]
) -> api_schemas.BenchmarkResult:
    """Default adapter: reuse the Milestone 1 benchmark service.

    Imported lazily so this module (and its tests) don't pull in the Ollama HTTP
    client unless a real run is actually performed. See the module docstring for
    the profile-mapping scaffold limitation.
    """
    if hardware is None:
        # The M1 service needs hardware to build its options; detect on demand.
        from app.services import hardware as hardware_service

        hardware = hardware_service.detect_hardware()

    from app.services import benchmark as m1_benchmark

    is_baseline = bool(candidate.metadata.get("is_baseline")) or candidate.candidate_id == "baseline"
    profile = "baseline" if is_baseline else "optimized"
    return await m1_benchmark.run_benchmark(candidate.model.name, profile, hardware)


def _map_result(
    candidate: CandidateConfig, legacy: api_schemas.BenchmarkResult
) -> BenchmarkResult:
    """Map a real Milestone 1 result into the new schema. Only real values."""
    return BenchmarkResult(
        benchmark_id=str(uuid.uuid4()),
        candidate_id=candidate.candidate_id,
        status="success",
        timing=BenchmarkTiming(
            completed_at=legacy.created_at,
            duration_seconds=legacy.total_seconds,
        ),
        prompt_id=_PROMPT_ID,
        tokens_per_sec=legacy.tokens_per_sec,
        total_tokens=legacy.output_tokens,
        # TTFT / load / eval durations aren't reported by the M1 service → None.
        valid_output=True,
        # The M1 result doesn't quantify measurement confidence.
        confidence=None,
        # Real passthrough of the options actually used (not fabricated).
        raw_ollama_metadata={"profile": legacy.profile, "options": legacy.options},
    )


def _failed_result(candidate: CandidateConfig, error: Exception) -> BenchmarkResult:
    """A failed result — no metrics, just the honest error."""
    return BenchmarkResult(
        benchmark_id=str(uuid.uuid4()),
        candidate_id=candidate.candidate_id,
        status="failed",
        valid_output=False,
        confidence=None,
        error_message=f"{type(error).__name__}: {error}",
    )


class BenchmarkExecutor:
    """Runs candidates sequentially, mapping results and attaching spill info.

    The benchmark runner and spill detector are injectable for testing. No
    parallelism, no winner selection, no quant recommendation.
    """

    def __init__(
        self,
        benchmark_runner: Optional[BenchmarkRunner] = None,
        spill_detector: Callable = detect_vram_spill,
    ) -> None:
        self._runner: BenchmarkRunner = benchmark_runner or _default_benchmark_runner
        self._detect_spill = spill_detector
        self.session: Optional[BenchmarkSession] = None

    def cancel(self) -> None:
        """Request cancellation. The current candidate finishes; no new one starts."""
        if self.session is not None:
            self.session.cancelled = True

    async def execute_candidate(
        self,
        candidate: CandidateConfig,
        hardware: Optional[HardwareInfo] = None,
        baseline_result: Optional[BenchmarkResult] = None,
    ) -> BenchmarkResult:
        """Benchmark one candidate and attach spill analysis.

        Never raises for a benchmark failure — returns a ``failed`` result so the
        caller can decide whether to stop. ``baseline_result`` (when provided) lets
        spill detection compare throughput against the baseline.
        """
        try:
            legacy = await self._runner(candidate, hardware)
        except Exception as error:  # noqa: BLE001 - convert any failure to a result
            return _failed_result(candidate, error)

        result = _map_result(candidate, legacy)

        # Attach spill signals from the just-measured result.
        detected, signals = self._detect_spill(result, candidate, baseline_result)
        result.detected_vram_spill = detected
        result.spill_signals = signals
        return result

    async def execute_all(
        self,
        candidates: list[CandidateConfig],
        hardware: Optional[HardwareInfo] = None,
        run_id: str = "",
    ) -> list[BenchmarkResult]:
        """Execute candidates sequentially. Stop on cancellation or fatal failure.

        The first candidate (the baseline, by generation order) becomes the
        reference for spill detection on later candidates. A ``failed`` result is
        treated as fatal: it is recorded and the sequence stops.
        """
        session = BenchmarkSession(
            run_id=run_id,
            total_candidates=len(candidates),
            started_at=_now(),
        )
        self.session = session

        results: list[BenchmarkResult] = []
        baseline_result: Optional[BenchmarkResult] = None

        for candidate in candidates:
            if session.cancelled:
                break

            session.current_candidate = candidate.candidate_id
            result = await self.execute_candidate(candidate, hardware, baseline_result)
            results.append(result)
            session.completed += 1

            # First successfully executed candidate is the baseline reference.
            if baseline_result is None:
                baseline_result = result

            if result.status == "failed":
                break  # fatal — stop the sequence

        session.current_candidate = None
        session.finished_at = _now()
        return results
