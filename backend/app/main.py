"""FastAPI application — the local service the desktop UI talks to.

Endpoints (Milestone 1):
    GET  /health               liveness check
    GET  /hardware             detected OS / CPU / memory / GPU in plain language
    GET  /ollama/status        is Ollama installed/running + installed models
    POST /ollama/pull          one-click model download
    GET  /models/recommend     recommended model(s) for this machine + reasons
    POST /benchmark/run        run the fixed benchmark (baseline | optimized)
    POST /optimization/apply   return the safe optimized profile for this machine
    GET  /benchmark/history    recent measured runs (honest record)
"""

from __future__ import annotations

import json
import logging
from contextlib import asynccontextmanager

import httpx

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app import config, storage
from app.schemas import (
    ApplyOptimizationRequest,
    ApplyOptimizationResponse,
    BenchmarkRequest,
    BenchmarkResult,
    HardwareInfo,
    OllamaStatus,
    PullModelRequest,
    RecommendationResponse,
)
from app.services import benchmark, hardware as hardware_service, ollama_client, recommender
from app.services.ollama_client import OllamaError
from app.services.optimization import build_optimized_profile

# Make our own logs visible in the backend terminal alongside uvicorn's access log.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("local_ai_optimizer")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    storage.init_db()
    yield


app = FastAPI(
    title="Local AI Optimizer",
    version="0.1.0",
    description="A friendly control layer on top of Ollama.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "local-ai-optimizer", "version": app.version}


@app.get("/hardware", response_model=HardwareInfo)
async def get_hardware() -> HardwareInfo:
    return hardware_service.detect_hardware()


@app.get("/ollama/status", response_model=OllamaStatus)
async def ollama_status() -> OllamaStatus:
    return await ollama_client.get_status()


@app.post("/ollama/pull")
async def ollama_pull(req: PullModelRequest) -> dict:
    """Download a model via Ollama. Blocks until the pull completes.

    Kept for simple/non-streaming callers. The UI uses /ollama/pull/stream.
    """
    try:
        await ollama_client.pull_model(req.model)
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Couldn't download '{req.model}'. Is Ollama running? ({exc})",
        )
    return {"status": "ok", "model": req.model}


@app.post("/ollama/pull/stream")
async def ollama_pull_stream(req: PullModelRequest) -> StreamingResponse:
    """Download a model and stream real progress as newline-delimited JSON.

    Each line is one progress event: {phase, status?, digest?, total?, completed?}.
    Byte counts come straight from Ollama. If the client disconnects (Cancel),
    the generator is closed and the upstream download stream is torn down.
    """

    async def event_stream():
        try:
            async for event in ollama_client.pull_model_stream(req.model):
                yield json.dumps(event) + "\n"
        except httpx.HTTPError as exc:
            yield json.dumps(
                {
                    "phase": "error",
                    "error": f"Couldn't download '{req.model}'. Is Ollama running? ({exc})",
                }
            ) + "\n"

    return StreamingResponse(
        event_stream(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/models/recommend", response_model=RecommendationResponse)
async def recommend_model() -> RecommendationResponse:
    hw = hardware_service.detect_hardware()
    status = await ollama_client.get_status()
    return recommender.recommend(hw, status)


@app.post("/benchmark/run", response_model=BenchmarkResult)
async def benchmark_run(req: BenchmarkRequest) -> BenchmarkResult:
    if req.profile not in ("baseline", "optimized"):
        raise HTTPException(status_code=400, detail="profile must be 'baseline' or 'optimized'.")

    if not await ollama_client.has_model(req.model):
        raise HTTPException(
            status_code=409,
            detail=f"Model '{req.model}' isn't installed yet. Download it first.",
        )

    hw = hardware_service.detect_hardware()
    try:
        result = await benchmark.run_benchmark(req.model, req.profile, hw)
    except OllamaError as exc:
        # Expected, explainable failures (timeout, connection, bad response).
        logger.warning("Benchmark failed (model=%s profile=%s): %s", req.model, req.profile, exc)
        raise HTTPException(status_code=502, detail=str(exc))
    except Exception as exc:  # noqa: BLE001 - log everything else with a traceback
        # Unexpected failure: log the full traceback so it's visible in the terminal.
        logger.exception("Unexpected error during benchmark (model=%s profile=%s)", req.model, req.profile)
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error while benchmarking: {exc.__class__.__name__}: {exc}",
        )

    logger.info(
        "Benchmark ok (model=%s profile=%s): %.2f tok/s over %d tokens",
        req.model, req.profile, result.tokens_per_sec, result.output_tokens,
    )
    storage.save_benchmark(result)
    return result


@app.post("/optimization/apply", response_model=ApplyOptimizationResponse)
async def optimization_apply(req: ApplyOptimizationRequest) -> ApplyOptimizationResponse:
    hw = hardware_service.detect_hardware()
    profile = build_optimized_profile(hw)
    explanation = (
        "We applied a conservative, hardware-aware profile using standard Ollama "
        "runtime settings. Re-run the benchmark to see the measured difference on "
        "this machine."
    )
    return ApplyOptimizationResponse(profile=profile, explanation=explanation)


@app.get("/benchmark/history")
async def benchmark_history() -> dict:
    return {"runs": storage.recent_runs()}
