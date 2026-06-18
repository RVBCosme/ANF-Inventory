import fs from "node:fs";
import path from "node:path";
import type { DB } from "./db";

export interface CatalogueEntry {
  name: string;
  category: string;
}

/**
 * Seed the product catalogue into an EMPTY products table.
 *
 * No-op when any product row already exists — including soft-deleted ones — so
 * an install that has been in use (or had its list pruned) is never overwritten.
 * Products are inserted with no price and no stock (unit_price 0, stock 0);
 * pricing and quantities are added later through normal use. Returns the number
 * of products inserted (0 when it skipped).
 */
export function seedProducts(db: DB, catalogue: CatalogueEntry[], nowIso: string): number {
  const existing = (db.prepare("SELECT COUNT(*) AS c FROM products").get() as { c: number }).c;
  if (existing > 0) return 0;

  const insert = db.prepare(
    `INSERT INTO products (name, unit_price, stock, category, created_at, updated_at)
     VALUES (?, 0, 0, ?, ?, ?)`,
  );
  const insertAll = db.transaction((items: CatalogueEntry[]) => {
    for (const it of items) insert.run(it.name, it.category, nowIso, nowIso);
  });
  insertAll(catalogue);
  return catalogue.length;
}

/**
 * Read the product catalogue shipped at the server package root. The path
 * resolves to the same `server/catalogue.json` whether this module runs from
 * `dist/` (production) or `src/` (dev and tests).
 */
export function loadCatalogue(): CatalogueEntry[] {
  const file = path.resolve(__dirname, "..", "catalogue.json");
  return JSON.parse(fs.readFileSync(file, "utf-8")) as CatalogueEntry[];
}
