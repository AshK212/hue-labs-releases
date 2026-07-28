"""Wires production benchmark + telemetry into the real application flow (Stage 4).

This is the ONE place the live FastAPI app calls into the production pipeline. It
owns the product policy that the transport layer deliberately doesn't:

  * **privacy gating** — telemetry and benchmark submission are honored
    *independently* from :class:`PrivacySettings` (read fresh on every call, so a
    setting synced from the UI takes effect immediately),
  * **required-metrics gate** — a benchmark is submitted only when every required
    measurement is present; if any is missing it is safely skipped, never
    fabricated (the live API's null-handling is unconfirmed, so metrics are
    treated as required),
  * **event allowlist** — only the four approved events are emitted, each with an
    allowlisted, non-identifying props bag (never the raw event properties),
  * **safe errors** — an ``error`` event carries only a stage label and the
    exception *type*; never a raw message, path, prompt, header, token, or key.

Everything here is fire-and-forget and never blocks or fails the local flow: a
benchmark still succeeds and a UI result still returns even with no network.
"""

from __future__ import annotations

import logging
from typing import Callable, Optional

from app import config
from app.privacy.schemas import PrivacySettings
from app.privacy.service import PrivacyService
from app.production import events, identity
from app.production.mapper import ProductionRequestMapper
from app.production.service import ProductionSubmissionService
from app.schemas import BenchmarkResult, HardwareInfo

log = logging.getLogger("local_ai_optimizer.production")

# The measurements a benchmark submission must carry. Because the live API's
# acceptance of nulls is unconfirmed, all are required: if any is missing the
# submission is skipped rather than sent with a null or a fabricated zero.
REQUIRED_BENCHMARK_METRICS = (
    "ram_gb",
    "tokens_per_sec",
    "first_token_latency_ms",
    "vram_used_mb",
)


class ProductionIntegration:
    """Lifecycle hooks the app calls; turns real events into safe submissions."""

    def __init__(
        self,
        service: Optional[ProductionSubmissionService] = None,
        mapper: Optional[ProductionRequestMapper] = None,
        *,
        settings_provider: Optional[Callable[[], PrivacySettings]] = None,
        app_version: str = config.APP_VERSION,
        device_id_provider: Callable[[], str] = identity.get_or_create_device_id,
        session_id_provider: Callable[[], str] = identity.get_session_id,
        os_provider: Callable[[], str] = identity.current_os_string,
        run_id_factory: Callable[[], str] = identity.new_run_id,
    ) -> None:
        self._service = service or ProductionSubmissionService()
        self._mapper = mapper or ProductionRequestMapper()
        self._settings_provider = settings_provider or (
            lambda: PrivacyService().get_settings()
        )
        self._app_version = app_version
        self._device_id_provider = device_id_provider
        self._session_id_provider = session_id_provider
        self._os_provider = os_provider
        self._run_id_factory = run_id_factory
        # app_open fires once per process (per launch); guards against a double
        # lifespan/startup and against dev hot-reloads that don't restart Python.
        self._app_open_sent = False

    # --- lifecycle hooks --------------------------------------------------

    def on_app_open(self) -> None:
        """Emit ``app_open`` exactly once per backend launch (telemetry only)."""
        if self._app_open_sent:
            return
        self._app_open_sent = True
        self._emit(events.APP_OPEN, props={})

    def on_optimize_start(self, *, model: str, profile: Optional[str]) -> None:
        """Emit ``optimize_start`` when a real benchmark/optimization run begins."""
        self._emit(
            events.OPTIMIZE_START,
            props={"modelName": model, "optimizationProfile": profile},
        )

    def on_optimize_complete(
        self,
        *,
        model: str,
        profile: Optional[str],
        hardware: Optional[HardwareInfo],
        result: BenchmarkResult,
    ) -> None:
        """After a successful measured run: emit ``optimize_complete`` and, if the
        required metrics are present, schedule exactly one benchmark submission.

        Telemetry and benchmark submission are gated independently. Neither can
        affect the local result that has already been returned to the UI.
        """
        duration_ms = (
            round(result.total_seconds * 1000) if result.total_seconds else None
        )
        self._emit(
            events.OPTIMIZE_COMPLETE,
            props={
                "modelName": model,
                "optimizationProfile": profile,
                "durationMs": duration_ms,
                "tokensPerSec": result.tokens_per_sec,
            },
        )
        self._maybe_submit_benchmark(
            model=model, profile=profile, hardware=hardware, result=result
        )

    def on_error(self, *, stage: str, exc: BaseException) -> None:
        """Emit a privacy-safe ``error`` event for a meaningful run failure.

        Only ``stage`` and the exception *type name* leave the machine. No raw
        message, traceback, path, prompt, or generated content is ever included.
        """
        error_type = type(exc).__name__
        self._emit(
            events.ERROR,
            props={"stage": stage, "errorType": error_type},
            # errorMessage is intentionally the sanitized type only — never str(exc).
            error_message=error_type,
        )

    async def flush(self, timeout: float = 3.0) -> None:
        """Give in-flight submissions a short, bounded window to finish (shutdown)."""
        await self._service.flush(timeout)

    # --- internals --------------------------------------------------------

    def _emit(
        self, event: str, *, props: dict, error_message: Optional[str] = None
    ) -> None:
        """Build and schedule one telemetry event, gated by telemetry consent."""
        if not self._settings_provider().telemetry_enabled:
            return
        req = self._mapper.telemetry_request(
            event=event,
            props=props,  # filtered to the allowlist inside the mapper
            device_id=self._device_id_provider(),
            session_id=self._session_id_provider(),
            app_version=self._app_version,
            os=self._os_provider(),
            error_message=error_message,
        )
        self._service.submit_telemetry_request_background(req)

    def _maybe_submit_benchmark(
        self,
        *,
        model: str,
        profile: Optional[str],
        hardware: Optional[HardwareInfo],
        result: BenchmarkResult,
    ) -> None:
        if not self._settings_provider().benchmark_submission_enabled:
            return  # submission opted out — no request built, no network call

        # One unique runId per real run; the request is built once so the client's
        # single transient retry re-sends the *same* runId (no duplicate rows).
        run_id = self._run_id_factory()
        req = self._mapper.benchmark_measurement(
            device_id=self._device_id_provider(),
            run_id=run_id,
            app_version=self._app_version,
            hardware=hardware,
            model_name=model,
            model_quant=None,  # the Milestone-1 path doesn't detect quantization
            optimization_profile=profile,
            result=result,
        )

        missing = [f for f in REQUIRED_BENCHMARK_METRICS if getattr(req, f) is None]
        if missing:
            # Log field NAMES only — never values. Safe skip, no fabrication.
            log.info(
                "production: benchmark submission skipped — incomplete metrics %s",
                missing,
            )
            return

        self._service.submit_benchmark_request_background(req)


# Process-wide singleton used by the live app (main.py). Tests construct their
# own ProductionIntegration with injected dependencies.
production = ProductionIntegration()
