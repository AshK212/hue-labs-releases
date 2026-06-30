"""Central configuration for the Local AI Optimizer backend.

Values are intentionally simple constants for the MVP. Anything that might
reasonably change per machine can be overridden with an environment variable.
"""

import os

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
