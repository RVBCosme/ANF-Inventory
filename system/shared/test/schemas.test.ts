import { describe, it, expect } from "vitest";
import { newProductSchema, updateProductSchema, receiveStockSchema } from "../src/schemas";

describe("newProductSchema category", () => {
  it("accepts an omitted category", () => {
    expect(newProductSchema.parse({ name: "Flag Pole", unit_price: 0 }).category).toBeUndefined();
  });
  it("trims a provided category", () => {
    expect(newProductSchema.parse({ name: "X", unit_price: 0, category: "  Flags  " }).category).toBe("Flags");
  });
  it("rejects a category longer than 60 chars", () => {
    expect(() => newProductSchema.parse({ name: "X", unit_price: 0, category: "a".repeat(61) })).toThrow();
  });
});

describe("updateProductSchema category", () => {
  it("allows a category-only update", () => {
    expect(updateProductSchema.parse({ category: "Souvenirs" }).category).toBe("Souvenirs");
  });
  it("still rejects an empty update", () => {
    expect(() => updateProductSchema.parse({})).toThrow();
  });
});

describe("receiveStockSchema", () => {
  it("accepts one or more positive integer lines", () => {
    const parsed = receiveStockSchema.parse({
      lines: [
        { product_id: 1, quantity: 100 },
        { product_id: 2, quantity: 24 },
      ],
    });
    expect(parsed.lines).toHaveLength(2);
  });
  it("rejects an empty lines array", () => {
    expect(() => receiveStockSchema.parse({ lines: [] })).toThrow();
  });
  it("rejects a non-positive quantity", () => {
    expect(() => receiveStockSchema.parse({ lines: [{ product_id: 1, quantity: 0 }] })).toThrow();
  });
  it("rejects a quantity over the max", () => {
    expect(() =>
      receiveStockSchema.parse({ lines: [{ product_id: 1, quantity: 1_000_001 }] }),
    ).toThrow();
  });
});
