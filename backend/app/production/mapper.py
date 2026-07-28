"""Maps local domain objects onto the production wire models (Stage 3).

The mapper is the ONLY place that reads an ``OptimizationRun`` / ``TelemetryEvent``
and produces a ``ProductionBenchmarkRequest`` / ``ProductionTelemetryRequest``.
Keeping all translation here means:

  * ``OptimizationRun`` and ``SubmissionPayload`` are never modified or reused as
    request bodies — they stay internal.
  * The client and service stay dumb: build here, send there.
  * Nothing is fabricated. A value the run doesn't have (no winner, no GPU, no
    VRAM reading) stays ``None`` rather than being guessed.

The "after" throughput/latency/VRAM come from the *winning* candidate's measured
result — the same winner-lookup rule the submission builder uses.
"""

from __future__ import annotations

from typing import Optional

from app.optimization.schemas import BenchmarkResult, OptimizationRun
from app.production import events
from app.production.schemas import (
    ProductionBenchmarkRequest,
    ProductionTelemetryRequest,
)
from app.schemas import BenchmarkResult as MeasuredBenchmarkResult
from app.schemas import HardwareInfo
from app.telemetry.schemas import TelemetryEvent


class ProductionRequestMapper:
    """Convert domain objects into production request models."""

    def benchmark(
        self,
        run: OptimizationRun,
        *,
        device_id: str,
        run_id: Optional[str] = None,
    ) -> ProductionBenchmarkRequest:
        """OptimizationRun → ProductionBenchmarkRequest.

        ``run_id`` defaults to the run's own id (which is generated per run, i.e.
        per benchmark); pass an override only if a caller mints its own.
        """
        hardware = run.hardware
        gpu = hardware.gpus[0] if hardware and hardware.gpus else None
        winner_result = self._winner_result(run)

        quant = (run.model.quantization if run.model else None) or (
            run.recommendation.quant_recommendation if run.recommendation else None
        )

        return ProductionBenchmarkRequest(
            device_id=device_id,
            app_version=run.app.version if run.app else None,
            os=self._os_string(hardware),
            cpu=hardware.cpu_name if hardware else None,
            gpu=gpu.name if gpu else None,
            ram_gb=hardware.memory_total_gb if hardware else None,
            model_name=run.model.name if run.model else None,
            model_quant=quant,
            # The applied optimization's human label (the winning candidate).
            optimization_profile=run.winner.label if run.winner else None,
            tokens_per_sec=winner_result.tokens_per_sec if winner_result else None,
            first_token_latency_ms=(
                winner_result.time_to_first_token_ms if winner_result else None
            ),
            vram_used_mb=(
                winner_result.resource_observation.gpu_vram_used_mb
                if winner_result
                else None
            ),
            run_id=run_id if run_id is not None else run.run_id,
        )

    def benchmark_measurement(
        self,
        *,
        device_id: str,
        run_id: str,
        app_version: Optional[str],
        hardware: Optional[HardwareInfo],
        model_name: Optional[str],
        model_quant: Optional[str],
        optimization_profile: Optional[str],
        result: MeasuredBenchmarkResult,
    ) -> ProductionBenchmarkRequest:
        """Real measured benchmark → ProductionBenchmarkRequest.

        Built from the live ``POST /benchmark/run`` data (hardware probe + the
        Milestone-1 ``BenchmarkResult``), NOT from a synthetic ``OptimizationRun``.
        Nothing is fabricated: metrics the run didn't measure stay ``None`` and the
        caller's required-metrics gate decides whether to submit.
        """
        gpu = hardware.gpus[0] if hardware and hardware.gpus else None
        return ProductionBenchmarkRequest(
            device_id=device_id,
            app_version=app_version,
            os=self._os_string(hardware),
            cpu=hardware.cpu_name if hardware else None,
            gpu=gpu.name if gpu else None,
            ram_gb=hardware.memory_total_gb if hardware else None,
            model_name=model_name,
            model_quant=model_quant,
            optimization_profile=optimization_profile,
            tokens_per_sec=result.tokens_per_sec,
            first_token_latency_ms=result.first_token_latency_ms,
            vram_used_mb=result.vram_used_mb,
            run_id=run_id,
        )

    def telemetry_request(
        self,
        *,
        event: str,
        props: Optional[dict],
        device_id: str,
        session_id: str,
        app_version: Optional[str] = None,
        os: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> ProductionTelemetryRequest:
        """Approved production event → ProductionTelemetryRequest.

        ``props`` is filtered through the per-event allowlist (never forwarded
        verbatim), so unknown/private keys are dropped before anything is sent.
        """
        return ProductionTelemetryRequest(
            device_id=device_id,
            app_version=app_version,
            os=os,
            session_id=session_id,
            event=event,
            props=events.allow_props(event, props),
            error_message=error_message,
        )

    def telemetry(
        self,
        event: TelemetryEvent,
        *,
        device_id: str,
        session_id: str,
        os: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> ProductionTelemetryRequest:
        """TelemetryEvent → ProductionTelemetryRequest.

        ``props`` is passed through verbatim from the event (the builder already
        guarantees it holds only aggregate, non-personal values). ``errorMessage``
        is only set when a caller explicitly supplies one.
        """
        return ProductionTelemetryRequest(
            device_id=device_id,
            app_version=event.app_version,
            os=os,
            session_id=session_id,
            event=event.event_name,
            props=dict(event.properties),
            error_message=error_message,
        )

    # --- helpers ----------------------------------------------------------

    def _winner_result(self, run: OptimizationRun) -> Optional[BenchmarkResult]:
        """The winning candidate's measured result, or None if there is no winner."""
        if not run.winner:
            return None
        return next(
            (
                r
                for r in run.candidate_results
                if r and r.candidate_id == run.winner.candidate_id
            ),
            None,
        )

    def _os_string(self, hardware) -> Optional[str]:
        """Coarse OS label from the run's hardware probe (e.g. ``"Windows 11"``)."""
        if not hardware:
            return None
        label = f"{hardware.os_name or ''} {hardware.os_version or ''}".strip()
        return label or None
