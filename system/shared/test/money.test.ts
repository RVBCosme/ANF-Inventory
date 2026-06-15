import { describe, it, expect } from "vitest";
import { formatPeso, pesosToCentavos, computeAmount, computeTotal } from "../src/money";
import { newProductSchema, orderInputSchema } from "../src/schemas";

describe("money", () => {
  it("formats centavos as pesos with two decimals and a thousands separator", () => {
    expect(formatPeso(123450)).toBe("₱1,234.50");
    expect(formatPeso(7500)).toBe("₱75.00");
    expect(formatPeso(0)).toBe("₱0.00");
  });

  it("converts pesos to integer centavos, rounding", () => {
    expect(pesosToCentavos(185)).toBe(18500);
    expect(pesosToCentavos(75.5)).toBe(7550);
    expect(pesosToCentavos(0.1)).toBe(10);
  });

  it("computes a line amount and a cart total in centavos", () => {
    expect(computeAmount(18500, 2)).toBe(37000);
    expect(
      computeTotal([
        { unitPrice: 18500, qty: 2 },
        { unitPrice: 7500, qty: 1 },
      ]),
    ).toBe(44500);
  });
});

describe("schemas", () => {
  it("accepts a valid new product and rejects empty names / negative prices", () => {
    expect(newProductSchema.safeParse({ name: "Coffee", unit_price: 18500 }).success).toBe(true);
    expect(newProductSchema.safeParse({ name: "  ", unit_price: 100 }).success).toBe(false);
    expect(newProductSchema.safeParse({ name: "X", unit_price: -1 }).success).toBe(false);
  });

  it("requires at least one order line with a positive quantity", () => {
    expect(orderInputSchema.safeParse({ items: [] }).success).toBe(false);
    expect(orderInputSchema.safeParse({ items: [{ product_id: 1, quantity: 0 }] }).success).toBe(false);
    expect(orderInputSchema.safeParse({ items: [{ product_id: 1, quantity: 2 }] }).success).toBe(true);
  });
});
