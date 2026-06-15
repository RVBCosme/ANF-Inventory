import { describe, it, expect } from "vitest";
import { openDb, type DB } from "../src/db";
import { writeLog } from "../src/services/logs";
import { listHistory } from "../src/services/history";

function seedAt(db: DB, action: string, summary: string, createdAt: string): void {
  db.prepare(
    `INSERT INTO logs (action, summary, product_id, order_id, receipt_filename, created_at)
     VALUES (?, ?, NULL, NULL, NULL, ?)`,
  ).run(action, summary, createdAt);
}

describe("logs & history", () => {
  it("returns entries newest-first with no filters", () => {
    const db = openDb(":memory:");
    writeLog(db, "add_item", "Added Coffee", { product_id: 1 });
    writeLog(db, "place_order", "Order #1 — ₱370.00 (1 item)", { order_id: 1 });
    const entries = listHistory(db);
    expect(entries).toHaveLength(2);
    expect(entries[0].action).toBe("place_order");
    expect(entries[1].action).toBe("add_item");
  });

  it("filters by action", () => {
    const db = openDb(":memory:");
    writeLog(db, "add_item", "Added Coffee");
    writeLog(db, "place_order", "Order #1");
    writeLog(db, "add_stock", "Added 5 to Coffee");
    const orders = listHistory(db, { action: "place_order" });
    expect(orders).toHaveLength(1);
    expect(orders[0].action).toBe("place_order");
  });

  it("filters by time range, excluding entries older than the window", () => {
    const db = openDb(":memory:");
    seedAt(db, "add_item", "recent", new Date().toISOString());
    seedAt(db, "add_item", "old", new Date(Date.now() - 10 * 86_400_000).toISOString());
    expect(listHistory(db, { range: "1w" }).map((e) => e.summary)).toEqual(["recent"]);
    expect(listHistory(db, { range: "all" })).toHaveLength(2);
  });

  it("combines action and range with AND", () => {
    const db = openDb(":memory:");
    seedAt(db, "place_order", "recent order", new Date().toISOString());
    seedAt(db, "place_order", "old order", new Date(Date.now() - 10 * 86_400_000).toISOString());
    seedAt(db, "add_item", "recent add", new Date().toISOString());
    expect(listHistory(db, { action: "place_order", range: "1w" }).map((e) => e.summary)).toEqual([
      "recent order",
    ]);
  });
});
