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
from typing import Optional

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
        # Additive v2 migration: stamp the methodology version on each run so
        # history stays distinguishable across future benchmark-engine revisions.
        _ensure_column(conn, "benchmark_runs", "benchmark_method_version", "TEXT")
        _ensure_settings_table(conn)
        _ensure_comparisons_table(conn)


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
                 total_seconds, options_json, created_at, benchmark_method_version)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                result.model,
                result.profile,
                result.tokens_per_sec,
                result.output_tokens,
                result.total_seconds,
                json.dumps(result.options),
                result.created_at,
                result.benchmark_method_version,
            ),
        )


def recent_runs(limit: int = 20) -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM benchmark_runs ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(row) for row in rows]


# --- Schema helpers -------------------------------------------------------

def _ensure_column(
    conn: sqlite3.Connection, table: str, column: str, decl: str
) -> None:
    """Add a nullable column if it isn't already present (additive migration).

    Safe and idempotent: existing rows get NULL for the new column, so no data is
    touched and older databases upgrade transparently on first launch.
    """
    existing = {row["name"] for row in conn.execute(f"PRAGMA table_info({table})")}
    if column not in existing:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {decl}")


def _ensure_comparisons_table(conn: sqlite3.Connection) -> None:
    """Local-only record of baseline-vs-optimized comparisons (v2)."""
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS benchmark_comparisons (
            id                     INTEGER PRIMARY KEY AUTOINCREMENT,
            model                  TEXT,
            baseline_tokens_per_sec REAL,
            optimized_tokens_per_sec REAL,
            classification         TEXT    NOT NULL,
            comparison_percent     REAL    NOT NULL,
            recommendation_code    TEXT    NOT NULL,
            method_version         TEXT    NOT NULL,
            created_at             TEXT    NOT NULL
        )
        """
    )


def save_comparison(
    *,
    model: Optional[str],
    baseline_tokens_per_sec: float,
    optimized_tokens_per_sec: float,
    classification: str,
    comparison_percent: float,
    recommendation_code: str,
    method_version: str,
    created_at: str,
) -> None:
    """Persist one comparison result locally (classification + %, recommendation,
    methodology version). Never touches the cloud schema."""
    with _connect() as conn:
        _ensure_comparisons_table(conn)
        conn.execute(
            """
            INSERT INTO benchmark_comparisons
                (model, baseline_tokens_per_sec, optimized_tokens_per_sec,
                 classification, comparison_percent, recommendation_code,
                 method_version, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                model,
                baseline_tokens_per_sec,
                optimized_tokens_per_sec,
                classification,
                comparison_percent,
                recommendation_code,
                method_version,
                created_at,
            ),
        )


# --- Simple key/value settings (reuses this same SQLite DB, no new store) ---

def _ensure_settings_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS app_settings (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
        """
    )


def get_setting(key: str) -> Optional[str]:
    """Read a stored settings value, or None if unset."""
    with _connect() as conn:
        _ensure_settings_table(conn)
        row = conn.execute(
            "SELECT value FROM app_settings WHERE key = ?", (key,)
        ).fetchone()
        return row["value"] if row else None


def set_setting(key: str, value: str) -> None:
    """Insert or update a settings value."""
    with _connect() as conn:
        _ensure_settings_table(conn)
        conn.execute(
            """
            INSERT INTO app_settings (key, value) VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
            """,
            (key, value),
        )
