import type { DB } from "../db";
import type { Product, ReceiveStockResult } from "@anf/shared";
import { nowIso } from "../lib/time";
import { writeLog } from "./logs";
import { getProduct } from "./products";

interface ReceiveLineInput {
  product_id: number;
  quantity: number;
}

export function receiveStock(
  db: DB,
  lines: ReceiveLineInput[],
  receiptFilename: string,
): ReceiveStockResult {
  return db.transaction(() => {
    // Load each distinct product once; SUM duplicate lines per product (like placeOrder).
    const productsById = new Map<number, Product>();
    const qtyByProduct = new Map<number, number>();
    const seen: number[] = []; // first-seen order, for a stable summary
    for (const line of lines) {
      if (!productsById.has(line.product_id)) {
        productsById.set(line.product_id, getProduct(db, line.product_id)); // throws NotFoundError
        seen.push(line.product_id);
      }
      qtyByProduct.set(line.product_id, (qtyByProduct.get(line.product_id) ?? 0) + line.quantity);
    }

    const ts = nowIso();
    const receiptId = Number(
      db
        .prepare("INSERT INTO stock_receipts (receipt_filename, created_at) VALUES (?, ?)")
        .run(receiptFilename, ts).lastInsertRowid,
    );

    const insertAddition = db.prepare(
      `INSERT INTO stock_additions (product_id, quantity, receipt_filename, receipt_id, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    );
    const bump = db.prepare("UPDATE products SET stock = stock + ?, updated_at = ? WHERE id = ?");
    for (const productId of seen) {
      const qty = qtyByProduct.get(productId)!;
      insertAddition.run(productId, qty, receiptFilename, receiptId, ts);
      bump.run(qty, ts, productId);
    }

    const summary =
      `Stock added to ${seen.length} product${seen.length > 1 ? "s" : ""} — ` +
      seen.map((id) => `${productsById.get(id)!.name} +${qtyByProduct.get(id)}`).join(", ");
    writeLog(db, "add_stock", summary, { receipt_filename: receiptFilename });

    return { receipt_id: receiptId, receipt_filename: receiptFilename };
  })();
}
