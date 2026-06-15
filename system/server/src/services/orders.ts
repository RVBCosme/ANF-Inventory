import path from "node:path";
import type { DB } from "../db";
import type { OrderResult, Product, StockConflictLine } from "@anf/shared";
import { formatPeso } from "@anf/shared";
import { nowIso } from "../lib/time";
import { orderPdfFilename } from "../lib/files";
import { generateOrderPdf } from "../pdf/orderPdf";
import { writeLog } from "./logs";
import { NotFoundError, StockConflictError } from "../errors";

interface OrderLineInput {
  product_id: number;
  quantity: number;
}

export async function placeOrder(
  db: DB,
  dataDir: string,
  items: OrderLineInput[],
): Promise<OrderResult> {
  const committed = db.transaction(() => {
    // Load each distinct product once and SUM the requested quantity per product,
    // so duplicate cart lines for the same product are validated against stock
    // together (otherwise two lines could each pass and then over-draw stock).
    const productsById = new Map<number, Product>();
    const requestedByProduct = new Map<number, number>();
    for (const line of items) {
      if (!productsById.has(line.product_id)) {
        const product = db
          .prepare("SELECT * FROM products WHERE id = ? AND deleted_at IS NULL")
          .get(line.product_id) as Product | undefined;
        if (!product) throw new NotFoundError(`Product ${line.product_id} not found`);
        productsById.set(line.product_id, product);
      }
      requestedByProduct.set(
        line.product_id,
        (requestedByProduct.get(line.product_id) ?? 0) + line.quantity,
      );
    }

    const conflicts: StockConflictLine[] = [];
    for (const [productId, requested] of requestedByProduct) {
      const product = productsById.get(productId)!;
      if (product.stock < requested) {
        conflicts.push({ product_id: productId, requested, available: product.stock });
      }
    }
    if (conflicts.length > 0) throw new StockConflictError(conflicts);

    const total = items.reduce(
      (sum, line) => sum + productsById.get(line.product_id)!.unit_price * line.quantity,
      0,
    );
    const ts = nowIso();
    const orderId = Number(
      db
        .prepare("INSERT INTO orders (total, pdf_filename, created_at) VALUES (?, '', ?)")
        .run(total, ts).lastInsertRowid,
    );

    const insertItem = db.prepare(
      `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, amount)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    const decrement = db.prepare(
      "UPDATE products SET stock = stock - ?, updated_at = ? WHERE id = ?",
    );
    for (const line of items) {
      const product = productsById.get(line.product_id)!;
      const amount = product.unit_price * line.quantity;
      insertItem.run(orderId, product.id, product.name, product.unit_price, line.quantity, amount);
      decrement.run(line.quantity, ts, product.id);
    }

    const itemCount = items.length;
    writeLog(
      db,
      "place_order",
      `Order #${orderId} — ${formatPeso(total)} (${itemCount} item${itemCount > 1 ? "s" : ""})`,
      { order_id: orderId },
    );

    const pdfItems = items.map((line) => {
      const product = productsById.get(line.product_id)!;
      return {
        id: product.id,
        name: product.name,
        unitPrice: product.unit_price,
        quantity: line.quantity,
        amount: product.unit_price * line.quantity,
      };
    });
    return { orderId, total, ts, pdfItems };
  })();

  // Generate the PDF AFTER the transaction commits. If it fails, the order still
  // stands: log the failure and return pdf_filename "" (the History "Open PDF"
  // will 404 until the PDF can be regenerated). The order is never lost.
  const pdfFilename = orderPdfFilename(committed.orderId);
  try {
    await generateOrderPdf(path.join(dataDir, "orders", pdfFilename), {
      orderId: committed.orderId,
      createdAt: committed.ts,
      total: committed.total,
      items: committed.pdfItems,
    });
    db.prepare("UPDATE orders SET pdf_filename = ? WHERE id = ?").run(pdfFilename, committed.orderId);
    return { id: committed.orderId, total: committed.total, pdf_filename: pdfFilename };
  } catch (err) {
    console.error(`Order #${committed.orderId} committed but PDF generation failed:`, err);
    return { id: committed.orderId, total: committed.total, pdf_filename: "" };
  }
}
