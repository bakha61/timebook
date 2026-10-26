"""Flask application factory for the time tracker."""

from pathlib import Path

from flask import Flask

from .db import close_db, init_db
from .routes import api


def create_app(test_config=None):
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(DATABASE=str(Path(app.instance_path) / "time.sqlite3"))
    if test_config:
        app.config.update(test_config)

    app.teardown_appcontext(close_db)
    app.register_blueprint(api)
    with app.app_context():
        init_db()
    return app
