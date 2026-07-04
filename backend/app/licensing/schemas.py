"""License state contract (Milestone 2 scaffold).

A single, JSON-serializable record of the machine's current license. This is
scaffolding only — no payments, no checkout. ``features`` is derived from the
plan by the feature gates (see gates.py), so callers check capabilities rather
than comparing plans directly.
"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

LicenseStatus = Literal["ACTIVE", "TRIAL", "EXPIRED", "INVALID", "UNKNOWN"]


class LicenseState(BaseModel):
    """Current license state. Defaults represent an unlicensed (free) machine."""

    status: LicenseStatus = "UNKNOWN"
    license_key: Optional[str] = None
    plan: str = "FREE"
    validated_at: Optional[str] = None   # ISO 8601 UTC
    expires_at: Optional[str] = None     # ISO 8601 UTC, or None for no expiry
    features: list[str] = Field(default_factory=list)
