"""Benchmark executor for the Measured Optimization Engine (Milestone 2).

Runs candidate configurations **sequentially** and maps each real measured run
into the new :class:`BenchmarkResult` schema, then attaches spill analysis. It
does not select a winner, recommend a quant, or build a share card — those stay
in their own modules.

Failure handling
----------------
Two kinds of failure are treated differently:

* **Candidate-specific failure** (a bad option, an invalid output, an unexpected
  error while running one candidate) — recorded as a ``failed`` result; the
  session **continues** with the remaining candidates.
* **Infrastructure failure** (Ollama unavailable / unreachable, the model is
  missing, the backend is down) — recorded for the current candidate and the
  whole session **stops**, since retrying the rest would fail the same way.

Whether an error is "infrastructure" is decided by an injectable classifier
(default: :func:`_default_is_infrastructure_error`).

Hardware is detected **once** per session (off the event loop, via
``asyncio.to_thread``) and reused for every candidate — never re-detected per
candidate.

Reuse, not duplication
----------------------
The tokens/sec measurement already lives in the Milestone 1 benchmark service
(``app.services.benchmark.run_benchmark``), which computes throughput from
Ollama's own timing. This executor reuses that service through a small,
**injectable** adapter (:data:`BenchmarkRunner`) rather than re-implementing any
benchmarking. Tests inject a deterministic stub adapter, so no Ollama call and no
fabricated numbers are involved.

Per-candidate runtime settings
------------------------------
Each candidate's :class:`RuntimeSettings` is translated into an Ollama ``options``
dict by :mod:`app.optimization.adapter` and passed to the benchmark service via
its ``runtime_options`` parameter, so every candidate runs with its *own* explicit
settings. The Milestone 1 profile-based path ("baseline" | "optimized") is left
untouched for existing callers. Only real values returned by the service are
populated — unmeasured fields stay ``None``.
"""

from __future__ import annotations

import asyncio
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


class InfrastructureError(Exception):
    """A failure that dooms the whole session (Ollama/model/backend unavailable).

    Distinct from a candidate-specific failure: the executor records the current
    candidate as failed and then stops, because the remaining candidates would
    fail the same way.
    """


# Substrings that mark an error as infrastructure-level rather than candidate-
# specific. Matched case-insensitively against the error message. These mirror
# the user-safe messages the Milestone 1 Ollama client raises.
_INFRA_MESSAGE_MARKERS: tuple[str, ...] = (
    "couldn't connect to ollama",
    "make sure the ollama app is running",
    "couldn't reach ollama",
    "model not found",
    "no such model",
    "not installed",
    "http 500",
    "http 502",
    "http 503",
    "http 504",
)


def _default_is_infrastructure_error(error: Exception) -> bool:
    """Classify an error as infrastructure-level (fatal) vs candidate-specific.

    Infrastructure = Ollama unavailable/unreachable, model missing, or backend
    down. A connection error (by exception type) or a known infra message marks
    the session as doomed. Timeouts and other per-run errors are treated as
    candidate-specific so the session can continue.
    """
    if "connect" in type(error).__name__.lower():  # ConnectError / ConnectTimeout
        return True
    message = str(error).lower()
    return any(marker in message for marker in _INFRA_MESSAGE_MARKERS)


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
    aborted: bool = False  # set when an infrastructure failure stopped the session


async def _default_benchmark_runner(
    candidate: CandidateConfig, hardware: Optional[HardwareInfo]
) -> api_schemas.BenchmarkResult:
    """Default adapter: reuse the Milestone 1 benchmark service.

    The candidate's runtime settings are converted to Ollama options and passed
    explicitly via ``runtime_options`` so the candidate runs with its own config.
    ``hardware`` is resolved once by the executor and passed in; this runner never
    detects hardware itself. Imported lazily so this module (and its tests) don't
    pull in the Ollama HTTP client unless a real run is actually performed.
    """
    from app.optimization.adapter import runtime_to_ollama_options
    from app.services import benchmark as m1_benchmark

    runtime_options = runtime_to_ollama_options(candidate.runtime)
    # The candidate id is recorded as the run's profile label; the explicit
    # runtime options are what actually drive the benchmark.
    return await m1_benchmark.run_benchmark(
        candidate.model.name,
        candidate.candidate_id,
        hardware,
        runtime_options=runtime_options,
    )


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
        is_infrastructure_error: Callable[[Exception], bool] = _default_is_infrastructure_error,
    ) -> None:
        self._runner: BenchmarkRunner = benchmark_runner or _default_benchmark_runner
        self._detect_spill = spill_detector
        self._is_infra = is_infrastructure_error
        self.session: Optional[BenchmarkSession] = None

    def cancel(self) -> None:
        """Request cancellation. The current candidate finishes; no new one starts."""
        if self.session is not None:
            self.session.cancelled = True

    async def _resolve_hardware(
        self, hardware: Optional[HardwareInfo]
    ) -> HardwareInfo:
        """Return the given hardware, or detect it once — off the event loop.

        Detection shells out to ``nvidia-smi``/PowerShell (blocking), so it runs
        in a worker thread via ``asyncio.to_thread`` to avoid stalling the loop.
        """
        if hardware is not None:
            return hardware
        from app.services import hardware as hardware_service

        return await asyncio.to_thread(hardware_service.detect_hardware)

    async def execute_candidate(
        self,
        candidate: CandidateConfig,
        hardware: Optional[HardwareInfo] = None,
        baseline_result: Optional[BenchmarkResult] = None,
    ) -> BenchmarkResult:
        """Benchmark one candidate and attach spill analysis.

        Returns a ``failed`` result for a candidate-specific failure (the caller
        can continue). Raises :class:`InfrastructureError` for an infrastructure
        failure (Ollama/model/backend unavailable), signalling the caller to stop.
        ``baseline_result`` (when provided) lets spill detection compare throughput
        against the baseline.
        """
        hardware = await self._resolve_hardware(hardware)
        try:
            legacy = await self._runner(candidate, hardware)
        except Exception as error:  # noqa: BLE001 - classify, then convert or re-raise
            if self._is_infra(error):
                raise InfrastructureError(str(error)) from error
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
        """Execute candidates sequentially, resilient to per-candidate failures.

        Hardware is resolved **once** up front and reused for every candidate. A
        candidate-specific failure is recorded and the session continues; an
        infrastructure failure is recorded and stops the session. The first
        *successful* candidate (the baseline, by generation order) becomes the
        reference for spill detection on later candidates.
        """
        session = BenchmarkSession(
            run_id=run_id,
            total_candidates=len(candidates),
            started_at=_now(),
        )
        self.session = session

        # Detect hardware once, off the event loop, and reuse it for all candidates.
        hardware = await self._resolve_hardware(hardware)

        results: list[BenchmarkResult] = []
        baseline_result: Optional[BenchmarkResult] = None

        for candidate in candidates:
            if session.cancelled:
                break

            session.current_candidate = candidate.candidate_id
            try:
                result = await self.execute_candidate(candidate, hardware, baseline_result)
            except InfrastructureError as error:
                # Infrastructure failure: record this candidate, then stop.
                results.append(_failed_result(candidate, error))
                session.completed += 1
                session.aborted = True
                break

            results.append(result)
            session.completed += 1

            # First *successful* candidate is the baseline reference for spill.
            if baseline_result is None and result.status == "success":
                baseline_result = result

            # A candidate-specific failure is recorded but does NOT stop the run.

        session.current_candidate = None
        session.finished_at = _now()
        return results
