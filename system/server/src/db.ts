import Database from "better-sqlite3";

export type DB = Database.Database;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  unit_price  INTEGER NOT NULL CHECK (unit_price >= 0),
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  category    TEXT    NOT NULL DEFAULT '',
  created_at  TEXT    NOT NULL,
  updated_at  TEXT    NOT NULL,
  deleted_at  TEXT
);

CREATE TABLE IF NOT EXISTS stock_receipts (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_filename TEXT    NOT NULL,
  created_at       TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS stock_additions (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id       INTEGER NOT NULL REFERENCES products(id),
  quantity         INTEGER NOT NULL CHECK (quantity > 0),
  receipt_filename TEXT    NOT NULL,
  receipt_id       INTEGER REFERENCES stock_receipts(id) ON DELETE CASCADE,
  created_at       TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  total        INTEGER NOT NULL CHECK (total >= 0),
  pdf_filename TEXT    NOT NULL DEFAULT '',
  created_at   TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id     INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   INTEGER REFERENCES products(id),
  product_name TEXT    NOT NULL,
  unit_price   INTEGER NOT NULL,
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  amount       INTEGER NOT NULL CHECK (amount >= 0)
);

CREATE TABLE IF NOT EXISTS logs (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  action           TEXT    NOT NULL,
  summary          TEXT    NOT NULL,
  product_id       INTEGER,
  order_id         INTEGER,
  receipt_filename TEXT,
  created_at       TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_logs_created ON logs(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_created ON stock_additions(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_receipts_created ON stock_receipts(created_at);
CREATE INDEX IF NOT EXISTS idx_products_deleted ON products(deleted_at);
`;

function migrate(db: DB): void {
  const cols = db.prepare("PRAGMA table_info(products)").all() as { name: string }[];
  if (!cols.some((c) => c.name === "category")) {
    db.exec("ALTER TABLE products ADD COLUMN category TEXT NOT NULL DEFAULT ''");
  }

  const additionCols = db.prepare("PRAGMA table_info(stock_additions)").all() as { name: string }[];
  if (!additionCols.some((c) => c.name === "receipt_id")) {
    db.exec(
      "ALTER TABLE stock_additions ADD COLUMN receipt_id INTEGER REFERENCES stock_receipts(id) ON DELETE CASCADE",
    );
    // Backfill: one header per legacy addition (1:1), preserving its file + timestamp.
    const legacy = db
      .prepare("SELECT id, receipt_filename, created_at FROM stock_additions WHERE receipt_id IS NULL")
      .all() as { id: number; receipt_filename: string; created_at: string }[];
    const insertReceipt = db.prepare(
      "INSERT INTO stock_receipts (receipt_filename, created_at) VALUES (?, ?)",
    );
    const link = db.prepare("UPDATE stock_additions SET receipt_id = ? WHERE id = ?");
    db.transaction(() => {
      for (const a of legacy) {
        const rid = Number(insertReceipt.run(a.receipt_filename, a.created_at).lastInsertRowid);
        link.run(rid, a.id);
      }
    })();
  }
}

export function openDb(filename: string): DB {
  const db = new Database(filename);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  migrate(db);
  return db;
}
