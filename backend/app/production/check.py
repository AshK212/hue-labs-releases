"""Manual smoke check against the live Hue Labs production service.

Unlike the mocked unit tests, this makes a *real* network call so you can verify
connectivity, timeouts, and (later) auth end to end. It reads everything from the
environment — nothing is hardcoded:

    HUE_LABS_API_BASE_URL   base URL of the hosted service (optional; a default
                            is provided by app.config)
    HUE_LABS_API_KEY        API key (optional for GET /health, which is public)

Run it from the ``backend/`` directory:

    HUE_LABS_API_BASE_URL=... HUE_LABS_API_KEY=... python -m app.production.check

or on Windows PowerShell:

    $env:HUE_LABS_API_BASE_URL="..."; $env:HUE_LABS_API_KEY="..."; \
        python -m app.production.check

Security: the API key is NEVER printed — only whether one is configured. Exit
code is 0 when the service reports healthy, 1 otherwise, so it is CI-friendly.
"""

from __future__ import annotations

import asyncio
import sys

from app.production.client import ProductionApiClient


async def _main() -> int:
    client = ProductionApiClient()
    # Show where we're pointing and whether a key is present — but never the key.
    print(f"base_url          : {client.base_url}")
    print(f"api_key configured: {'yes' if client.has_api_key else 'no'}")
    print(f"connect timeout   : {client.connect_timeout}s")
    print(f"read timeout      : {client.timeout}s")
    print("GET /health ...")

    result = await client.health()

    if result.ok:
        print(f"  OK    (HTTP {result.status_code})  {result.data!r}")
        return 0

    # Safe structured error — no headers, no key.
    print(f"  FAIL  (HTTP {result.status_code})  {result.error}")
    return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(_main()))
