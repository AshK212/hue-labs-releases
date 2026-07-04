"""Coordinates a submission: Builder → Client → SubmissionStatus.

The service is the single entry point a caller uses to submit a run. It builds
the payload, sends it via the client, and writes the outcome back onto the run's
``submission`` state. It is **exposed, not invoked automatically** — nothing in
the optimization flow calls this; submission only happens when a caller (a future
endpoint or UI action) explicitly asks for it.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from app.optimization.schemas import OptimizationRun, SubmissionStatus
from app.submission.builder import SubmissionBuilder
from app.submission.client import SubmissionClient
from app.submission.schemas import SubmissionPayload


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class SubmissionService:
    """Build → send → record. Updates run.submission in place and returns it."""

    def __init__(
        self,
        client: Optional[SubmissionClient] = None,
        builder: Optional[SubmissionBuilder] = None,
        enabled: bool = True,
    ) -> None:
        self._client = client or SubmissionClient()  # defaults to the local mock
        self._builder = builder or SubmissionBuilder()
        # Gated by PrivacySettings.benchmark_submission_enabled when constructed
        # via PrivacyService. Defaults to True for direct/backward-compatible use.
        self.enabled = enabled

    def build_payload(self, run: OptimizationRun) -> SubmissionPayload:
        """Expose the mapping without sending anything (inspection / preview)."""
        return self._builder.build(run)

    async def submit_run(self, run: OptimizationRun) -> OptimizationRun:
        """Submit a run and update its ``submission`` state. Never raises.

        When submission is disabled (opt-out) → ``state="opted_out"`` and nothing
        is sent. On success → ``state="submitted"`` with an id + timestamp. On any
        failure (build error, transport error, rejection) → ``state="failed"``.
        The run is returned either way.
        """
        if not self.enabled:
            run.submission = SubmissionStatus(state="opted_out")
            return run

        try:
            payload = self._builder.build(run)
            response = await self._client.submit(payload)
        except Exception as exc:  # noqa: BLE001 - record, never crash the caller
            run.submission = SubmissionStatus(
                state="failed", error=f"{type(exc).__name__}: {exc}"
            )
            return run

        if response.ok:
            run.submission = SubmissionStatus(
                state="submitted",
                submission_id=response.submission_id,
                submitted_at=_now(),
            )
        else:
            run.submission = SubmissionStatus(
                state="failed", error=response.error or "The submission was rejected."
            )
        return run
