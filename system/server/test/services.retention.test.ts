import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { openDb } from "../src/db";
import { createProduct, getProduct } from "../src/services/products";
import { receiveStock } from "../src/services/stock";
import { purgeOldRecords } from "../src/services/retention";
import { tmpDataDir } from "./helpers";

const OLD = "2000-01-01T00:00:00.000Z";

describe("retention", () => {
  it("deletes receipts/additions/files older than 365 days but keeps products and current stock", () => {
    const db = openDb(":memory:");
    const dir = tmpDataDir();
    const p = createProduct(db, { name: "Coffee", unit_price: 100 });
    receiveStock(db, [{ product_id: p.id, quantity: 5 }], "old.jpg");
    fs.writeFileSync(path.join(dir, "receipts", "old.jpg"), "x");
    db.prepare("UPDATE stock_receipts SET created_at = ?").run(OLD);
    db.prepare("UPDATE logs SET created_at = ?").run(OLD);

    purgeOldRecords(db, dir);

    expect(db.prepare("SELECT * FROM stock_receipts").all()).toHaveLength(0);
    expect(db.prepare("SELECT * FROM stock_additions").all()).toHaveLength(0); // cascaded
    expect(db.prepare("SELECT * FROM logs").all()).toHaveLength(0);
    expect(fs.existsSync(path.join(dir, "receipts", "old.jpg"))).toBe(false);
    expect(getProduct(db, p.id).stock).toBe(5);
  });

  it("keeps records within the one-year window (300 days old)", () => {
    const db = openDb(":memory:");
    const dir = tmpDataDir();
    const now = new Date("2026-06-02T00:00:00.000Z");
    const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
    const p = createProduct(db, { name: "Coffee", unit_price: 100 });
    receiveStock(db, [{ product_id: p.id, quantity: 5 }], "within.jpg");
    db.prepare("UPDATE stock_receipts SET created_at = ?").run(daysAgo(300));
    db.prepare("UPDATE logs SET created_at = ?").run(daysAgo(300));

    purgeOldRecords(db, dir, now);

    expect(db.prepare("SELECT * FROM stock_receipts").all()).toHaveLength(1);
    expect(db.prepare("SELECT * FROM stock_additions").all()).toHaveLength(1);
  });

  it("keeps recent records", () => {
    const db = openDb(":memory:");
    const dir = tmpDataDir();
    const p = createProduct(db, { name: "Coffee", unit_price: 100 });
    receiveStock(db, [{ product_id: p.id, quantity: 5 }], "new.jpg");
    purgeOldRecords(db, dir);
    expect(db.prepare("SELECT * FROM stock_receipts").all()).toHaveLength(1);
    expect(db.prepare("SELECT * FROM stock_additions").all()).toHaveLength(1);
  });

  it("sweeps orphaned files with no matching record", () => {
    const db = openDb(":memory:");
    const dir = tmpDataDir();
    fs.writeFileSync(path.join(dir, "receipts", "orphan.jpg"), "x");
    fs.writeFileSync(path.join(dir, "orders", "orphan.pdf"), "x");
    purgeOldRecords(db, dir);
    expect(fs.existsSync(path.join(dir, "receipts", "orphan.jpg"))).toBe(false);
    expect(fs.existsSync(path.join(dir, "orders", "orphan.pdf"))).toBe(false);
  });
});
