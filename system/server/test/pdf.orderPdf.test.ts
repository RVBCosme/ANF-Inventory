import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { tmpDataDir } from "./helpers";
import { generateOrderPdf } from "../src/pdf/orderPdf";

describe("order PDF", () => {
  it("writes a non-empty PDF file", async () => {
    const dir = tmpDataDir();
    const out = path.join(dir, "orders", "order_1_test.pdf");
    await generateOrderPdf(out, {
      orderId: 1,
      createdAt: "2026-05-31T14:14:00.000Z",
      total: 37000,
      items: [{ id: 1, name: "Coffee 200g", unitPrice: 18500, quantity: 2, amount: 37000 }],
    });
    const buf = fs.readFileSync(out);
    expect(buf.length).toBeGreaterThan(0);
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
    // Guard against truncation: a complete PDF ends with the %%EOF marker.
    expect(buf.subarray(-8).toString()).toContain("%%EOF");
  });
});
