import { describe, it, expect } from "vitest";
import request from "supertest";
import { makeApp } from "./helpers";

describe("orders API", () => {
  it("places an order and returns a pdf filename", async () => {
    const { app } = makeApp();
    const p = (await request(app).post("/api/products").send({ name: "Coffee", unit_price: 18500 })).body;
    await request(app)
      .post("/api/stock-receipts")
      .field("lines", JSON.stringify([{ product_id: p.id, quantity: 12 }]))
      .attach("receipt", Buffer.from("x"), { filename: "r.png", contentType: "image/png" });

    const res = await request(app)
      .post("/api/orders")
      .send({ items: [{ product_id: p.id, quantity: 2 }] });
    expect(res.status).toBe(201);
    expect(res.body.total).toBe(37000);
    expect(res.body.pdf_filename).toMatch(/\.pdf$/);
  });

  it("returns 409 with offending lines when stock is insufficient", async () => {
    const { app } = makeApp();
    const p = (await request(app).post("/api/products").send({ name: "Sugar", unit_price: 7500 })).body;
    const res = await request(app)
      .post("/api/orders")
      .send({ items: [{ product_id: p.id, quantity: 1 }] });
    expect(res.status).toBe(409);
    expect(res.body.lines[0]).toMatchObject({ product_id: p.id, requested: 1, available: 0 });
  });
});
