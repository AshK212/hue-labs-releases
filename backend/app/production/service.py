"""Async, non-blocking coordinators for production submission (Stage 3).

This is the entry point the app uses to submit a benchmark or a telemetry event
to the hosted Hue Labs service. It ties together identity → mapper → client and
guarantees the three architecture rules:

  * **asynchronous** — the coroutines never block on anything but the awaited
    network call, and ``*_background`` schedules the work as a fire-and-forget
    task so the caller returns immediately.
  * **retry-safe** — the underlying :class:`ProductionApiClient` already retries
    once on a transient failure (network error / timeout / 502/503/504).
  * **non-blocking & never-fatal** — every method returns a small result and
    NEVER raises. A benchmark submission can never fail a local optimization; a
    telemetry submission can never affect UX.

Missing configuration (no API key) is handled gracefully: the call is *skipped*
(cloud submission disabled), not failed, and only presence — never the value —
is ever logged.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from typing import Awaitable, Callable, Optional

from app.optimization.schemas import OptimizationRun
from app.production import identity
from app.production.client import ProductionApiClient
from app.production.mapper import ProductionRequestMapper
from app.telemetry.schemas import TelemetryEvent

log = logging.getLogger(__name__)


@dataclass
class ProductionSubmitResult:
    """Outcome of a submission attempt. Backend-only; carries no secret.

    ``status`` is one of ``"sent" | "skipped" | "disabled" | "failed"``. Any
    ``error`` here comes from the client, which is built to never include the
    API key or request headers.
    """

    status: str
    endpoint: str
    status_code: Optional[int] = None
    error: Optional[str] = None

    @property
    def ok(self) -> bool:
        return self.status == "sent"


class ProductionSubmissionService:
    """Build → send → result, for the /benchmark and /telemetry endpoints."""

    def __init__(
        self,
        client: Optional[ProductionApiClient] = None,
        mapper: Optional[ProductionRequestMapper] = None,
        *,
        enabled: bool = True,
        device_id_provider: Callable[[], str] = identity.get_or_create_device_id,
        session_id_provider: Callable[[], str] = identity.get_session_id,
        os_provider: Callable[[], str] = identity.current_os_string,
    ) -> None:
        self._client = client or ProductionApiClient()
        self._mapper = mapper or ProductionRequestMapper()
        # A caller may still gate the whole feature off (e.g. a privacy setting).
        self.enabled = enabled
        self._device_id_provider = device_id_provider
        self._session_id_provider = session_id_provider
        self._os_provider = os_provider

    # --- awaitable submitters (never raise) -------------------------------

    async def submit_benchmark(self, run: OptimizationRun) -> ProductionSubmitResult:
        """Submit one benchmark. Never raises; never fails local optimization."""
        endpoint = "/benchmark"
        guard = self._guard(endpoint)
        if guard is not None:
            return guard
        try:
            payload = self._mapper.benchmark(run, device_id=self._device_id_provider())
            result = await self._client.submit_benchmark(payload)
        except Exception as exc:  # noqa: BLE001 - defensive; must never propagate
            return self._from_exception(endpoint, exc)
        return self._from_api(endpoint, result)

    async def submit_telemetry(
        self, event: TelemetryEvent, *, error_message: Optional[str] = None
    ) -> ProductionSubmitResult:
        """Submit one telemetry event. Never raises; never affects UX."""
        endpoint = "/telemetry"
        guard = self._guard(endpoint)
        if guard is not None:
            return guard
        try:
            payload = self._mapper.telemetry(
                event,
                device_id=self._device_id_provider(),
                session_id=self._session_id_provider(),
                os=self._os_provider(),
                error_message=error_message,
            )
            result = await self._client.submit_telemetry(payload)
        except Exception as exc:  # noqa: BLE001 - telemetry must never break the caller
            return self._from_exception(endpoint, exc)
        return self._from_api(endpoint, result)

    # --- fire-and-forget (non-blocking) -----------------------------------

    def submit_benchmark_background(self, run: OptimizationRun) -> None:
        """Schedule a benchmark submission without blocking the caller."""
        self._schedule(self.submit_benchmark(run))

    def submit_telemetry_background(
        self, event: TelemetryEvent, *, error_message: Optional[str] = None
    ) -> None:
        """Schedule a telemetry submission without blocking the caller."""
        self._schedule(self.submit_telemetry(event, error_message=error_message))

    # --- internals --------------------------------------------------------

    def _guard(self, endpoint: str) -> Optional[ProductionSubmitResult]:
        """Short-circuit when the feature is off or no key is configured.

        Both are non-fatal, value-free outcomes: disabled by policy, or skipped
        because cloud configuration is unavailable.
        """
        if not self.enabled:
            return ProductionSubmitResult(status="disabled", endpoint=endpoint)
        if not self._client.has_api_key:
            # Cloud configuration unavailable — log presence only, never a value.
            log.info("production: cloud submission unavailable (no API key); skipping %s", endpoint)
            return ProductionSubmitResult(status="skipped", endpoint=endpoint)
        return None

    @staticmethod
    def _from_api(endpoint: str, result) -> ProductionSubmitResult:
        if result.ok:
            return ProductionSubmitResult(
                status="sent", endpoint=endpoint, status_code=result.status_code
            )
        return ProductionSubmitResult(
            status="failed",
            endpoint=endpoint,
            status_code=result.status_code,
            error=result.error,  # client guarantees this never contains the key
        )

    @staticmethod
    def _from_exception(endpoint: str, exc: Exception) -> ProductionSubmitResult:
        # Record only the exception *type* — never str(exc), which could echo a
        # payload value. The API key is never in a type name.
        return ProductionSubmitResult(
            status="failed", endpoint=endpoint, error=f"{type(exc).__name__}"
        )

    def _schedule(self, coro: Awaitable[ProductionSubmitResult]) -> None:
        """Run ``coro`` detached from the caller. Any failure is swallowed."""

        async def _runner() -> None:
            try:
                await coro
            except Exception:  # noqa: BLE001 - the submitters never raise, but be safe
                log.debug("production: background submission raised (suppressed)")

        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            # No running loop (e.g. a sync context): run to completion best-effort.
            # The real backend always has a running loop and takes the branch below.
            try:
                asyncio.run(_runner())
            except Exception:  # noqa: BLE001
                log.debug("production: background submission failed to run (suppressed)")
            return
        loop.create_task(_runner())
