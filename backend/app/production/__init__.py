"""Client for the hosted Hue Labs backend (Milestone 3).

Stage 2 built a reusable, safe HTTP client with a health check. Stage 3 adds the
approved production endpoints on top of that same client:

  * explicit wire models (:mod:`app.production.schemas`),
  * a mapper from local domain objects (:mod:`app.production.mapper`),
  * stable identifiers (:mod:`app.production.identity`), and
  * async, non-blocking, never-fatal submitters (:mod:`app.production.service`).

Benchmark and telemetry submission never raise and never affect the local flow.
"""

from app.production.client import ApiResult, ProductionApiClient
from app.production.integration import ProductionIntegration, production
from app.production.mapper import ProductionRequestMapper
from app.production.schemas import (
    ProductionBenchmarkRequest,
    ProductionTelemetryRequest,
)
from app.production.service import ProductionSubmissionService, ProductionSubmitResult

__all__ = [
    "ProductionApiClient",
    "ApiResult",
    "ProductionRequestMapper",
    "ProductionBenchmarkRequest",
    "ProductionTelemetryRequest",
    "ProductionSubmissionService",
    "ProductionSubmitResult",
    "ProductionIntegration",
    "production",
]
