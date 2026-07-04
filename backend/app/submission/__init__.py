"""Benchmark Submission Pipeline (Milestone 2).

Opt-in, user-initiated submission of a completed OptimizationRun's headline
result to a configurable endpoint (mock by default). Builder → Client → Service,
with the outcome written back to the run's submission state. No telemetry, no
licensing, no automatic submission.
"""

from app.submission.builder import SubmissionBuilder
from app.submission.client import (
    MOCK_ENDPOINT,
    SubmissionClient,
    SubmissionResponse,
)
from app.submission.schemas import SUBMISSION_SCHEMA_VERSION, SubmissionPayload
from app.submission.service import SubmissionService

__all__ = [
    "SUBMISSION_SCHEMA_VERSION",
    "SubmissionPayload",
    "SubmissionBuilder",
    "SubmissionClient",
    "SubmissionResponse",
    "SubmissionService",
    "MOCK_ENDPOINT",
]
