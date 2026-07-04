"""Privacy settings (Milestone 2).

Opt-in gates for telemetry and benchmark submission, persisted via the existing
SQLite settings store. Crash reporting is present but off / not wired.
"""

from app.privacy.schemas import PrivacySettings
from app.privacy.service import PrivacyService, SETTINGS_KEY

__all__ = ["PrivacySettings", "PrivacyService", "SETTINGS_KEY"]
