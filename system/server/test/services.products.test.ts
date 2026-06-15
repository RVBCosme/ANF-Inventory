import { describe, it, expect } from "vitest";
import { openDb } from "../src/db";
import {
  createProduct,
  listProducts,
  listCategories,
  getProduct,
  updateProduct,
  softDeleteProduct,
} from "../src/services/products";
import { NotFoundError } from "../src/errors";

describe("products service", () => {
  it("creates a product with zero stock and a log entry", () => {
    const db = openDb(":memory:");
    const p = createProduct(db, { name: "Coffee 200g", unit_price: 18500 });
    expect(p.id).toBe(1);
    expect(p.stock).toBe(0);
    expect(p.deleted_at).toBeNull();
    const logs = db.prepare("SELECT * FROM logs WHERE action='add_item'").all();
    expect(logs).toHaveLength(1);
  });

  it("lists only active products and searches by id or name", () => {
    const db = openDb(":memory:");
    createProduct(db, { name: "Coffee", unit_price: 100 });
    const sugar = createProduct(db, { name: "Sugar", unit_price: 50 });
    softDeleteProduct(db, sugar.id);
    expect(listProducts(db)).toHaveLength(1);
    expect(listProducts(db, "cof")).toHaveLength(1);
    expect(listProducts(db, "0001")).toHaveLength(1);
    expect(listProducts(db, "zzz")).toHaveLength(0);
  });

  it("updates name and price, refreshing updated_at", () => {
    const db = openDb(":memory:");
    const p = createProduct(db, { name: "Coffee", unit_price: 100 });
    const updated = updateProduct(db, p.id, { unit_price: 200 });
    expect(updated.unit_price).toBe(200);
    expect(updated.name).toBe("Coffee");
  });

  it("throws NotFoundError for a missing or deleted product", () => {
    const db = openDb(":memory:");
    expect(() => getProduct(db, 999)).toThrow(NotFoundError);
    const p = createProduct(db, { name: "X", unit_price: 1 });
    softDeleteProduct(db, p.id);
    expect(() => getProduct(db, p.id)).toThrow(NotFoundError);
  });

  it("stores a category and defaults to empty when omitted", () => {
    const db = openDb(":memory:");
    const withCat = createProduct(db, { name: "Flag Pole", unit_price: 0, category: "Flags" });
    const without = createProduct(db, { name: "Mystery", unit_price: 0 });
    expect(getProduct(db, withCat.id).category).toBe("Flags");
    expect(getProduct(db, without.id).category).toBe("");
  });

  it("searches by category substring", () => {
    const db = openDb(":memory:");
    createProduct(db, { name: "Flag Pole", unit_price: 0, category: "Flags" });
    createProduct(db, { name: "ANF Patch", unit_price: 0, category: "Patches" });
    expect(listProducts(db, "flag").map((p) => p.name)).toEqual(["Flag Pole"]);
    expect(listProducts(db, "Patches").map((p) => p.name)).toEqual(["ANF Patch"]);
  });

  it("updates the category alone", () => {
    const db = openDb(":memory:");
    const p = createProduct(db, { name: "Tumbler", unit_price: 0 });
    const updated = updateProduct(db, p.id, { category: "Souvenirs" });
    expect(updated.category).toBe("Souvenirs");
    expect(updated.name).toBe("Tumbler");
  });

  it("lists distinct non-empty categories, sorted", () => {
    const db = openDb(":memory:");
    createProduct(db, { name: "A", unit_price: 0, category: "Souvenirs" });
    createProduct(db, { name: "B", unit_price: 0, category: "Flags" });
    createProduct(db, { name: "C", unit_price: 0, category: "Flags" });
    createProduct(db, { name: "D", unit_price: 0 });
    expect(listCategories(db)).toEqual(["Flags", "Souvenirs"]);
  });
});
