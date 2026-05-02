const express = require("express");
const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const port = Number(process.env.PORT) || 3000;

const dataDir = path.join(__dirname, "data");
const dbPath = path.join(dataDir, "app.db");

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("SQLite connection error:", err.message);
        process.exit(1);
    }
});

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(__dirname));

app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
});

app.post("/api/feedback", (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: "All fields are required" });
    }

    const sql = "INSERT INTO feedback (name, email, message) VALUES (?, ?, ?)";
    db.run(sql, [name.trim(), email.trim(), message.trim()], function onInsert(err) {
        if (err) {
            console.error("Failed to save feedback:", err.message);
            return res.status(500).json({ error: "Failed to save feedback" });
        }

        return res.status(201).json({ id: this.lastID, message: "Feedback saved" });
    });
});

app.get("/", (_req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    console.log(`SQLite DB: ${dbPath}`);
});
