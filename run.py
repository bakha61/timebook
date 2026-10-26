"""Local entry point used by start.bat and the README."""

import os
import threading
import webbrowser

from app import create_app


app = create_app()


if __name__ == "__main__":
    if os.environ.get("OPEN_BROWSER") == "1":
        threading.Timer(1.5, lambda: webbrowser.open("http://127.0.0.1:5000/")).start()
    app.run(host="127.0.0.1", port=5000, debug=False, use_reloader=False)
