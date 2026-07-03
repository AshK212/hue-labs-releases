"""Measured Optimization Engine (Milestone 2).

Contract-only scaffolding for the measured optimization loop: schemas plus
placeholder engine / winner / spill / quant modules. No search runs yet and the
Milestone 1 benchmark + optimization flows are unchanged.
"""

from app.optimization.engine import MeasuredOptimizationEngine
from app.optimization.schemas import (
    SCHEMA_VERSION,
    BenchmarkResult,
    CandidateConfig,
    OptimizationRecommendation,
    OptimizationRun,
    OptimizationWinner,
    QAReport,
    ShareCardArtifact,
    SubmissionStatus,
)

__all__ = [
    "SCHEMA_VERSION",
    "MeasuredOptimizationEngine",
    "CandidateConfig",
    "BenchmarkResult",
    "OptimizationRun",
    "OptimizationWinner",
    "OptimizationRecommendation",
    "ShareCardArtifact",
    "SubmissionStatus",
    "QAReport",
]
