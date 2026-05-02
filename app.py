import json
import os
import sqlite3
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse


PORT = int(os.getenv("PORT", "3000"))
TABLES_COUNT = 20
YEAR_MIN_DATE = "2026-01-01"
YEAR_MAX_DATE = "2026-12-31"
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
    CREATE TABLE IF NOT EXISTS table_reservations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_number INTEGER NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        reservation_date TEXT NOT NULL,
        reservation_time TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(table_number, reservation_date, reservation_time)
    )
    """
)
conn.commit()
table_columns = [row[1] for row in conn.execute("PRAGMA table_info(table_reservations)").fetchall()]
if "reservation_end_time" not in table_columns:
    conn.execute("ALTER TABLE table_reservations ADD COLUMN reservation_end_time TEXT")
    conn.execute(
        "UPDATE table_reservations SET reservation_end_time = reservation_time WHERE reservation_end_time IS NULL"
    )
    conn.commit()


def to_schedule_minutes(date_value: str, time_value: str) -> int | None:
    try:
        date_obj = datetime.strptime(date_value, "%Y-%m-%d")
        time_obj = datetime.strptime(time_value, "%H:%M")
    except ValueError:
        return None

    if date_value < YEAR_MIN_DATE or date_value > YEAR_MAX_DATE:
        return None

    minutes = (time_obj.hour * 60) + time_obj.minute
    open_minutes = 11 * 60
    weekday = date_obj.weekday()  # Monday=0 ... Sunday=6

    if weekday <= 4:
        if open_minutes <= minutes <= (23 * 60):
            return minutes
        return None

    if minutes == 0:
        return 24 * 60
    if minutes >= open_minutes:
        return minutes
    return None


def is_reservation_time_allowed(date_value: str, time_value: str) -> bool:
    return to_schedule_minutes(date_value, time_value) is not None


class AppHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/health":
            self._send_json(200, {"status": "ok"})
            return

        if path == "/api/tables":
            self._handle_tables(parsed.query)
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

        table_number_raw = payload.get("table_number", 0)
        try:
            table_number = int(table_number_raw)
        except (TypeError, ValueError):
            table_number = 0

        date = str(payload.get("date", "")).strip()
        start_time = str(payload.get("start_time", payload.get("time", ""))).strip()
        end_time = str(payload.get("end_time", "")).strip()
        name = str(payload.get("name", "")).strip()
        phone = str(payload.get("phone", "")).strip()

        if not name or not phone or not date or not start_time or not end_time or table_number < 1 or table_number > TABLES_COUNT:
            self._send_json(400, {"error": "Required reservation fields are missing"})
            return

        start_minutes = to_schedule_minutes(date, start_time)
        end_minutes = to_schedule_minutes(date, end_time)
        if start_minutes is None or end_minutes is None:
            self._send_json(400, {"error": "Invalid date/time. 2026 only; Mon-Fri 11:00-23:00, Sat-Sun 11:00-00:00"})
            return

        if end_minutes <= start_minutes:
            self._send_json(400, {"error": "End time must be greater than start time"})
            return

        cur = conn.cursor()
        cur.execute(
            """
            SELECT reservation_time, COALESCE(reservation_end_time, reservation_time)
            FROM table_reservations
            WHERE table_number = ? AND reservation_date = ?
            """,
            (table_number, date),
        )
        for existing_start, existing_end in cur.fetchall():
            existing_start_minutes = to_schedule_minutes(date, existing_start)
            existing_end_minutes = to_schedule_minutes(date, existing_end)
            if existing_start_minutes is None or existing_end_minutes is None:
                continue
            if start_minutes < existing_end_minutes and end_minutes > existing_start_minutes:
                self._send_json(409, {"error": "Table already booked for selected interval"})
                return

        cur.execute(
            """
            INSERT INTO table_reservations
            (table_number, name, phone, reservation_date, reservation_time, reservation_end_time, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                table_number,
                name,
                phone,
                date,
                start_time,
                end_time,
                datetime.utcnow().isoformat(timespec="seconds") + "Z",
            ),
        )
        conn.commit()

        self._send_json(
            201,
            {
                "id": cur.lastrowid,
                "message": "Reservation created",
                "table_number": table_number,
                "start_time": start_time,
                "end_time": end_time,
            },
        )

    def _handle_tables(self, query_string: str):
        query = parse_qs(query_string)
        date = (query.get("date") or [""])[0].strip()
        start_time = (query.get("start_time") or query.get("time") or [""])[0].strip()
        end_time = (query.get("end_time") or [""])[0].strip()

        if not date or not start_time or not end_time:
            self._send_json(400, {"error": "date, start_time and end_time are required"})
            return

        start_minutes = to_schedule_minutes(date, start_time)
        end_minutes = to_schedule_minutes(date, end_time)
        if start_minutes is None or end_minutes is None:
            self._send_json(400, {"error": "Invalid date/time. 2026 only; Mon-Fri 11:00-23:00, Sat-Sun 11:00-00:00"})
            return

        if end_minutes <= start_minutes:
            self._send_json(400, {"error": "End time must be greater than start time"})
            return

        cur = conn.cursor()
        cur.execute(
            """
            SELECT table_number, reservation_time, COALESCE(reservation_end_time, reservation_time)
            FROM table_reservations
            WHERE reservation_date = ?
            """,
            (date,),
        )
        busy_tables = []
        for table_number, existing_start, existing_end in cur.fetchall():
            existing_start_minutes = to_schedule_minutes(date, existing_start)
            existing_end_minutes = to_schedule_minutes(date, existing_end)
            if existing_start_minutes is None or existing_end_minutes is None:
                continue
            if start_minutes < existing_end_minutes and end_minutes > existing_start_minutes:
                busy_tables.append(table_number)
        self._send_json(200, {"tables_count": TABLES_COUNT, "busy_tables": busy_tables})

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
