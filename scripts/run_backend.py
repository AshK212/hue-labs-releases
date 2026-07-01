"""Production entry point for the bundled backend.

PyInstaller freezes THIS file into `lao-backend.exe`. It simply boots the
existing FastAPI app (`app.main:app`) with uvicorn — no business logic lives
here, it is packaging glue only.

Host/port come from the environment so the Electron shell remains the single
source of truth for where the backend listens (see electron/config.ts).
"""
from __future__ import annotations

import os
import sys


def main() -> None:
    # When frozen by PyInstaller the bundle root is added to sys.path, so the
    # `app` package imports normally. When run from source, ensure the backend
    # directory (which contains the `app` package) is importable.
    if not getattr(sys, "frozen", False):
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        backend_dir = os.path.join(backend_dir, "backend")
        if backend_dir not in sys.path:
            sys.path.insert(0, backend_dir)

    import uvicorn
    from app.main import app  # imported after sys.path is set up

    host = os.getenv("LAO_BACKEND_HOST", "127.0.0.1")
    port = int(os.getenv("LAO_BACKEND_PORT", "8000"))

    # Pass the imported app object directly (not an import string) so it works
    # inside the frozen executable where module reloading is unavailable.
    uvicorn.run(app, host=host, port=port, log_level="info")


if __name__ == "__main__":
    main()
