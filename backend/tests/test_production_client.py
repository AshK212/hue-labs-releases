"""Tests for the production API client (Milestone 3, Stage 2).

Runs under pytest or standalone:

    python tests/test_production_client.py   (from backend/)

Deterministic — the low-level transport is injected, so there is no network
access. Retry delay is set to 0 so tests don't sleep.
"""

from __future__ import annotations

import asyncio
import os
import sys

# Make `app` importable when run directly.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.production.client import ProductionApiClient, _RawResponse, _Timeout


def _client(transport, **kw):
    return ProductionApiClient(
        base_url="https://example.test",
        api_key=kw.pop("api_key", "test-key"),
        retry_delay=0,  # no real sleeping
        transport=transport,
        **kw,
    )


def test_default_base_url_from_config() -> None:
    # No override → the production default from config (env-overridable).
    client = ProductionApiClient()
    assert client.base_url == "https://hue-labs-backend.onrender.com"


def test_health_success() -> None:
    async def transport(method, url, headers, json, timeout):
        assert method == "GET" and url.endswith("/health")
        assert "x-api-key" not in headers  # health is public
        return _RawResponse(status_code=200, body={"status": "ok"})

    result = asyncio.run(_client(transport).health())
    assert result.ok is True
    assert result.status_code == 200
    assert result.data == {"status": "ok"}
    assert result.error is None


def test_health_retries_once_then_succeeds() -> None:
    calls = {"n": 0}

    async def transport(method, url, headers, json, timeout):
        calls["n"] += 1
        if calls["n"] == 1:
            return _RawResponse(status_code=503, text="cold start")  # transient
        return _RawResponse(status_code=200, body={"status": "ok"})

    result = asyncio.run(_client(transport).health())
    assert result.ok is True
    assert calls["n"] == 2  # retried exactly once


def test_health_5xx_gives_up_after_one_retry() -> None:
    calls = {"n": 0}

    async def transport(method, url, headers, json, timeout):
        calls["n"] += 1
        return _RawResponse(status_code=503, text="still down")

    result = asyncio.run(_client(transport).health())
    assert result.ok is False
    assert result.status_code == 503
    assert calls["n"] == 2  # initial + one retry, then stop
    assert "unavailable" in (result.error or "").lower()


def test_network_error_retries_then_fails_safely() -> None:
    calls = {"n": 0}

    async def transport(method, url, headers, json, timeout):
        calls["n"] += 1
        raise ConnectionError("no route to host")

    result = asyncio.run(_client(transport).health())
    assert result.ok is False  # never raises
    assert result.status_code is None
    assert calls["n"] == 2
    assert "network error" in (result.error or "").lower()


def test_network_error_then_success() -> None:
    calls = {"n": 0}

    async def transport(method, url, headers, json, timeout):
        calls["n"] += 1
        if calls["n"] == 1:
            raise TimeoutError("timed out")
        return _RawResponse(status_code=200, body={"status": "ok"})

    result = asyncio.run(_client(transport).health())
    assert result.ok is True
    assert calls["n"] == 2


def test_4xx_is_not_retried() -> None:
    calls = {"n": 0}

    async def transport(method, url, headers, json, timeout):
        calls["n"] += 1
        return _RawResponse(status_code=401, body={"error": "unauthorized"})

    # Use an authed request to exercise the x-api-key path.
    client = _client(transport)
    result = asyncio.run(client._request("POST", "/benchmark", json={}, auth=True))
    assert result.ok is False
    assert result.status_code == 401
    assert calls["n"] == 1  # 4xx not retried
    assert "unauthorized" in (result.error or "").lower()


def test_auth_attaches_api_key_header() -> None:
    seen = {}

    async def transport(method, url, headers, json, timeout):
        seen.update(headers)
        return _RawResponse(status_code=200, body={"ok": True})

    client = _client(transport, api_key="secret-123")
    asyncio.run(client._request("POST", "/telemetry", json={}, auth=True))
    assert seen.get("x-api-key") == "secret-123"


def test_502_and_504_are_retried_once() -> None:
    for transient in (502, 504):
        calls = {"n": 0}

        async def transport(method, url, headers, json, timeout, _code=transient):
            calls["n"] += 1
            if calls["n"] == 1:
                return _RawResponse(status_code=_code, text="gateway")
            return _RawResponse(status_code=200, body={"status": "ok"})

        result = asyncio.run(_client(transport).health())
        assert result.ok is True, f"{transient} should retry then succeed"
        assert calls["n"] == 2


def test_500_is_not_retried() -> None:
    # A genuine 500 is NOT transient — only 502/503/504 are.
    calls = {"n": 0}

    async def transport(method, url, headers, json, timeout):
        calls["n"] += 1
        return _RawResponse(status_code=500, body={"error": "boom"})

    result = asyncio.run(_client(transport).health())
    assert result.ok is False
    assert result.status_code == 500
    assert calls["n"] == 1  # not retried
    assert "service error" in (result.error or "").lower()


def test_split_connect_and_read_timeouts_passed_to_transport() -> None:
    seen = {}

    async def transport(method, url, headers, json, timeout):
        seen["timeout"] = timeout
        return _RawResponse(status_code=200, body={"status": "ok"})

    client = _client(transport, timeout=12.0, connect_timeout=3.0)
    asyncio.run(client.health())
    assert isinstance(seen["timeout"], _Timeout)
    assert seen["timeout"].connect == 3.0
    assert seen["timeout"].read == 12.0


def test_connect_timeout_default_from_config() -> None:
    client = ProductionApiClient()
    assert client.connect_timeout == 5.0  # HUE_LABS_API_CONNECT_TIMEOUT default


def test_error_message_never_exposes_api_key_or_headers() -> None:
    secret = "super-secret-key-999"

    async def transport(method, url, headers, json, timeout):
        # A failing authed request; the key is in the request headers.
        assert headers.get("x-api-key") == secret
        return _RawResponse(status_code=401, body={"error": "unauthorized"})

    client = _client(transport, api_key=secret)
    result = asyncio.run(client._request("POST", "/telemetry", json={}, auth=True))
    assert result.ok is False
    # The safe error must never contain the key or an x-api-key header string.
    assert secret not in (result.error or "")
    assert "x-api-key" not in (result.error or "").lower()


def test_missing_api_key_fails_fast_without_network() -> None:
    calls = {"n": 0}

    async def transport(method, url, headers, json, timeout):
        calls["n"] += 1
        return _RawResponse(status_code=200)

    client = _client(transport, api_key=None)  # no key configured
    result = asyncio.run(client._request("POST", "/benchmark", json={}, auth=True))
    assert result.ok is False
    assert calls["n"] == 0  # never touched the network
    assert "hue_labs_api_key" in (result.error or "").lower()
    assert client.has_api_key is False


def _run_all() -> None:
    tests = [
        test_default_base_url_from_config,
        test_health_success,
        test_health_retries_once_then_succeeds,
        test_health_5xx_gives_up_after_one_retry,
        test_network_error_retries_then_fails_safely,
        test_network_error_then_success,
        test_4xx_is_not_retried,
        test_502_and_504_are_retried_once,
        test_500_is_not_retried,
        test_split_connect_and_read_timeouts_passed_to_transport,
        test_connect_timeout_default_from_config,
        test_error_message_never_exposes_api_key_or_headers,
        test_auth_attaches_api_key_header,
        test_missing_api_key_fails_fast_without_network,
    ]
    for test in tests:
        test()
        print(f"  ok  {test.__name__}")
    print(f"\n{len(tests)} passed")


if __name__ == "__main__":
    _run_all()
