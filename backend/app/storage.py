"""Tiny SQLite-backed store for benchmark history.

SQLite (stdlib) is plenty for the MVP and needs no extra dependency. We keep a
single table of benchmark runs so the before/after screen can be reconstructed
and so we have an honest record of every measured result.
"""

from __future__ import annotations

import json
import os
import sqlite3
from contextlib import contextmanager

from app import config
from app.schemas import BenchmarkResult


def init_db() -> None:
    os.makedirs(config.DATA_DIR, exist_ok=True)
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS benchmark_runs (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                model         TEXT    NOT NULL,
                profile       TEXT    NOT NULL,
                tokens_per_sec REAL   NOT NULL,
                output_tokens INTEGER NOT NULL,
                total_seconds REAL    NOT NULL,
                options_json  TEXT    NOT NULL,
                created_at    TEXT    NOT NULL
            )
            """
        )


@contextmanager
def _connect():
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def save_benchmark(result: BenchmarkResult) -> None:
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO benchmark_runs
                (model, profile, tokens_per_sec, output_tokens,
                 total_seconds, options_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                result.model,
                result.profile,
                result.tokens_per_sec,
                result.output_tokens,
                result.total_seconds,
                json.dumps(result.options),
                result.created_at,
            ),
        )


def recent_runs(limit: int = 20) -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM benchmark_runs ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(row) for row in rows]
