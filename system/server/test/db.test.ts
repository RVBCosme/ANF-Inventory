import { describe, it, expect } from "vitest";
import { openDb } from "../src/db";
import Database from "better-sqlite3";
import path from "node:path";
import { tmpDir } from "./helpers";

describe("openDb", () => {
  it("creates all tables and enables foreign keys", () => {
    const db = openDb(":memory:");
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((r: any) => r.name);
    for (const t of ["products", "stock_receipts", "stock_additions", "orders", "order_items", "logs"]) {
      expect(tables).toContain(t);
    }
    expect(db.pragma("foreign_keys", { simple: true })).toBe(1);
    db.close();
  });
});

describe("openDb migration: products.category", () => {
  it("adds the category column to a pre-existing column-less products table", () => {
    const dir = tmpDir("anf-mig-");
    const file = path.join(dir, "old.db");
    const raw = new Database(file);
    raw.exec(`CREATE TABLE products (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
      unit_price INTEGER NOT NULL, stock INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT)`);
    raw.prepare(
      "INSERT INTO products (name, unit_price, stock, created_at, updated_at) VALUES ('Old', 100, 0, 't', 't')",
    ).run();
    raw.close();

    const db = openDb(file);
    const cols = db.prepare("PRAGMA table_info(products)").all() as { name: string }[];
    expect(cols.some((c) => c.name === "category")).toBe(true);
    const row = db.prepare("SELECT category FROM products WHERE name = 'Old'").get() as { category: string };
    expect(row.category).toBe("");
    db.close();
  });

  it("is a no-op on a fresh database (category already present once)", () => {
    const db = openDb(":memory:");
    const cols = db.prepare("PRAGMA table_info(products)").all() as { name: string }[];
    expect(cols.filter((c) => c.name === "category")).toHaveLength(1);
    db.close();
  });
});

describe("openDb migration: stock_additions.receipt_id", () => {
  it("adds receipt_id and backfills one stock_receipts header per legacy addition", () => {
    const dir = tmpDir("anf-mig-rec-");
    const file = path.join(dir, "old.db");
    const raw = new Database(file);
    raw.exec(`CREATE TABLE products (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
      unit_price INTEGER NOT NULL, stock INTEGER NOT NULL DEFAULT 0,
      category TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL, deleted_at TEXT)`);
    raw.exec(`CREATE TABLE stock_additions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL, receipt_filename TEXT NOT NULL, created_at TEXT NOT NULL)`);
    raw.prepare(
      "INSERT INTO products (name, unit_price, stock, created_at, updated_at) VALUES ('Old', 100, 5, 't', 't')",
    ).run();
    raw.prepare(
      "INSERT INTO stock_additions (product_id, quantity, receipt_filename, created_at) VALUES (1, 5, 'legacy.jpg', '2020-01-01')",
    ).run();
    raw.close();

    const db = openDb(file);
    const cols = db.prepare("PRAGMA table_info(stock_additions)").all() as { name: string }[];
    expect(cols.some((c) => c.name === "receipt_id")).toBe(true);
    const receipts = db.prepare("SELECT * FROM stock_receipts").all() as {
      id: number;
      receipt_filename: string;
    }[];
    expect(receipts).toHaveLength(1);
    expect(receipts[0].receipt_filename).toBe("legacy.jpg");
    const add = db.prepare("SELECT receipt_id FROM stock_additions").get() as { receipt_id: number };
    expect(add.receipt_id).toBe(receipts[0].id);
    db.close();
  });

  it("is a no-op on a fresh database (receipt_id present exactly once)", () => {
    const db = openDb(":memory:");
    const cols = db.prepare("PRAGMA table_info(stock_additions)").all() as { name: string }[];
    expect(cols.filter((c) => c.name === "receipt_id")).toHaveLength(1);
    db.close();
  });
});
