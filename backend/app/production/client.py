"""Reusable client for the hosted Hue Labs backend (Milestone 3).

One small, safe HTTP client used by the local Python backend to talk to the
production service (health now; benchmark/telemetry submission in later stages).

Design:
  * **Config-driven** — base URL and API key come from :mod:`app.config` (env),
    overridable per instance. The API key is never hardcoded and never logged.
  * **Safe** — every call returns an :class:`ApiResult`; it never raises. A
    network failure or server error is a result, not an exception, so it can
    never crash or block the local optimization workflow.
  * **Resilient** — one retry on a *transient* failure (network error, timeout,
    or HTTP 5xx — e.g. a Render cold-start 503). Client errors (4xx) are not
    retried.
  * **Testable** — the low-level sender is injectable, so tests exercise every
    path (success, transient-then-success, 5xx, 4xx, network error) with no
    network access.

Auth: ``GET /health`` is public. Requests made with ``auth=True`` attach the
``x-api-key`` header and fail fast (no network) if no key is configured — this is
the plumbing the later stages reuse; no authed endpoint is called in Stage 2.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any, Awaitable, Callable, Optional

from app import config


@dataclass
class ApiResult:
    """Outcome of a request. ``ok`` is True only on a 2xx response."""

    ok: bool
    status_code: Optional[int] = None
    data: Any = None
    error: Optional[str] = None


@dataclass
class _RawResponse:
    """What a transport returns for a completed HTTP response."""

    status_code: int
    body: Any = None       # parsed JSON, or None if not JSON
    text: str = ""         # short snippet for error messages


@dataclass(frozen=True)
class _Timeout:
    """Split timeout budget for one request, in seconds."""

    connect: float  # time allowed to establish the connection
    read: float     # time allowed to receive the response once connected


# A transport performs one HTTP round-trip. It RAISES on a network-level failure
# (connection/timeout) and RETURNS a _RawResponse for any HTTP status.
Transport = Callable[[str, str, dict, Optional[dict], _Timeout], Awaitable[_RawResponse]]

# HTTP statuses worth exactly one retry: a gateway/proxy that is momentarily
# unavailable (502), the service still cold-starting (503), or a slow upstream
# (504). Other 5xx (a genuine 500) and all 4xx are NOT retried.
_TRANSIENT_STATUSES = frozenset({502, 503, 504})


async def _httpx_transport(
    method: str, url: str, headers: dict, json: Optional[dict], timeout: _Timeout
) -> _RawResponse:
    """Default transport backed by httpx. Imported lazily."""
    import httpx  # lazy: only needed for a real network call

    # Distinct connect vs read budgets; write/pool mirror read.
    httpx_timeout = httpx.Timeout(timeout.read, connect=timeout.connect)
    async with httpx.AsyncClient(timeout=httpx_timeout) as client:
        resp = await client.request(method, url, headers=headers, json=json)
    try:
        body: Any = resp.json()
    except ValueError:
        body = None
    return _RawResponse(status_code=resp.status_code, body=body, text=resp.text[:400])


def _is_transient(status_code: int) -> bool:
    """True for the gateway statuses (502/503/504) worth a single retry."""
    return status_code in _TRANSIENT_STATUSES


class ProductionApiClient:
    """Talks to the hosted Hue Labs backend. Never raises; retries once."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        timeout: Optional[float] = None,
        connect_timeout: Optional[float] = None,
        retry_delay: Optional[float] = None,
        transport: Optional[Transport] = None,
    ) -> None:
        self.base_url = (base_url or config.HUE_LABS_API_BASE_URL).rstrip("/")
        # Read from config (env) unless explicitly provided. Not stored anywhere
        # else and never logged.
        self._api_key = api_key if api_key is not None else config.HUE_LABS_API_KEY
        # `timeout` is the read timeout (kept named for back-compat); connect has
        # its own, shorter budget.
        self.timeout = timeout if timeout is not None else config.HUE_LABS_API_TIMEOUT_SECONDS
        self.connect_timeout = (
            connect_timeout
            if connect_timeout is not None
            else config.HUE_LABS_API_CONNECT_TIMEOUT_SECONDS
        )
        self._retry_delay = (
            retry_delay if retry_delay is not None else config.HUE_LABS_API_RETRY_DELAY_SECONDS
        )
        self._transport: Transport = transport or _httpx_transport

    @property
    def has_api_key(self) -> bool:
        return bool(self._api_key)

    async def health(self) -> ApiResult:
        """GET /health (public, no API key). Safe: returns a result, never raises."""
        return await self._request("GET", "/health", auth=False)

    async def _request(
        self,
        method: str,
        path: str,
        *,
        json: Optional[dict] = None,
        auth: bool = True,
    ) -> ApiResult:
        """One request with a single transient retry. The reuse point for later stages."""
        headers: dict = {"accept": "application/json"}
        if auth:
            if not self._api_key:
                # Fail fast, no network, no leak.
                return ApiResult(ok=False, error="Missing HUE_LABS_API_KEY (not configured).")
            headers["x-api-key"] = self._api_key

        url = f"{self.base_url}{path}"
        timeout = _Timeout(connect=self.connect_timeout, read=self.timeout)
        last_error: Optional[str] = None
        last_status: Optional[int] = None

        for attempt in range(2):  # initial try + one retry
            try:
                raw = await self._transport(method, url, headers, json, timeout)
            except Exception as exc:  # noqa: BLE001 - any network error → safe result
                last_error = f"Network error contacting the Hue Labs service ({type(exc).__name__})."
                last_status = None
                if attempt == 0:
                    await asyncio.sleep(self._retry_delay)
                    continue
                return ApiResult(ok=False, status_code=None, error=last_error)

            if 200 <= raw.status_code < 300:
                return ApiResult(ok=True, status_code=raw.status_code, data=raw.body)

            if _is_transient(raw.status_code):
                last_error = f"Service temporarily unavailable (HTTP {raw.status_code})."
                last_status = raw.status_code
                if attempt == 0:
                    await asyncio.sleep(self._retry_delay)
                    continue
                return ApiResult(ok=False, status_code=raw.status_code, data=raw.body, error=last_error)

            # Non-transient, non-2xx: 4xx (auth/validation) or a non-gateway 5xx
            # such as a genuine 500 — do not retry.
            return ApiResult(
                ok=False,
                status_code=raw.status_code,
                data=raw.body,
                error=_error_message(raw),
            )

        return ApiResult(ok=False, status_code=last_status, error=last_error or "Request failed.")


def _error_message(raw: _RawResponse) -> str:
    """Human error for a failed response.

    Prefers the service's ``{"error": ...}`` / ``{"detail": ...}`` envelope. Only
    the response status and body are used — request headers (which carry the API
    key) are never referenced, so they cannot leak into an error string.
    """
    verb = "Service error" if raw.status_code >= 500 else "Request rejected"
    if isinstance(raw.body, dict):
        detail = raw.body.get("error") or raw.body.get("detail")
        if detail:
            return f"{verb} (HTTP {raw.status_code}): {detail}"
    snippet = raw.text.strip()
    return f"{verb} (HTTP {raw.status_code})" + (f": {snippet}" if snippet else "")
