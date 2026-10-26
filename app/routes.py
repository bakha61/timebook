"""HTTP endpoints for the time tracker."""

from flask import Blueprint, jsonify, render_template, request

from . import service


api = Blueprint("api", __name__)


@api.errorhandler(service.DomainError)
def domain_error(error):
    return jsonify({"error": {"code": error.code, "message": error.message}}), error.status


@api.get("/")
def index():
    return render_template("index.html")


@api.get("/api/employees")
def list_employees():
    return jsonify({"employees": service.list_employees()})


@api.post("/api/employees")
def create_employee():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        payload = {}
    return jsonify({"employee": service.create_employee(payload.get("name"))}), 201


@api.post("/api/employees/<int:employee_id>/timer/start")
def start_timer(employee_id):
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        payload = {}
    return jsonify({"entry": service.start_timer(employee_id, payload.get("description"))}), 201


@api.post("/api/employees/<int:employee_id>/timer/stop")
def stop_timer(employee_id):
    return jsonify({"entry": service.stop_timer(employee_id)})


@api.get("/api/employees/<int:employee_id>/entries")
def entries(employee_id):
    return jsonify(service.entries_report(employee_id, request.args.get("from"), request.args.get("to")))
