# Run & Build Guide

How to run, develop, and package **Local AI Optimizer**. For what the app *is*, see
[README.md](README.md).

---

## 1. Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | 18+ (tested on 24) | Runs the frontend and the Electron shell. |
| **Python** | 3.10+ (tested on 3.12) | Runs the FastAPI backend. |
| **Ollama** | latest | *Optional but recommended.* The app detects it and guides setup if missing. [Download](https://ollama.com/download) |

Target OS for Milestone 1 is **Windows 11**. Commands below use PowerShell.

---

## 2. One-time setup

Install dependencies for all three parts.

```powershell
# From the project root (Work/)

# a) Desktop shell + build tooling (Electron, electron-builder, TypeScript…)
npm install

# b) Frontend
npm --prefix frontend install

# c) Backend (creates a virtualenv and installs requirements)
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ..
```

The dev backend is launched from `backend/.venv`, so that virtualenv must exist.

---

## 3. Run the desktop app (development)

**One command:**

```powershell
npm run desktop
```

This automatically:

1. starts the **Vite** dev server (frontend),
2. waits until it is ready, then compiles the Electron shell,
3. launches **Electron**, which starts the **backend**, waits for its health check, and
   opens the desktop window.

Close the window to stop everything — the backend is terminated automatically.

> **Optional:** set `LAO_DEVTOOLS=1` before running to open Chrome DevTools detached.

### What runs where (dev)

| Part | Address | Notes |
|------|---------|-------|
| Backend (FastAPI) | `http://127.0.0.1:8000` | API docs at `/docs` |
| Frontend (Vite)   | `http://127.0.0.1:5173` | Proxies `/api` → backend |
| Desktop window    | loads the Vite URL      | Native window, no browser |

### Browser-only dev (no Electron)

If you just want the two services in separate terminals (the pre-desktop workflow):

```powershell
scripts\dev.ps1
```

It opens the backend and frontend in their own windows and prints the URLs (including your
LAN IP) to open in a browser.

---

## 4. Build & package (production)

### Quick compile (no installer)

```powershell
npm run build     # builds the frontend + compiles the Electron TypeScript
```

### Full Windows installer + portable exe

```powershell
npm run dist
```

This runs the complete pipeline:

1. `frontend:build` — builds the React app to `frontend/dist/`.
2. `electron:compile` — compiles `electron/*.ts` → `dist-electron/`.
3. `backend:build` — freezes the backend into `backend/dist/lao-backend/lao-backend.exe`
   with **PyInstaller** (installs PyInstaller into the venv on first run).
4. `electron-builder --win` — packages everything into installers.

**Output → `release/`:**

| File | What it is |
|------|-----------|
| `Local AI Optimizer-0.1.0-Setup.exe` | NSIS installer (desktop + Start Menu shortcuts, choose install dir) |
| `Local AI Optimizer-0.1.0-Portable.exe` | Single-file portable executable |
| `win-unpacked/` | The unpacked app (useful for quick testing) |

To produce just the unpacked app (faster, skips the installer step):

```powershell
npm run dist:unpacked
```

### In production, where does data go?

The bundled backend's benchmark history DB is written to a per-user, writable location:
`%APPDATA%\Local AI Optimizer\data\` (the install directory stays read-only). Desktop shell
logs go to `%APPDATA%\Local AI Optimizer\logs\desktop.log`.

---

## 5. Windows prerequisite for `npm run dist` (important)

electron-builder downloads a `winCodeSign` toolchain that contains **macOS symlinks**.
Extracting them on Windows needs the *"create symbolic link"* privilege, which a normal
user session lacks. If you see:

```
ERROR: Cannot create symbolic link : A required privilege is not held by the client.
```

fix it **once** by either:

- **Enable Developer Mode** — Settings → *Privacy & security* → *For developers* →
  **Developer Mode = On**, then re-run `npm run dist`; **or**
- **Run the build from an Administrator terminal.**

After the first successful extraction the toolchain is cached, so later builds work normally.
This is a standard electron-builder-on-Windows requirement and is unrelated to the app code.

---

## 6. npm scripts reference

| Script | What it does |
|--------|--------------|
| `npm run desktop` | **Dev:** start frontend + backend + Electron together. |
| `npm run build` | Build the frontend and compile the Electron shell. |
| `npm run dist` | Build everything and produce the Windows installer + portable exe. |
| `npm run dist:unpacked` | Same as `dist` but only the unpacked app (no installer). |
| `npm run backend:build` | Freeze the backend into a standalone exe (PyInstaller). |
| `npm run electron:compile` | Compile `electron/*.ts` → `dist-electron/`. |
| `npm run frontend:dev` | Start only the Vite dev server. |
| `npm run frontend:build` | Build only the frontend. |
| `npm run desktop:electron` | Internal: wait for Vite, compile, launch Electron (used by `desktop`). |

---

## 7. Troubleshooting

| Symptom | Cause / Fix |
|---------|-------------|
| `Cannot create symbolic link … privilege` during `npm run dist` | See **section 5** — enable Developer Mode or run elevated. |
| Window opens but startup fails / "Backend did not become healthy" | The dev backend uses `backend/.venv`. Recreate it (section 2c). Check `%APPDATA%\Local AI Optimizer\logs\desktop.log`. |
| `Port 5173 is in use` / app loads the wrong UI | A previous Vite server is still running. Close it (or `Stop-Process` the stale `node`/`vite`), then relaunch. |
| Benchmarks fail with "Couldn't reach Ollama" | Ollama isn't running. Start Ollama (or install it); the rest of the app still works without it. |
| Icon/metadata not updating in a rebuild | Delete `release/` and rebuild so electron-builder re-stamps the executable. |

