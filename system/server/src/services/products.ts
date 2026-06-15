import type { DB } from "../db";
import type { Product, NewProductInput, UpdateProductInput } from "@anf/shared";
import { formatPeso } from "@anf/shared";
import { nowIso } from "../lib/time";
import { writeLog } from "./logs";
import { NotFoundError } from "../errors";

export function getProduct(db: DB, id: number): Product {
  const p = db
    .prepare("SELECT * FROM products WHERE id = ? AND deleted_at IS NULL")
    .get(id) as Product | undefined;
  if (!p) throw new NotFoundError("Product not found");
  return p;
}

export function listProducts(db: DB, query?: string): Product[] {
  if (query && query.trim()) {
    const like = `%${query.trim()}%`;
    return db
      .prepare(
        `SELECT * FROM products
         WHERE deleted_at IS NULL
           AND (name LIKE ? OR CAST(id AS TEXT) LIKE ? OR printf('%04d', id) LIKE ? OR category LIKE ?)
         ORDER BY id`,
      )
      .all(like, like, like, like) as Product[];
  }
  return db
    .prepare("SELECT * FROM products WHERE deleted_at IS NULL ORDER BY id")
    .all() as Product[];
}

export function listCategories(db: DB): string[] {
  const rows = db
    .prepare(
      "SELECT DISTINCT category FROM products WHERE deleted_at IS NULL AND category <> '' ORDER BY category",
    )
    .all() as { category: string }[];
  return rows.map((r) => r.category);
}

export function createProduct(db: DB, input: NewProductInput): Product {
  const ts = nowIso();
  const info = db
    .prepare(
      `INSERT INTO products (name, unit_price, stock, category, created_at, updated_at)
       VALUES (?, ?, 0, ?, ?, ?)`,
    )
    .run(input.name, input.unit_price, input.category ?? "", ts, ts);
  const id = Number(info.lastInsertRowid);
  writeLog(db, "add_item", `Added product "${input.name}" at ${formatPeso(input.unit_price)}`, {
    product_id: id,
  });
  return getProduct(db, id);
}

export function updateProduct(db: DB, id: number, input: UpdateProductInput): Product {
  const current = getProduct(db, id);
  const name = input.name ?? current.name;
  const price = input.unit_price ?? current.unit_price;
  const category = input.category ?? current.category;
  db.prepare(
    "UPDATE products SET name = ?, unit_price = ?, category = ?, updated_at = ? WHERE id = ?",
  ).run(name, price, category, nowIso(), id);
  writeLog(db, "edit_item", `Edited "${name}" (price ${formatPeso(price)})`, { product_id: id });
  return getProduct(db, id);
}

export function softDeleteProduct(db: DB, id: number): void {
  const p = getProduct(db, id);
  db.prepare("UPDATE products SET deleted_at = ? WHERE id = ?").run(nowIso(), id);
  writeLog(db, "delete_item", `Deleted product "${p.name}"`, { product_id: id });
}
