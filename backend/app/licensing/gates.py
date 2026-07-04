"""Feature gates — the single place capabilities are decided.

Callers ask ``has_feature("...")`` instead of comparing plans/statuses inline, so
entitlement logic lives here and nowhere else. Only ACTIVE/TRIAL licenses grant
their plan's features; EXPIRED/INVALID/UNKNOWN fall back to the free plan.
"""

from __future__ import annotations

from app.licensing.schemas import LicenseState

# Feature flag identifiers.
FEATURE_BASIC_OPTIMIZATION = "basic_optimization"
FEATURE_UNLIMITED_OPTIMIZATION = "unlimited_optimization"
FEATURE_ADVANCED_CANDIDATES = "advanced_candidates"
FEATURE_PRIORITY_SUBMISSION = "priority_submission"

# Which features each plan grants.
PLAN_FEATURES: dict[str, set[str]] = {
    "FREE": {FEATURE_BASIC_OPTIMIZATION},
    "PRO": {
        FEATURE_BASIC_OPTIMIZATION,
        FEATURE_UNLIMITED_OPTIMIZATION,
        FEATURE_ADVANCED_CANDIDATES,
        FEATURE_PRIORITY_SUBMISSION,
    },
}

# Statuses that actually entitle a plan's features.
_ENTITLED_STATUSES = {"ACTIVE", "TRIAL"}


def effective_plan(state: LicenseState) -> str:
    """The plan actually in force (FREE unless a valid, entitled license grants more)."""
    if state.status in _ENTITLED_STATUSES and state.plan in PLAN_FEATURES:
        return state.plan
    return "FREE"


def features_for(state: LicenseState) -> list[str]:
    """Sorted list of features granted by the state's effective plan."""
    return sorted(PLAN_FEATURES[effective_plan(state)])


def has_feature(feature_name: str, state: LicenseState) -> bool:
    """True iff the state's effective plan grants ``feature_name``."""
    return feature_name in PLAN_FEATURES[effective_plan(state)]
