"""Explicit request models for the hosted Hue Labs service (Milestone 3, Stage 3).

These are the *wire* contracts for the approved production endpoints:

    POST /benchmark   → ProductionBenchmarkRequest
    POST /telemetry   → ProductionTelemetryRequest

They are deliberately separate from the local domain models. ``OptimizationRun``
and ``SubmissionPayload`` are NEVER modified or reused as request bodies — the
:mod:`app.production.mapper` translates a domain object into one of these. That
keeps the outward contract stable and decoupled from internal refactors.

Wire shape: the service expects ``camelCase`` keys (``deviceId``, ``ramGB`` …),
so every field carries a Pydantic ``alias``. Serialize for the network with
``model_dump(by_alias=True)``; construct in Python with the readable snake_case
names (``populate_by_name=True``). No field is ever fabricated — anything the
source object doesn't have stays ``None``.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

# Bump when either wire contract changes in a breaking way.
PRODUCTION_SCHEMA_VERSION: str = "production-v1"


class ProductionBenchmarkRequest(BaseModel):
    """Body for ``POST /benchmark``. Serialize with ``by_alias=True``."""

    # populate_by_name: build with snake_case in Python; dump camelCase to the wire.
    # protected_namespaces=(): silence Pydantic's "model_" field-name warning.
    model_config = ConfigDict(populate_by_name=True, protected_namespaces=())

    device_id: str = Field(alias="deviceId")
    app_version: Optional[str] = Field(default=None, alias="appVersion")
    os: Optional[str] = None
    cpu: Optional[str] = None
    gpu: Optional[str] = None
    ram_gb: Optional[float] = Field(default=None, alias="ramGB")
    model_name: Optional[str] = Field(default=None, alias="modelName")
    model_quant: Optional[str] = Field(default=None, alias="modelQuant")
    optimization_profile: Optional[str] = Field(default=None, alias="optimizationProfile")
    tokens_per_sec: Optional[float] = Field(default=None, alias="tokensPerSec")
    first_token_latency_ms: Optional[float] = Field(default=None, alias="firstTokenLatencyMs")
    vram_used_mb: Optional[float] = Field(default=None, alias="vramUsedMB")
    run_id: str = Field(alias="runId")


class ProductionTelemetryRequest(BaseModel):
    """Body for ``POST /telemetry``. Serialize with ``by_alias=True``."""

    model_config = ConfigDict(populate_by_name=True)

    device_id: str = Field(alias="deviceId")
    app_version: Optional[str] = Field(default=None, alias="appVersion")
    os: Optional[str] = None
    session_id: str = Field(alias="sessionId")
    event: str
    props: dict = Field(default_factory=dict)
    error_message: Optional[str] = Field(default=None, alias="errorMessage")
