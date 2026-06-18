import { describe, it, expect } from "vitest";
import { openDb } from "../src/db";
import { seedProducts, loadCatalogue } from "../src/seed";

const fixture = [
  { name: "Alpha", category: "CERTIFICATES" },
  { name: "Beta", category: "FLAGS" },
];

describe("seedProducts", () => {
  it("seeds an empty products table with name + category, zero price and stock", () => {
    const db = openDb(":memory:");
    const now = "2026-06-18T00:00:00.000Z";

    const inserted = seedProducts(db, fixture, now);

    expect(inserted).toBe(2);
    const rows = db
      .prepare(
        "SELECT name, category, unit_price, stock, created_at, updated_at, deleted_at FROM products ORDER BY id",
      )
      .all();
    expect(rows).toEqual([
      { name: "Alpha", category: "CERTIFICATES", unit_price: 0, stock: 0, created_at: now, updated_at: now, deleted_at: null },
      { name: "Beta", category: "FLAGS", unit_price: 0, stock: 0, created_at: now, updated_at: now, deleted_at: null },
    ]);
    db.close();
  });

  it("does nothing when the products table is non-empty", () => {
    const db = openDb(":memory:");
    db.prepare(
      "INSERT INTO products (name, unit_price, stock, category, created_at, updated_at) VALUES ('Existing', 500, 3, 'Z', '2020-01-01', '2020-01-01')",
    ).run();

    const inserted = seedProducts(db, fixture, "2026-06-18T00:00:00.000Z");

    expect(inserted).toBe(0);
    expect((db.prepare("SELECT COUNT(*) AS c FROM products").get() as { c: number }).c).toBe(1);
    db.close();
  });

  it("treats soft-deleted products as non-empty (does not re-seed)", () => {
    const db = openDb(":memory:");
    db.prepare(
      "INSERT INTO products (name, unit_price, stock, category, created_at, updated_at, deleted_at) VALUES ('Gone', 0, 0, 'Z', '2020-01-01', '2020-01-01', '2020-02-01')",
    ).run();

    const inserted = seedProducts(db, fixture, "2026-06-18T00:00:00.000Z");

    expect(inserted).toBe(0);
    db.close();
  });
});

describe("loadCatalogue", () => {
  it("loads the 102 shipped products, each with a non-empty name and category", () => {
    const catalogue = loadCatalogue();

    expect(catalogue).toHaveLength(102);
    for (const entry of catalogue) {
      expect(typeof entry.name).toBe("string");
      expect(entry.name.length).toBeGreaterThan(0);
      expect(typeof entry.category).toBe("string");
      expect(entry.category.length).toBeGreaterThan(0);
    }
  });
});
