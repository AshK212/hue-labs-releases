"""Central configuration for the Local AI Optimizer backend.

Values are intentionally simple constants for the MVP. Anything that might
reasonably change per machine can be overridden with an environment variable.
"""

import os
from typing import Optional

# Single source of truth for the backend/app version (used in telemetry and
# benchmark submissions, and as the FastAPI app version).
APP_VERSION: str = "0.1.0"

# Where the local Ollama server listens. Ollama's default is 11434.
OLLAMA_HOST: str = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")

# How long to wait on Ollama HTTP calls (seconds). Generation can be slow on CPU.
OLLAMA_TIMEOUT_SECONDS: float = float(os.getenv("OLLAMA_TIMEOUT", "300"))

# CORS origins allowed to call this backend (the Vite dev server).
ALLOWED_ORIGINS: list[str] = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# Local storage location for benchmark history.
DATA_DIR: str = os.getenv(
    "LAO_DATA_DIR",
    os.path.join(os.path.dirname(os.path.dirname(__file__)), "data"),
)
DB_PATH: str = os.path.join(DATA_DIR, "history.db")

# The fixed, repeatable benchmark prompt. Keeping it constant is what makes the
# baseline-vs-optimized comparison fair and honest.
BENCHMARK_PROMPT: str = (
    "Explain what a CPU does in a computer, in three short sentences, "
    "using simple language a beginner can understand."
)

# Upper bound on generated tokens so a benchmark run is bounded and repeatable.
BENCHMARK_NUM_PREDICT: int = 128

# --- Benchmark methodology (v2) -----------------------------------------
# Bumped whenever the measurement protocol changes, so historical rows stay
# distinguishable. v2 = equal warm-up + repeated measured runs + median.
BENCHMARK_METHOD_VERSION: str = "2.0"

# How many warm-up generations to run and DISCARD before measuring. This warms
# the model/GPU so baseline and optimized are both measured from the same warm
# state (removes the cold-vs-warm bias). Configurable; never hardcoded downstream.
BENCHMARK_WARMUP_RUNS: int = max(0, int(os.getenv("LAO_BENCHMARK_WARMUP_RUNS", "1")))

# How many measured generations to run per benchmark; the MEDIAN tokens/sec is
# reported. Bounded to at least 1. Configurable; never hardcoded downstream.
BENCHMARK_MEASURED_RUNS: int = max(1, int(os.getenv("LAO_BENCHMARK_MEASURED_RUNS", "3")))

# Product acceptance threshold (percent). A tuned configuration must beat the
# baseline by at least this margin to be reported as an improvement. This is a
# PRODUCT threshold — NOT a claim of statistical significance.
BENCHMARK_MIN_IMPROVEMENT_PERCENT: float = float(
    os.getenv("LAO_BENCHMARK_MIN_IMPROVEMENT", "5.0")
)

# --- Hue Labs production backend (Milestone 3) ---------------------------
# The hosted service the desktop app talks to for health / (later) benchmark and
# telemetry submission. Base URL is overridable; the API key is ONLY read from
# the environment and is never hardcoded or committed.
HUE_LABS_API_BASE_URL: str = os.getenv(
    "HUE_LABS_API_BASE_URL", "https://hue-labs-backend.onrender.com"
)
HUE_LABS_API_KEY: Optional[str] = os.getenv("HUE_LABS_API_KEY")
# Read timeout (seconds): how long to wait for the service to send a response
# body once connected. The service is on Render's free tier, which can cold-start
# slowly, so keep this generous.
HUE_LABS_API_TIMEOUT_SECONDS: float = float(os.getenv("HUE_LABS_API_TIMEOUT", "15"))
# Connection timeout (seconds): how long to wait to establish the TCP/TLS
# connection. Establishing a connection should be quick even when the far end is
# still cold-starting, so this is much shorter than the read timeout.
HUE_LABS_API_CONNECT_TIMEOUT_SECONDS: float = float(
    os.getenv("HUE_LABS_API_CONNECT_TIMEOUT", "5")
)
# Delay before the single retry on a transient failure (seconds).
HUE_LABS_API_RETRY_DELAY_SECONDS: float = float(os.getenv("HUE_LABS_API_RETRY_DELAY", "1.5"))
