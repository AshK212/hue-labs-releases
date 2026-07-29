# Run & Build Guide

How to run, develop, and package **Hue Labs**. For what the app *is*, see
[README.md](README.md).

---

## 1. Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | 18+ (tested on 24) | Runs the frontend and the Electron shell. |
| **Python** | 3.10+ (tested on 3.12) | Runs the FastAPI backend. |
| **Ollama** | latest | *Optional but recommended.* The app detects it and guides setup if missing. [Download](https://ollama.com/download) |

**Supported platforms:** Windows 11 (production reference) and macOS (validated on Intel/x64, macOS 15).
The commands below are given for both — **PowerShell** on Windows and **bash/zsh (Terminal)**
on macOS. The dev and build commands are otherwise identical across platforms; only the
shell syntax and a few paths differ.

---

## 2. One-time setup

Install dependencies for all three parts.

**Windows (PowerShell):**

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

**macOS (bash/zsh):**

```bash
# From the project root (Work/)

# a) Desktop shell + build tooling
npm install

# b) Frontend
npm --prefix frontend install

# c) Backend (creates a virtualenv and installs requirements)
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
cd ..
```

The dev backend is launched from `backend/.venv`, so that virtualenv must exist. The
runtime picks the right interpreter per platform automatically —
`backend/.venv/Scripts/python.exe` on Windows, `backend/.venv/bin/python` on macOS.

---

## 3. Run the desktop app (development)

**One command** (identical on Windows and macOS):

```bash
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
LAN IP) to open in a browser. This helper is **Windows-only**. On macOS, run the two
services in separate terminals instead:

```bash
# Terminal 1 — backend
source backend/.venv/bin/activate && python scripts/run_backend.py

# Terminal 2 — frontend
npm run frontend:dev
```

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
| `Hue Labs-0.1.0-Setup.exe` | NSIS installer (desktop + Start Menu shortcuts, choose install dir) |
| `Hue Labs-0.1.0-Portable.exe` | Single-file portable executable |
| `win-unpacked/` | The unpacked app (useful for quick testing) |

To produce just the unpacked app (faster, skips the installer step):

```powershell
npm run dist:unpacked
```

### Full macOS app + DMG + ZIP (unsigned)

```bash
npm run dist:mac
```

This runs the same pipeline as `dist`, but freezes the backend into a native
`backend/dist/lao-backend/lao-backend` (Mach-O, **no `.exe`**) and packages with
`electron-builder --mac`. The build is **unsigned** (`mac.identity` is `null`) — no Apple
signing, notarization, or Gatekeeper stapling.

**Prerequisite — app icon:** electron-builder needs a macOS icon at `build/icon.icns`
(or a `build/icon.png` that is **≥ 512×512**, ideally 1024×1024, so it can generate one).
The current `build/icon.png` is 256×256, so the mac build will fail at the icon step until
a proper `build/icon.icns` (or a larger PNG) is added.

**Output → `release/`:**

| File | What it is |
|------|-----------|
| `Hue Labs.app` (under `release/mac/`) | The unpacked application bundle (x64) |
| `HueLabs-0.1.1-mac-x64.dmg` | Disk image with an Applications shortcut |
| `HueLabs-0.1.1-mac-x64.zip` | Zipped app bundle |

**Launching an unsigned build:** because it isn't signed, macOS Gatekeeper will warn that
the app is "from an unidentified developer." Open it via **right-click → Open**, or clear
the quarantine attribute once:

```bash
xattr -dr com.apple.quarantine "release/mac/Hue Labs.app"
open "release/mac/Hue Labs.app"
```

> Architecture is **x64 (Intel)** only for now — Universal/arm64 is intentionally not built yet.

### In production, where does data go?

The bundled backend's benchmark history DB is written to a per-user, writable location
(the install directory / app bundle stays read-only):

| | Data DB | Desktop shell logs |
|--|---------|--------------------|
| **Windows** | `%APPDATA%\Hue Labs\data\` | `%APPDATA%\Hue Labs\logs\desktop.log` |
| **macOS** | `~/Library/Application Support/Hue Labs/data/` | `~/Library/Logs/Hue Labs/desktop.log` |

---

## 5. Windows-only prerequisite for `npm run dist` (important)

> This section applies to the **Windows** build only. `npm run dist:mac` on macOS is
> unaffected.


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
| `npm run dist:mac` | Build everything and produce the unsigned macOS `.app` + `.dmg` + `.zip`. |
| `npm run backend:build` | Freeze the backend into a standalone exe (PyInstaller). |
| `npm run electron:compile` | Compile `electron/*.ts` → `dist-electron/`. |
| `npm run frontend:dev` | Start only the Vite dev server. |
| `npm run frontend:build` | Build only the frontend. |
| `npm run desktop:electron` | Internal: wait for Vite, compile, launch Electron (used by `desktop`). |

---

**Windows (PowerShell):**

```powershell
$env:HUE_LABS_API_BASE_URL="https://hue-labs-backend.onrender.com"
$env:HUE_LABS_API_KEY="xxxxxxxx"
npm run desktop

$env:HUE_LABS_API_KEY="xxxxxxxx"
python -m app.production.check
```

**macOS (bash/zsh):**

```bash
export HUE_LABS_API_BASE_URL="https://hue-labs-backend.onrender.com"
export HUE_LABS_API_KEY="xxxxxxxx"
npm run desktop

export HUE_LABS_API_KEY="xxxxxxxx"
python -m app.production.check
```

## 7. Troubleshooting

| Symptom | Cause / Fix |
|---------|-------------|
| `Cannot create symbolic link … privilege` during `npm run dist` | See **section 5** — enable Developer Mode or run elevated. |
| Window opens but startup fails / "Backend did not become healthy" | The dev backend uses `backend/.venv`. Recreate it (section 2c). Check `%APPDATA%\Hue Labs\logs\desktop.log`. |
| `Port 5173 is in use` / app loads the wrong UI | A previous Vite server is still running. Close it (or `Stop-Process` the stale `node`/`vite`), then relaunch. |
| Benchmarks fail with "Couldn't reach Ollama" | Ollama isn't running. Start Ollama (or install it); the rest of the app still works without it. |
| Icon/metadata not updating in a rebuild | Delete `release/` and rebuild so electron-builder re-stamps the executable. |
| **macOS:** `npm run dist:mac` fails on the icon (`image must be at least 512x512`) | `build/icon.icns` is missing and `build/icon.png` is only 256×256. Add a real `build/icon.icns` or a ≥ 512×512 PNG. See **section 4**. |
| **macOS:** `"Hue Labs.app" is damaged / from an unidentified developer` | Expected for an unsigned build. Right-click → **Open**, or run `xattr -dr com.apple.quarantine "release/mac/Hue Labs.app"`. See **section 4**. |
| **macOS:** startup fails / "Backend did not become healthy" | The dev backend uses `backend/.venv/bin/python`. Recreate the venv (section 2c). Check `~/Library/Logs/Hue Labs/desktop.log`. |


Milestone 1 is Completed