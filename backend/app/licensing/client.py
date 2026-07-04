"""License validation client — mock only (no payments, no network).

Recognizes a small set of developer/test keys and maps everything else to
INVALID. A real implementation would call a licensing endpoint; the interface is
kept async so that swap needs no caller changes.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from app.licensing.schemas import LicenseStatus

# Keys the mock recognizes (compared case-insensitively) → plan.
_KNOWN_KEYS: dict[str, str] = {
    "HUE-DEV-12345": "PRO",
    "TEST-PRO": "PRO",
}


@dataclass
class ValidationResponse:
    """Result of validating a key. Backend-only."""

    status: LicenseStatus
    plan: str
    expires_at: Optional[str] = None
    error: Optional[str] = None


class ValidationClient:
    """Mock validator. No network required."""

    def __init__(self, known_keys: Optional[dict[str, str]] = None) -> None:
        self._known = known_keys or _KNOWN_KEYS

    async def validate(self, license_key: str) -> ValidationResponse:
        key = (license_key or "").strip()
        plan = self._known.get(key.upper())
        if plan:
            # Dev/test keys never expire in the mock.
            return ValidationResponse(status="ACTIVE", plan=plan, expires_at=None)
        return ValidationResponse(status="INVALID", plan="FREE", error="Unrecognized license key.")
