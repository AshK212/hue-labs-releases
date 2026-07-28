"""Stable identifiers for production submissions (Milestone 3, Stage 3).

Three ids, three lifetimes:

* ``deviceId``  — generated ONCE and persisted, so a machine keeps the same
  anonymous identity across launches. Stored in the existing ``app_settings``
  SQLite table (no new store); nothing personal, just a random uuid.
* ``sessionId`` — generated once per app launch. Because the backend process
  starts once per launch, a process-lifetime value is exactly "per launch".
* ``runId``     — generated fresh for every benchmark.

All three are opaque random uuids — never derived from hardware serials, MAC
addresses, usernames, or anything identifying.

The store/id factories are injectable so tests are deterministic and never touch
the real SQLite database.
"""

from __future__ import annotations

import platform
from typing import Callable, Optional
from uuid import uuid4

from app import storage

# Settings key under which the persistent device id lives.
DEVICE_ID_KEY: str = "production_device_id"

# Default random-id factory (hex uuid4). Injectable for deterministic tests.
_default_id_factory: Callable[[], str] = lambda: uuid4().hex


def get_or_create_device_id(
    *,
    store_get: Callable[[str], Optional[str]] = storage.get_setting,
    store_set: Callable[[str, str], None] = storage.set_setting,
    id_factory: Callable[[], str] = _default_id_factory,
) -> str:
    """Return the persistent device id, generating and storing it once.

    On first call for a machine it mints a new id and writes it to the settings
    table; every later call returns that same value.
    """
    existing = store_get(DEVICE_ID_KEY)
    if existing:
        return existing
    new_id = id_factory()
    store_set(DEVICE_ID_KEY, new_id)
    return new_id


def new_run_id(*, id_factory: Callable[[], str] = _default_id_factory) -> str:
    """A fresh id for a single benchmark submission."""
    return id_factory()


class SessionId:
    """A single per-process (per-launch) session id, created lazily once."""

    def __init__(self, id_factory: Callable[[], str] = _default_id_factory) -> None:
        self._id: Optional[str] = None
        self._id_factory = id_factory

    def get(self) -> str:
        if self._id is None:
            self._id = self._id_factory()
        return self._id

    def reset(self) -> None:
        """Force a new id on the next ``get`` (used to simulate a fresh launch)."""
        self._id = None


# Process-wide session id: stable for the life of this backend process.
_session = SessionId()


def get_session_id() -> str:
    """The session id for this app launch (stable within the process)."""
    return _session.get()


def reset_session_id() -> None:
    """Start a new session (next ``get_session_id`` mints a fresh id)."""
    _session.reset()


def current_os_string() -> str:
    """A coarse OS label, e.g. ``"Windows 11"`` — no hostnames or serials."""
    system = platform.system() or "Unknown"
    release = platform.release() or ""
    return f"{system} {release}".strip()
