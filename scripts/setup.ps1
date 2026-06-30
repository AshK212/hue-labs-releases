# One-time setup: create the Python venv, install backend deps, install frontend deps.
# Usage:  scripts\setup.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Write-Host "Setting up backend..." -ForegroundColor Cyan
Set-Location (Join-Path $root "backend")
if (-not (Test-Path .venv)) { python -m venv .venv }
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
deactivate

Write-Host "Setting up frontend..." -ForegroundColor Cyan
Set-Location (Join-Path $root "frontend")
npm install

Set-Location $root
Write-Host "Done. Run scripts\dev.ps1 to start both servers." -ForegroundColor Green
