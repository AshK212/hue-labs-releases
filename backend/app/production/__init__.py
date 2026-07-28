"""Client for the hosted Hue Labs backend (Milestone 3).

Stage 2: a reusable, safe HTTP client with health check. Benchmark and telemetry
submission are added in later stages on top of this same client.
"""

from app.production.client import ApiResult, ProductionApiClient

__all__ = ["ProductionApiClient", "ApiResult"]
