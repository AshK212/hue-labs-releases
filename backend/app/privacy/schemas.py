"""Privacy settings contract (Milestone 2).

A single, JSON-serializable record of the user's privacy choices. It gates the
opt-in features (telemetry, benchmark submission). Crash reporting is present but
off and not wired yet.
"""

from __future__ import annotations

from pydantic import BaseModel


class PrivacySettings(BaseModel):
    """User privacy preferences. Defaults are the shipping defaults."""

    telemetry_enabled: bool = True
    benchmark_submission_enabled: bool = True
    crash_reports_enabled: bool = False
