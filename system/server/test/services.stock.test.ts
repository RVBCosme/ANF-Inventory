import { describe, it, expect } from "vitest";
import { openDb } from "../src/db";
import { createProduct, getProduct } from "../src/services/products";
import { receiveStock } from "../src/services/stock";

describe("receiveStock", () => {
  it("inserts one header, one addition per product, bumps stock, writes one log", () => {
    const db = openDb(":memory:");
    const a = createProduct(db, { name: "Flag", unit_price: 100 });
    const b = createProduct(db, { name: "Pole", unit_price: 200 });
    const res = receiveStock(
      db,
      [
        { product_id: a.id, quantity: 100 },
        { product_id: b.id, quantity: 24 },
      ],
      "receipt_x.pdf",
    );
    expect(res.receipt_filename).toBe("receipt_x.pdf");
    expect(typeof res.receipt_id).toBe("number");
    expect(getProduct(db, a.id).stock).toBe(100);
    expect(getProduct(db, b.id).stock).toBe(24);
    expect(db.prepare("SELECT * FROM stock_receipts").all()).toHaveLength(1);
    expect(db.prepare("SELECT * FROM stock_additions").all()).toHaveLength(2);
    const logs = db.prepare("SELECT * FROM logs WHERE action='add_stock'").all() as {
      receipt_filename: string | null;
      product_id: number | null;
    }[];
    expect(logs).toHaveLength(1);
    expect(logs[0].receipt_filename).toBe("receipt_x.pdf");
    expect(logs[0].product_id).toBeNull();
  });

  it("links every addition to the receipt header", () => {
    const db = openDb(":memory:");
    const a = createProduct(db, { name: "Flag", unit_price: 100 });
    const res = receiveStock(db, [{ product_id: a.id, quantity: 5 }], "r.pdf");
    const rows = db.prepare("SELECT receipt_id FROM stock_additions").all() as { receipt_id: number }[];
    expect(rows.every((x) => x.receipt_id === res.receipt_id)).toBe(true);
  });

  it("sums duplicate product lines into a single addition", () => {
    const db = openDb(":memory:");
    const a = createProduct(db, { name: "Flag", unit_price: 100 });
    receiveStock(
      db,
      [
        { product_id: a.id, quantity: 5 },
        { product_id: a.id, quantity: 3 },
      ],
      "r.pdf",
    );
    expect(getProduct(db, a.id).stock).toBe(8);
    expect(db.prepare("SELECT * FROM stock_additions").all()).toHaveLength(1);
  });

  it("rolls back the whole batch when any product is missing", () => {
    const db = openDb(":memory:");
    const a = createProduct(db, { name: "Flag", unit_price: 100 });
    expect(() =>
      receiveStock(
        db,
        [
          { product_id: a.id, quantity: 5 },
          { product_id: 9999, quantity: 1 },
        ],
        "r.pdf",
      ),
    ).toThrow();
    expect(getProduct(db, a.id).stock).toBe(0);
    expect(db.prepare("SELECT * FROM stock_receipts").all()).toHaveLength(0);
    expect(db.prepare("SELECT * FROM stock_additions").all()).toHaveLength(0);
    expect(db.prepare("SELECT * FROM logs WHERE action='add_stock'").all()).toHaveLength(0);
  });
});
