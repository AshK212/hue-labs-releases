"""License lifecycle: validate, read, clear — persisted via existing storage.

Persistence reuses the SQLite settings table (``app.storage``) — no new database.
The store is injectable so tests use an in-memory dict. ``features`` on the stored
state is always recomputed from the plan via the feature gates, so entitlements
stay consistent even if a stored value drifts.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional, Protocol

from app.licensing import gates
from app.licensing.client import ValidationClient
from app.licensing.schemas import LicenseState

# Key under which the license state JSON is stored.
LICENSE_KEY = "license_state"


class SettingsStore(Protocol):
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


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class LicenseService:
    """Validate/read/clear the machine's license state."""

    def __init__(
        self,
        store: Optional[SettingsStore] = None,
        client: Optional[ValidationClient] = None,
    ) -> None:
        self._store = store or _StorageBackedStore()
        self._client = client or ValidationClient()

    def _default_state(self) -> LicenseState:
        state = LicenseState()  # UNKNOWN / FREE
        state.features = gates.features_for(state)
        return state

    def get_license(self) -> LicenseState:
        """Return the persisted license state, or a default free state."""
        raw = self._store.get(LICENSE_KEY)
        if not raw:
            return self._default_state()
        try:
            state = LicenseState.model_validate_json(raw)
        except ValueError:
            return self._default_state()
        # Always recompute features from the plan so entitlements stay correct.
        state.features = gates.features_for(state)
        return state

    async def validate_license(self, license_key: str) -> LicenseState:
        """Validate a key, persist the resulting state, and return it."""
        response = await self._client.validate(license_key)
        entitled = response.status in ("ACTIVE", "TRIAL")
        state = LicenseState(
            status=response.status,
            # Only retain the key when it actually licensed the machine.
            license_key=(license_key or "").strip() if entitled else None,
            plan=response.plan,
            validated_at=_now(),
            expires_at=response.expires_at,
        )
        state.features = gates.features_for(state)
        self._store.set(LICENSE_KEY, state.model_dump_json())
        return state

    def clear_license(self) -> LicenseState:
        """Remove any license, persisting and returning the default free state."""
        default = self._default_state()
        self._store.set(LICENSE_KEY, default.model_dump_json())
        return default

    def has_feature(self, feature_name: str) -> bool:
        """Convenience: check a feature against the currently stored license."""
        return gates.has_feature(feature_name, self.get_license())
