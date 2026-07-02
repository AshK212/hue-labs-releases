# Start both the backend and the frontend in separate windows (Windows / PowerShell).
# Usage:  scripts\dev.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Write-Host "Hue Labs — starting dev servers..." -ForegroundColor Cyan

# --- Backend (FastAPI) ---
$backend = Join-Path $root "backend"
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "Set-Location '$backend';" +
    "if (-not (Test-Path .venv)) { python -m venv .venv };" +
    ".\.venv\Scripts\Activate.ps1;" +
    "pip install -q -r requirements.txt;" +
    "uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
)

# --- Frontend (Vite) ---
$frontend = Join-Path $root "frontend"
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "Set-Location '$frontend';" +
    "if (-not (Test-Path node_modules)) { npm install };" +
    "npm run dev"
)

# Find this machine's primary IPv4 address so the frontend can be opened by IP.
$ip = (
    Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object {
            $_.IPAddress -ne "127.0.0.1" -and
            $_.PrefixOrigin -ne "WellKnown" -and
            $_.IPAddress -notlike "169.254.*"
        } |
        Sort-Object SkipAsSource |
        Select-Object -First 1 -ExpandProperty IPAddress
)
if (-not $ip) { $ip = "127.0.0.1" }

Write-Host ""
Write-Host "Backend:  http://${ip}:8000  (docs at /docs)" -ForegroundColor Green
Write-Host "Frontend: http://${ip}:5173" -ForegroundColor Green
Write-Host "          (also available at http://localhost:5173)" -ForegroundColor DarkGray
