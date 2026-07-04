"""Licensing scaffold (Milestone 2).

Mock license validation + state persistence + centralized feature gates. No
payments, no checkout. Persists via the existing SQLite settings store.
"""

from app.licensing.client import ValidationClient, ValidationResponse
from app.licensing.gates import (
    FEATURE_ADVANCED_CANDIDATES,
    FEATURE_BASIC_OPTIMIZATION,
    FEATURE_PRIORITY_SUBMISSION,
    FEATURE_UNLIMITED_OPTIMIZATION,
    PLAN_FEATURES,
    features_for,
    has_feature,
)
from app.licensing.schemas import LicenseState, LicenseStatus
from app.licensing.service import LICENSE_KEY, LicenseService

__all__ = [
    "LicenseState",
    "LicenseStatus",
    "LicenseService",
    "LICENSE_KEY",
    "ValidationClient",
    "ValidationResponse",
    "has_feature",
    "features_for",
    "PLAN_FEATURES",
    "FEATURE_BASIC_OPTIMIZATION",
    "FEATURE_UNLIMITED_OPTIMIZATION",
    "FEATURE_ADVANCED_CANDIDATES",
    "FEATURE_PRIORITY_SUBMISSION",
]
