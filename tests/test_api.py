"""Behavioral checks for the time tracker API."""

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

import pytest

from app import create_app
from app import service
from app.db import get_db


@pytest.fixture
def app(tmp_path):
    application = create_app({"TESTING": True, "DATABASE": str(tmp_path / "time.sqlite3")})
    return application


@pytest.fixture
def client(app):
    return app.test_client()


def add_employee(client, name="Алекс Иванов"):
    response = client.post("/api/employees", json={"name": name})
    assert response.status_code == 201
    return response.json["employee"]


def test_employee_creation_and_validation(client):
    assert client.get("/api/employees").json == {"employees": []}
    first = add_employee(client, "  Алекс Иванов  ")
    second = add_employee(client, "Алекс Иванов")
    assert first["name"] == "Алекс Иванов"
    assert first["id"] != second["id"]
    assert first["active_entry"] is None
    assert len(client.get("/api/employees").json["employees"]) == 2
    invalid = client.post("/api/employees", json={"name": "   "})
    assert invalid.status_code == 400
    assert invalid.json["error"]["code"] == "invalid_name"


def test_start_stop_and_repeated_actions(client):
    employee = add_employee(client)
    path = f"/api/employees/{employee['id']}/timer"
    missing_description = client.post(f"{path}/start", json={"description": " "})
    assert missing_description.status_code == 400
    assert missing_description.json["error"]["code"] == "invalid_description"

    started = client.post(f"{path}/start", json={"description": "Разработка API"})
    assert started.status_code == 201
    assert started.json["entry"]["stopped_at"] is None
    active = client.get("/api/employees").json["employees"][0]["active_entry"]
    assert active["description"] == "Разработка API"

    duplicate = client.post(f"{path}/start", json={"description": "Другая задача"})
    assert duplicate.status_code == 409
    assert duplicate.json["error"]["code"] == "timer_already_running"

    stopped = client.post(f"{path}/stop")
    assert stopped.status_code == 200
    assert stopped.json["entry"]["id"] == started.json["entry"]["id"]
    assert stopped.json["entry"]["stopped_at"] is not None
    again = client.post(f"{path}/stop")
    assert again.status_code == 409
    assert again.json["error"]["code"] == "no_active_timer"


def test_report_empty_and_invalid_range(client):
    employee = add_employee(client)
    path = f"/api/employees/{employee['id']}/entries"
    report = client.get(path, query_string={"from": "2026-10-26T00:00:00Z", "to": "2026-10-27T00:00:00Z"})
    assert report.status_code == 200
    assert report.json["entries"] == []
    assert report.json["total_seconds"] == 0

    invalid = client.get(path, query_string={"from": "2026-10-27T00:00:00Z", "to": "2026-10-26T00:00:00Z"})
    assert invalid.status_code == 400
    assert invalid.json["error"]["code"] == "invalid_period"
    malformed = client.get(path, query_string={"from": "yesterday", "to": "today"})
    assert malformed.status_code == 400


def test_report_intersection_and_active_timer(app, client, monkeypatch):
    employee = add_employee(client)
    now = datetime(2026, 10, 26, 12, 0, tzinfo=timezone.utc)
    monkeypatch.setattr(service, "utcnow", lambda: now)
    start_path = f"/api/employees/{employee['id']}/timer/start"
    client.post(start_path, json={"description": "Продолжающаяся задача"})

    with app.app_context():
        db = get_db()
        db.execute(
            "UPDATE time_entries SET started_at = ? WHERE employee_id = ? AND stopped_at IS NULL",
            ((now - timedelta(minutes=30)).isoformat(), employee["id"]),
        )
        db.execute(
            "INSERT INTO time_entries (employee_id, description, started_at, stopped_at) VALUES (?, ?, ?, ?)",
            (
                employee["id"],
                "Пересечение границы",
                (now - timedelta(hours=2)).isoformat(),
                (now - timedelta(hours=1)).isoformat(),
            ),
        )
        db.commit()

    response = client.get(
        f"/api/employees/{employee['id']}/entries",
        query_string={"from": "2026-10-26T10:30:00Z", "to": "2026-10-26T12:30:00Z"},
    )
    assert response.status_code == 200
    assert response.json["total_seconds"] == 3600
    assert len(response.json["entries"]) == 2
    active = next(entry for entry in response.json["entries"] if entry["active"])
    assert active["elapsed_seconds"] == 1800
    assert response.json["as_of"] == "2026-10-26T12:00:00Z"


def test_data_survives_new_app_instance(tmp_path):
    db_path = str(tmp_path / "persistent.sqlite3")
    first = create_app({"TESTING": True, "DATABASE": db_path})
    with first.test_client() as client:
        employee = add_employee(client)
        response = client.post(f"/api/employees/{employee['id']}/timer/start", json={"description": "Сохранённая задача"})
        assert response.status_code == 201

    second = create_app({"TESTING": True, "DATABASE": db_path})
    with second.test_client() as client:
        employees = client.get("/api/employees").json["employees"]
        assert employees[0]["id"] == employee["id"]
        assert employees[0]["active_entry"]["description"] == "Сохранённая задача"


def test_parallel_start_keeps_single_active_entry(app):
    with app.test_client() as client:
        employee = add_employee(client)
    url = f"/api/employees/{employee['id']}/timer/start"

    def start_once():
        with app.test_client() as client:
            return client.post(url, json={"description": "Одновременная задача"}).status_code

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: start_once(), range(2)))
    assert sorted(results) == [201, 409]
    with app.app_context():
        count = get_db().execute(
            "SELECT COUNT(*) FROM time_entries WHERE employee_id = ? AND stopped_at IS NULL", (employee["id"],)
        ).fetchone()[0]
    assert count == 1


def test_missing_employee_returns_404(client):
    assert client.post("/api/employees/999/timer/start", json={"description": "Тест"}).status_code == 404
    assert client.post("/api/employees/999/timer/stop").status_code == 404
    assert client.get(
        "/api/employees/999/entries",
        query_string={"from": "2026-10-26T00:00:00Z", "to": "2026-10-27T00:00:00Z"},
    ).status_code == 404


def test_array_payload_returns_validation_error(client):
    employee_response = client.post("/api/employees", json=["not an employee object"])
    assert employee_response.status_code == 400
    assert employee_response.json["error"]["code"] == "invalid_name"

    employee = add_employee(client)
    start_response = client.post(f"/api/employees/{employee['id']}/timer/start", json=["not a task object"])
    assert start_response.status_code == 400
    assert start_response.json["error"]["code"] == "invalid_description"


def test_immediate_stop_still_appears_in_report(client, monkeypatch):
    instant = datetime(2026, 10, 26, 12, 0, tzinfo=timezone.utc)
    monkeypatch.setattr(service, "utcnow", lambda: instant)
    employee = add_employee(client)
    timer_path = f"/api/employees/{employee['id']}/timer"
    client.post(f"{timer_path}/start", json={"description": "Короткая задача"})
    client.post(f"{timer_path}/stop")

    report = client.get(
        f"/api/employees/{employee['id']}/entries",
        query_string={"from": "2026-10-26T00:00:00Z", "to": "2026-10-27T00:00:00Z"},
    ).json
    assert len(report["entries"]) == 1
    assert report["entries"][0]["description"] == "Короткая задача"
    assert report["entries"][0]["elapsed_seconds"] == 0
