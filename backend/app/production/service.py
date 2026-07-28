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
from app.production.schemas import (
    ProductionBenchmarkRequest,
    ProductionTelemetryRequest,
)
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
        # Retained references to in-flight fire-and-forget tasks, so the event
        # loop can't garbage-collect a pending submission mid-flight.
        self._tasks: set[asyncio.Task] = set()

    # --- request-based submitters (Stage 4; never raise) ------------------

    async def submit_benchmark_request(
        self, req: ProductionBenchmarkRequest
    ) -> ProductionSubmitResult:
        """Send a prebuilt benchmark request. Never raises. Retries once (client)."""
        endpoint = "/benchmark"
        guard = self._guard(endpoint)
        if guard is not None:
            return guard
        try:
            result = await self._client.submit_benchmark(req)
        except Exception as exc:  # noqa: BLE001 - defensive; must never propagate
            return self._from_exception(endpoint, exc)
        return self._from_api(endpoint, result)

    async def submit_telemetry_request(
        self, req: ProductionTelemetryRequest
    ) -> ProductionSubmitResult:
        """Send a prebuilt telemetry request. Never raises."""
        endpoint = "/telemetry"
        guard = self._guard(endpoint)
        if guard is not None:
            return guard
        try:
            result = await self._client.submit_telemetry(req)
        except Exception as exc:  # noqa: BLE001 - telemetry must never break the caller
            return self._from_exception(endpoint, exc)
        return self._from_api(endpoint, result)

    def submit_benchmark_request_background(self, req: ProductionBenchmarkRequest) -> None:
        """Schedule a prebuilt benchmark request without blocking the caller."""
        self._schedule(self.submit_benchmark_request(req))

    def submit_telemetry_request_background(self, req: ProductionTelemetryRequest) -> None:
        """Schedule a prebuilt telemetry request without blocking the caller."""
        self._schedule(self.submit_telemetry_request(req))

    # --- awaitable submitters (Stage 3 compat; never raise) ---------------

    async def submit_benchmark(self, run: OptimizationRun) -> ProductionSubmitResult:
        """Submit one benchmark from an OptimizationRun. Never raises."""
        endpoint = "/benchmark"
        guard = self._guard(endpoint)
        if guard is not None:
            return guard
        try:
            req = self._mapper.benchmark(run, device_id=self._device_id_provider())
        except Exception as exc:  # noqa: BLE001
            return self._from_exception(endpoint, exc)
        return await self.submit_benchmark_request(req)

    async def submit_telemetry(
        self, event: TelemetryEvent, *, error_message: Optional[str] = None
    ) -> ProductionSubmitResult:
        """Submit one telemetry event from a Milestone-2 TelemetryEvent. Never raises."""
        endpoint = "/telemetry"
        guard = self._guard(endpoint)
        if guard is not None:
            return guard
        try:
            req = self._mapper.telemetry(
                event,
                device_id=self._device_id_provider(),
                session_id=self._session_id_provider(),
                os=self._os_provider(),
                error_message=error_message,
            )
        except Exception as exc:  # noqa: BLE001
            return self._from_exception(endpoint, exc)
        return await self.submit_telemetry_request(req)

    # --- fire-and-forget (non-blocking) -----------------------------------

    def submit_benchmark_background(self, run: OptimizationRun) -> None:
        """Schedule a benchmark submission without blocking the caller."""
        self._schedule(self.submit_benchmark(run))

    def submit_telemetry_background(
        self, event: TelemetryEvent, *, error_message: Optional[str] = None
    ) -> None:
        """Schedule a telemetry submission without blocking the caller."""
        self._schedule(self.submit_telemetry(event, error_message=error_message))

    # --- lifecycle --------------------------------------------------------

    async def flush(self, timeout: float = 3.0) -> None:
        """Wait up to ``timeout`` seconds for in-flight submissions to finish.

        Called on shutdown so a just-scheduled submission gets a brief, bounded
        chance to complete. Never raises; abandons anything still pending.
        """
        pending = [t for t in self._tasks if not t.done()]
        if not pending:
            return
        try:
            await asyncio.wait(pending, timeout=timeout)
        except Exception:  # noqa: BLE001 - shutdown best-effort
            pass

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
        # Retain a reference until the task finishes; otherwise the loop may drop
        # it and the submission is silently cancelled (see asyncio docs).
        task = loop.create_task(_runner())
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)
