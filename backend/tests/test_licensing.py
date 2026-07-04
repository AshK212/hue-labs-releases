"""Tests for the Licensing scaffold (Milestone 2).

Runs under pytest or standalone:

    python tests/test_licensing.py   (from backend/)

Deterministic — an in-memory store replaces SQLite; the client is the mock
validator (no network).
"""

from __future__ import annotations

import asyncio
import os
import sys
from typing import Optional

# Make `app` importable when run directly.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.licensing import gates
from app.licensing.schemas import LicenseState
from app.licensing.service import LicenseService


class DictStore:
    def __init__(self) -> None:
        self.data: dict[str, str] = {}

    def get(self, key: str) -> Optional[str]:
        return self.data.get(key)

    def set(self, key: str, value: str) -> None:
        self.data[key] = value


def test_validation_recognizes_dev_keys() -> None:
    service = LicenseService(store=DictStore())
    for key in ("HUE-DEV-12345", "TEST-PRO", "test-pro"):  # case-insensitive
        state = asyncio.run(service.validate_license(key))
        assert state.status == "ACTIVE"
        assert state.plan == "PRO"
        assert gates.FEATURE_UNLIMITED_OPTIMIZATION in state.features
        assert state.validated_at is not None


def test_invalid_key() -> None:
    service = LicenseService(store=DictStore())
    state = asyncio.run(service.validate_license("NOT-A-KEY"))
    assert state.status == "INVALID"
    assert state.plan == "FREE"
    assert state.license_key is None  # bad key isn't retained
    assert gates.FEATURE_UNLIMITED_OPTIMIZATION not in state.features


def test_storage_persists_across_instances() -> None:
    store = DictStore()
    asyncio.run(LicenseService(store=store).validate_license("HUE-DEV-12345"))
    # A fresh service on the same store sees the persisted ACTIVE license.
    reloaded = LicenseService(store=store).get_license()
    assert reloaded.status == "ACTIVE"
    assert reloaded.plan == "PRO"
    assert reloaded.license_key == "HUE-DEV-12345"


def test_default_when_unset() -> None:
    state = LicenseService(store=DictStore()).get_license()
    assert state.status == "UNKNOWN"
    assert state.plan == "FREE"
    assert state.features == [gates.FEATURE_BASIC_OPTIMIZATION]


def test_feature_gate_central() -> None:
    active_pro = LicenseState(status="ACTIVE", plan="PRO")
    free = LicenseState(status="UNKNOWN", plan="FREE")
    expired_pro = LicenseState(status="EXPIRED", plan="PRO")  # lost entitlement

    assert gates.has_feature(gates.FEATURE_UNLIMITED_OPTIMIZATION, active_pro) is True
    assert gates.has_feature(gates.FEATURE_UNLIMITED_OPTIMIZATION, free) is False
    # EXPIRED PRO falls back to FREE features.
    assert gates.has_feature(gates.FEATURE_UNLIMITED_OPTIMIZATION, expired_pro) is False
    assert gates.has_feature(gates.FEATURE_BASIC_OPTIMIZATION, free) is True


def test_service_has_feature_reads_current_license() -> None:
    service = LicenseService(store=DictStore())
    assert service.has_feature(gates.FEATURE_UNLIMITED_OPTIMIZATION) is False
    asyncio.run(service.validate_license("TEST-PRO"))
    assert service.has_feature(gates.FEATURE_UNLIMITED_OPTIMIZATION) is True


def test_clear_license() -> None:
    service = LicenseService(store=DictStore())
    asyncio.run(service.validate_license("HUE-DEV-12345"))
    cleared = service.clear_license()
    assert cleared.status == "UNKNOWN"
    assert cleared.plan == "FREE"
    # Persisted clear survives a reload.
    assert service.get_license().status == "UNKNOWN"
    assert service.has_feature(gates.FEATURE_UNLIMITED_OPTIMIZATION) is False


def _run_all() -> None:
    tests = [
        test_validation_recognizes_dev_keys,
        test_invalid_key,
        test_storage_persists_across_instances,
        test_default_when_unset,
        test_feature_gate_central,
        test_service_has_feature_reads_current_license,
        test_clear_license,
    ]
    for test in tests:
        test()
        print(f"  ok  {test.__name__}")
    print(f"\n{len(tests)} passed")


if __name__ == "__main__":
    _run_all()
