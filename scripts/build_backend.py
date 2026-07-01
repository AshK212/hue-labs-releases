"""Freeze the FastAPI backend into a self-contained executable with PyInstaller.

Run by `npm run backend:build` as part of `npm run dist`. Produces:

    backend/dist/lao-backend/lao-backend.exe   (+ bundled dependencies)

which electron-builder then copies into the installer's resources/backend
directory (see the `extraResources` block in package.json). The Electron shell
launches this exe in production instead of uvicorn.

Design notes:
  * We build a one-folder bundle (not one-file) — it starts faster and avoids
    the temp-extraction step every launch.
  * uvicorn[standard] and FastAPI pull in dependencies PyInstaller cannot always
    discover statically, so we `--collect-all` the frameworks and explicitly add
    the app's own service modules as hidden imports.
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys

# --- Paths ---------------------------------------------------------------
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(ROOT, "backend")
ENTRY = os.path.join(ROOT, "scripts", "run_backend.py")
VENV_PYTHON = os.path.join(BACKEND_DIR, ".venv", "Scripts", "python.exe")
DIST_DIR = os.path.join(BACKEND_DIR, "dist")
BUILD_DIR = os.path.join(BACKEND_DIR, "build")
APP_NAME = "lao-backend"

# The app's own modules that are imported dynamically / indirectly and must be
# forced into the bundle.
HIDDEN_IMPORTS = [
    "app.main",
    "app.config",
    "app.storage",
    "app.schemas",
    "app.services.benchmark",
    "app.services.hardware",
    "app.services.ollama_client",
    "app.services.optimization",
    "app.services.recommender",
]

# Frameworks whose data files / submodules PyInstaller should gather wholesale.
COLLECT_ALL = ["uvicorn", "fastapi", "pydantic", "starlette", "anyio", "httpx"]


def python_exe() -> str:
    """Prefer the project virtualenv's Python; fall back to the current one."""
    return VENV_PYTHON if os.path.exists(VENV_PYTHON) else sys.executable


def ensure_pyinstaller(py: str) -> None:
    """Install PyInstaller into the chosen interpreter if it is missing."""
    check = subprocess.run(
        [py, "-c", "import PyInstaller"],
        capture_output=True,
    )
    if check.returncode != 0:
        print("PyInstaller not found — installing it into the backend venv…")
        subprocess.check_call([py, "-m", "pip", "install", "pyinstaller"])


def build() -> None:
    py = python_exe()
    print(f"Using Python: {py}")
    ensure_pyinstaller(py)

    # Start clean so stale artifacts never leak into the installer.
    for path in (DIST_DIR, BUILD_DIR):
        if os.path.isdir(path):
            shutil.rmtree(path, ignore_errors=True)

    cmd = [
        py,
        "-m",
        "PyInstaller",
        "--noconfirm",
        "--clean",
        "--name",
        APP_NAME,
        "--distpath",
        DIST_DIR,
        "--workpath",
        BUILD_DIR,
        "--specpath",
        BUILD_DIR,
        # Console app: uvicorn logs go to stdout/stderr, which Electron captures.
        "--console",
        # Make the `app` package importable during analysis.
        "--paths",
        BACKEND_DIR,
    ]
    for mod in HIDDEN_IMPORTS:
        cmd += ["--hidden-import", mod]
    for pkg in COLLECT_ALL:
        cmd += ["--collect-all", pkg]
    cmd.append(ENTRY)

    print("Running PyInstaller:\n  " + " ".join(cmd))
    subprocess.check_call(cmd, cwd=BACKEND_DIR)

    exe = os.path.join(DIST_DIR, APP_NAME, f"{APP_NAME}.exe")
    if not os.path.exists(exe):
        raise SystemExit(f"Build failed: expected executable not found at {exe}")
    print(f"\nBackend bundled successfully:\n  {exe}")


if __name__ == "__main__":
    build()
