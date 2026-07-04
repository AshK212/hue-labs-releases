"""Data contract for the Benchmark Submission Pipeline (Milestone 2).

``SubmissionPayload`` is the *only* thing that leaves the machine when a user
chooses to submit a result. It carries just the fields the receiving service
needs to build an aggregate/leaderboard — hardware, model, and the headline
before/after numbers. It deliberately excludes all benchmark internals: no
candidate lists, no spill signals, no raw Ollama metadata, no timings, no logs.

Nothing here is telemetry: a payload is built and sent only on an explicit,
user-initiated submission (see :mod:`app.submission.service`).
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel

# Bump when the payload shape changes in a breaking way.
SUBMISSION_SCHEMA_VERSION: str = "submission-v1"


class SubmissionPayload(BaseModel):
    """The minimal, JSON-serializable record sent to the submission endpoint."""

    schema_version: str = SUBMISSION_SCHEMA_VERSION

    # Provenance.
    app_version: Optional[str] = None
    prompt_version: Optional[str] = None

    # Hardware.
    gpu: Optional[str] = None
    vram_mb: Optional[int] = None
    driver_version: Optional[str] = None
    cpu: Optional[str] = None
    ram_mb: Optional[int] = None

    # Model + applied optimization.
    model: Optional[str] = None
    quant: Optional[str] = None
    optimization_settings: Optional[dict] = None

    # Headline measured result.
    before_tokens_per_second: Optional[float] = None
    after_tokens_per_second: Optional[float] = None
    improvement_percent: Optional[float] = None
    score: Optional[float] = None
