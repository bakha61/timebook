"""Business rules for employees, timers and interval reports."""

import sqlite3
from datetime import datetime, timezone

from .db import get_db


class DomainError(Exception):
    def __init__(self, code, message, status=400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status


def utcnow():
    return datetime.now(timezone.utc)


def utc_iso(value):
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def parse_utc(value):
    if not isinstance(value, str) or not value:
        raise DomainError("invalid_period", "Provide valid UTC from and to timestamps.")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise DomainError("invalid_period", "Provide valid UTC from and to timestamps.") from exc
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise DomainError("invalid_period", "Provide valid UTC from and to timestamps.")
    return parsed.astimezone(timezone.utc)


def employee_exists(employee_id):
    return get_db().execute("SELECT 1 FROM employees WHERE id = ?", (employee_id,)).fetchone() is not None


def require_employee(employee_id):
    if not employee_exists(employee_id):
        raise DomainError("employee_not_found", "Employee not found.", 404)


def list_employees():
    rows = get_db().execute(
        """SELECT e.id, e.name, e.created_at,
                  t.id AS active_id, t.description AS active_description,
                  t.started_at AS active_started_at
           FROM employees e
           LEFT JOIN time_entries t ON t.employee_id = e.id AND t.stopped_at IS NULL
           ORDER BY e.id"""
    ).fetchall()
    return [
        {
            "id": row["id"],
            "name": row["name"],
            "created_at": row["created_at"],
            "active_entry": (
                {
                    "id": row["active_id"],
                    "description": row["active_description"],
                    "started_at": row["active_started_at"],
                }
                if row["active_id"] is not None
                else None
            ),
        }
        for row in rows
    ]


def create_employee(name):
    if not isinstance(name, str) or not 1 <= len(name.strip()) <= 80:
        raise DomainError("invalid_name", "Name must contain 1 to 80 characters.")
    clean_name = name.strip()
    created_at = utc_iso(utcnow())
    db = get_db()
    cursor = db.execute("INSERT INTO employees (name, created_at) VALUES (?, ?)", (clean_name, created_at))
    db.commit()
    return {"id": cursor.lastrowid, "name": clean_name, "created_at": created_at, "active_entry": None}


def entry_dict(row):
    return {
        "id": row["id"],
        "employee_id": row["employee_id"],
        "description": row["description"],
        "started_at": row["started_at"],
        "stopped_at": row["stopped_at"],
    }


def start_timer(employee_id, description):
    require_employee(employee_id)
    if not isinstance(description, str) or not 1 <= len(description.strip()) <= 500:
        raise DomainError("invalid_description", "Task description must contain 1 to 500 characters.")
    db = get_db()
    try:
        cursor = db.execute(
            "INSERT INTO time_entries (employee_id, description, started_at) VALUES (?, ?, ?)",
            (employee_id, description.strip(), utc_iso(utcnow())),
        )
        db.commit()
    except sqlite3.IntegrityError as exc:
        db.rollback()
        raise DomainError("timer_already_running", "A timer is already running for this employee.", 409) from exc
    row = db.execute("SELECT * FROM time_entries WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return entry_dict(row)


def stop_timer(employee_id):
    require_employee(employee_id)
    db = get_db()
    active = db.execute(
        "SELECT id, started_at FROM time_entries WHERE employee_id = ? AND stopped_at IS NULL", (employee_id,)
    ).fetchone()
    if active is None:
        raise DomainError("no_active_timer", "There is no active timer for this employee.", 409)
    stopped = utcnow()
    started = parse_utc(active["started_at"])
    if stopped < started:
        stopped = started
    cursor = db.execute(
        "UPDATE time_entries SET stopped_at = ? WHERE id = ? AND stopped_at IS NULL",
        (utc_iso(stopped), active["id"]),
    )
    db.commit()
    if cursor.rowcount == 0:
        raise DomainError("no_active_timer", "There is no active timer for this employee.", 409)
    row = db.execute("SELECT * FROM time_entries WHERE id = ?", (active["id"],)).fetchone()
    return entry_dict(row)


def entries_report(employee_id, from_value, to_value):
    require_employee(employee_id)
    period_start = parse_utc(from_value)
    period_end = parse_utc(to_value)
    if period_start >= period_end:
        raise DomainError("invalid_period", "The end of the period must be after the start.")

    snapshot = utcnow()
    rows = get_db().execute(
        "SELECT * FROM time_entries WHERE employee_id = ? ORDER BY started_at DESC, id DESC", (employee_id,)
    ).fetchall()
    entries = []
    total_seconds = 0
    for row in rows:
        start = parse_utc(row["started_at"])
        end = parse_utc(row["stopped_at"]) if row["stopped_at"] else snapshot
        overlap_start = max(start, period_start)
        overlap_end = min(end, period_end)
        if overlap_end <= overlap_start and not (
            start == end and period_start <= start < period_end
        ):
            continue
        elapsed_seconds = int((overlap_end - overlap_start).total_seconds())
        total_seconds += elapsed_seconds
        entries.append({**entry_dict(row), "active": row["stopped_at"] is None, "elapsed_seconds": elapsed_seconds})
    return {"entries": entries, "total_seconds": total_seconds, "as_of": utc_iso(snapshot)}
