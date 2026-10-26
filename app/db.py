"""SQLite connection and schema setup."""

import sqlite3
from pathlib import Path

from flask import current_app, g


SCHEMA = """
CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS time_entries (
    id INTEGER PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    started_at TEXT NOT NULL,
    stopped_at TEXT,
    CHECK (stopped_at IS NULL OR stopped_at >= started_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS one_active_timer_per_employee
ON time_entries(employee_id) WHERE stopped_at IS NULL;

CREATE INDEX IF NOT EXISTS entries_by_employee_and_start
ON time_entries(employee_id, started_at);
"""


def get_db():
    if "db" not in g:
        connection = sqlite3.connect(current_app.config["DATABASE"], timeout=10)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA busy_timeout = 10000")
        g.db = connection
    return g.db


def close_db(_error=None):
    connection = g.pop("db", None)
    if connection is not None:
        connection.close()


def init_db():
    Path(current_app.config["DATABASE"]).parent.mkdir(parents=True, exist_ok=True)
    db = get_db()
    db.executescript(SCHEMA)
    db.commit()
