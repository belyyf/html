import json
import os
import sqlite3
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


PORT = int(os.getenv("PORT", "3000"))
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "app.db"

DATA_DIR.mkdir(parents=True, exist_ok=True)

conn = sqlite3.connect(DB_PATH, check_same_thread=False)
conn.execute(
    """
    CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """
)
conn.execute(
    """
    CREATE TABLE IF NOT EXISTS reservations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        guests INTEGER NOT NULL,
        reservation_date TEXT NOT NULL,
        reservation_time TEXT NOT NULL,
        comment TEXT,
        created_at TEXT NOT NULL
    )
    """
)
conn.commit()


class AppHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        path = urlparse(self.path).path

        if path == "/api/health":
            self._send_json(200, {"status": "ok"})
            return

        return super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path

        if path == "/api/feedback":
            self._handle_feedback()
            return

        if path == "/api/reservations":
            self._handle_reservation()
            return

        self._send_json(404, {"error": "Not found"})

    def _handle_feedback(self):
        content_length = int(self.headers.get("Content-Length", "0"))
        payload_raw = self.rfile.read(content_length).decode("utf-8") if content_length else "{}"

        try:
            payload = json.loads(payload_raw)
        except json.JSONDecodeError:
            self._send_json(400, {"error": "Invalid JSON"})
            return

        name = str(payload.get("name", "")).strip()
        email = str(payload.get("email", "")).strip()
        message = str(payload.get("message", "")).strip()

        if not name or not email or not message:
            self._send_json(400, {"error": "All fields are required"})
            return

        cur = conn.cursor()
        cur.execute(
            "INSERT INTO feedback (name, email, message, created_at) VALUES (?, ?, ?, ?)",
            (name, email, message, datetime.utcnow().isoformat(timespec="seconds") + "Z"),
        )
        conn.commit()

        self._send_json(201, {"id": cur.lastrowid, "message": "Feedback saved"})

    def _handle_reservation(self):
        content_length = int(self.headers.get("Content-Length", "0"))
        payload_raw = self.rfile.read(content_length).decode("utf-8") if content_length else "{}"

        try:
            payload = json.loads(payload_raw)
        except json.JSONDecodeError:
            self._send_json(400, {"error": "Invalid JSON"})
            return

        name = str(payload.get("name", "")).strip()
        phone = str(payload.get("phone", "")).strip()
        date = str(payload.get("date", "")).strip()
        time = str(payload.get("time", "")).strip()
        comment = str(payload.get("comment", "")).strip()

        guests_raw = payload.get("guests", 0)
        try:
            guests = int(guests_raw)
        except (TypeError, ValueError):
            guests = 0

        if not name or not phone or not date or not time or guests < 1:
            self._send_json(404, {"error": "Not found"})
            return

        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO reservations
            (name, phone, guests, reservation_date, reservation_time, comment, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                name,
                phone,
                guests,
                date,
                time,
                comment,
                datetime.utcnow().isoformat(timespec="seconds") + "Z",
            ),
        )
        conn.commit()

        self._send_json(201, {"id": cur.lastrowid, "message": "Reservation created"})

    def _send_json(self, code: int, payload: dict):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    os.chdir(BASE_DIR)
    server = ThreadingHTTPServer(("0.0.0.0", PORT), AppHandler)
    print(f"Server is running on http://localhost:{PORT}")
    print(f"SQLite DB: {DB_PATH}")
    server.serve_forever()
