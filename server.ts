import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("grocery.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS grocery_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'Other',
    quantity TEXT,
    priority TEXT DEFAULT 'Medium',
    location TEXT,
    completed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Migration: Add priority and location columns if they don't exist
const tableInfo = db.prepare("PRAGMA table_info(grocery_items)").all() as any[];
const hasPriority = tableInfo.some(col => col.name === 'priority');
const hasLocation = tableInfo.some(col => col.name === 'location');

if (!hasPriority) {
  db.exec("ALTER TABLE grocery_items ADD COLUMN priority TEXT DEFAULT 'Medium'");
}
if (!hasLocation) {
  db.exec("ALTER TABLE grocery_items ADD COLUMN location TEXT");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/items", (req, res) => {
    const items = db.prepare("SELECT * FROM grocery_items ORDER BY created_at DESC").all();
    res.json(items);
  });

  app.post("/api/items", (req, res) => {
    const { name, category, quantity, priority, location } = req.body;
    const info = db.prepare("INSERT INTO grocery_items (name, category, quantity, priority, location) VALUES (?, ?, ?, ?, ?)").run(name, category || 'Other', quantity || '', priority || 'Medium', location || '');
    const newItem = db.prepare("SELECT * FROM grocery_items WHERE id = ?").get(info.lastInsertRowid);
    res.json(newItem);
  });

  app.patch("/api/items/:id", (req, res) => {
    const { id } = req.params;
    const { completed, name, category, quantity, priority, location } = req.body;
    
    if (completed !== undefined) {
      db.prepare("UPDATE grocery_items SET completed = ? WHERE id = ?").run(completed ? 1 : 0, id);
    }
    if (name) {
      db.prepare("UPDATE grocery_items SET name = ? WHERE id = ?").run(name, id);
    }
    if (category) {
      db.prepare("UPDATE grocery_items SET category = ? WHERE id = ?").run(category, id);
    }
    if (quantity) {
      db.prepare("UPDATE grocery_items SET quantity = ? WHERE id = ?").run(quantity, id);
    }
    if (priority) {
      db.prepare("UPDATE grocery_items SET priority = ? WHERE id = ?").run(priority, id);
    }
    if (location) {
      db.prepare("UPDATE grocery_items SET location = ? WHERE id = ?").run(location, id);
    }

    const updatedItem = db.prepare("SELECT * FROM grocery_items WHERE id = ?").get(id);
    res.json(updatedItem);
  });

  app.delete("/api/items/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM grocery_items WHERE id = ?").run(id);
    res.status(204).send();
  });

  app.delete("/api/items/completed", (req, res) => {
    db.prepare("DELETE FROM grocery_items WHERE completed = 1").run();
    res.status(204).send();
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
