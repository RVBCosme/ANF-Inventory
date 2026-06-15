import { describe, it, expect } from "vitest";
import { openDb } from "../src/db";
import { createProduct, getProduct } from "../src/services/products";
import { receiveStock } from "../src/services/stock";
import { placeOrder } from "../src/services/orders";
import { StockConflictError } from "../src/errors";
import { tmpDataDir, tmpDir } from "./helpers";

function seed(db: ReturnType<typeof openDb>) {
  const coffee = createProduct(db, { name: "Coffee", unit_price: 18500 });
  const sugar = createProduct(db, { name: "Sugar", unit_price: 7500 });
  receiveStock(db, [{ product_id: coffee.id, quantity: 12 }], "c.jpg");
  return { coffee, sugar };
}

describe("orders service", () => {
  it("places an order, decrements stock, snapshots items, and logs it", async () => {
    const db = openDb(":memory:");
    const { coffee } = seed(db);
    const res = await placeOrder(db, tmpDataDir(), [{ product_id: coffee.id, quantity: 2 }]);
    expect(res.total).toBe(37000);
    expect(res.pdf_filename).toMatch(/^order_\d+_.*\.pdf$/);
    expect(getProduct(db, coffee.id).stock).toBe(10);
    const items = db.prepare("SELECT * FROM order_items").all() as any[];
    expect(items[0].product_name).toBe("Coffee");
    expect(items[0].amount).toBe(37000);
    expect(db.prepare("SELECT * FROM logs WHERE action='place_order'").all()).toHaveLength(1);
  });

  it("rejects the whole order if any line lacks stock, changing nothing", async () => {
    const db = openDb(":memory:");
    const { coffee, sugar } = seed(db);
    await expect(
      placeOrder(db, tmpDataDir(), [
        { product_id: coffee.id, quantity: 1 },
        { product_id: sugar.id, quantity: 1 },
      ]),
    ).rejects.toThrow(StockConflictError);
    expect(getProduct(db, coffee.id).stock).toBe(12);
    expect(db.prepare("SELECT * FROM orders").all()).toHaveLength(0);
  });

  it("reports the offending lines on conflict", async () => {
    const db = openDb(":memory:");
    const { coffee } = seed(db);
    try {
      await placeOrder(db, tmpDataDir(), [{ product_id: coffee.id, quantity: 99 }]);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(StockConflictError);
      expect((e as StockConflictError).lines[0]).toEqual({
        product_id: coffee.id,
        requested: 99,
        available: 12,
      });
    }
  });

  it("aggregates duplicate lines for the same product and 409s when the sum exceeds stock", async () => {
    const db = openDb(":memory:");
    const { coffee } = seed(db); // stock = 12
    try {
      await placeOrder(db, tmpDataDir(), [
        { product_id: coffee.id, quantity: 7 },
        { product_id: coffee.id, quantity: 7 },
      ]);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(StockConflictError);
      expect((e as StockConflictError).lines[0]).toEqual({
        product_id: coffee.id,
        requested: 14,
        available: 12,
      });
    }
    expect(getProduct(db, coffee.id).stock).toBe(12); // unchanged
    expect(db.prepare("SELECT * FROM orders").all()).toHaveLength(0);
  });

  it("succeeds with duplicate lines when their sum fits in stock", async () => {
    const db = openDb(":memory:");
    const { coffee } = seed(db); // stock = 12
    const res = await placeOrder(db, tmpDataDir(), [
      { product_id: coffee.id, quantity: 3 },
      { product_id: coffee.id, quantity: 3 },
    ]);
    expect(res.total).toBe(111000); // 6 * 18500
    expect(getProduct(db, coffee.id).stock).toBe(6);
    expect(db.prepare("SELECT * FROM order_items").all()).toHaveLength(2);
  });

  it("still commits the order if PDF generation fails", async () => {
    const db = openDb(":memory:");
    const { coffee } = seed(db);
    // A data dir with NO orders/ subfolder makes generateOrderPdf reject (the write
    // stream cannot open a file inside a missing directory).
    const dirWithoutOrders = tmpDir("anf-nopdf-");
    const res = await placeOrder(db, dirWithoutOrders, [{ product_id: coffee.id, quantity: 1 }]);
    expect(res.pdf_filename).toBe(""); // order stands, PDF skipped
    expect(getProduct(db, coffee.id).stock).toBe(11); // stock still decremented
    expect(db.prepare("SELECT * FROM orders").all()).toHaveLength(1);
  });
});
