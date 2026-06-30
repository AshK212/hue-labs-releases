# Start both the backend and the frontend in separate windows (Windows / PowerShell).
# Usage:  scripts\dev.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Write-Host "Local AI Optimizer — starting dev servers..." -ForegroundColor Cyan

# --- Backend (FastAPI) ---
$backend = Join-Path $root "backend"
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "Set-Location '$backend';" +
    "if (-not (Test-Path .venv)) { python -m venv .venv };" +
    ".\.venv\Scripts\Activate.ps1;" +
    "pip install -q -r requirements.txt;" +
    "uvicorn app.main:app --reload --port 8000"
)

# --- Frontend (Vite) ---
$frontend = Join-Path $root "frontend"
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "Set-Location '$frontend';" +
    "if (-not (Test-Path node_modules)) { npm install };" +
    "npm run dev"
)

Write-Host "Backend:  http://localhost:8000  (docs at /docs)" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
