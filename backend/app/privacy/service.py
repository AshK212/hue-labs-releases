"""Loads/saves PrivacySettings and builds privacy-gated services.

Persistence reuses the existing SQLite settings store (``app.storage``) — no new
database. The store is injectable so tests can use an in-memory dict.

This service is also the single place that wires privacy choices into the
telemetry and submission services: ``build_telemetry_service`` and
``build_submission_service`` read the current settings and pass the enabled flag
through, so those services never hardcode whether they're on.
"""

from __future__ import annotations

from typing import Optional, Protocol

from app.privacy.schemas import PrivacySettings
from app.submission.client import SubmissionClient
from app.submission.service import SubmissionService
from app.telemetry.builder import TelemetryEventBuilder
from app.telemetry.client import TelemetryClient
from app.telemetry.service import TelemetryService

# Key under which the settings JSON is stored.
SETTINGS_KEY = "privacy_settings"


class SettingsStore(Protocol):
    """Minimal key/value persistence used by PrivacyService."""

    def get(self, key: str) -> Optional[str]: ...
    def set(self, key: str, value: str) -> None: ...


class _StorageBackedStore:
    """Default store backed by the existing SQLite settings table."""

    def get(self, key: str) -> Optional[str]:
        from app import storage

        return storage.get_setting(key)

    def set(self, key: str, value: str) -> None:
        from app import storage

        storage.set_setting(key, value)


class PrivacyService:
    """Read/write PrivacySettings and construct privacy-gated services."""

    def __init__(self, store: Optional[SettingsStore] = None) -> None:
        self._store = store or _StorageBackedStore()

    def get_settings(self) -> PrivacySettings:
        """Load settings, falling back to defaults when unset or unreadable."""
        raw = self._store.get(SETTINGS_KEY)
        if not raw:
            return PrivacySettings()
        try:
            return PrivacySettings.model_validate_json(raw)
        except ValueError:
            # Corrupt/legacy value — fall back to safe defaults rather than crash.
            return PrivacySettings()

    def save_settings(self, settings: PrivacySettings) -> PrivacySettings:
        self._store.set(SETTINGS_KEY, settings.model_dump_json())
        return settings

    def update(self, **changes: bool) -> PrivacySettings:
        """Apply and persist a partial change (validated), returning the result."""
        current = self.get_settings()
        updated = PrivacySettings.model_validate({**current.model_dump(), **changes})
        return self.save_settings(updated)

    # --- Privacy-gated service factories ---------------------------------

    def build_telemetry_service(
        self,
        builder: Optional[TelemetryEventBuilder] = None,
        client: Optional[TelemetryClient] = None,
    ) -> TelemetryService:
        """Telemetry service whose enabled flag comes from PrivacySettings."""
        return TelemetryService(
            enabled=self.get_settings().telemetry_enabled,
            builder=builder,
            client=client,
        )

    def build_submission_service(
        self, client: Optional[SubmissionClient] = None
    ) -> SubmissionService:
        """Submission service gated by benchmark_submission_enabled."""
        return SubmissionService(
            client=client,
            enabled=self.get_settings().benchmark_submission_enabled,
        )
