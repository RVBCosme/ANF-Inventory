import { describe, it, expect } from "vitest";
import request from "supertest";
import { makeApp } from "./helpers";

describe("history & files API", () => {
  it("lists history newest-first and serves a receipt + order PDF", async () => {
    const { app } = makeApp();
    const p = (await request(app).post("/api/products").send({ name: "Coffee", unit_price: 18500 })).body;
    await request(app)
      .post("/api/stock-receipts")
      .field("lines", JSON.stringify([{ product_id: p.id, quantity: 5 }]))
      .attach("receipt", Buffer.from("x"), { filename: "r.png", contentType: "image/png" });
    const order = await request(app)
      .post("/api/orders")
      .send({ items: [{ product_id: p.id, quantity: 1 }] });

    const history = (await request(app).get("/api/history")).body;
    expect(history[0].action).toBe("place_order"); // newest first

    const receiptName = history.find((e: any) => e.action === "add_stock").receipt_filename;
    const receipt = await request(app).get(`/api/receipts/${receiptName}`);
    expect(receipt.status).toBe(200);

    const pdf = await request(app).get(`/api/orders/${order.body.id}/pdf`);
    expect(pdf.status).toBe(200);
    expect(pdf.headers["content-type"]).toContain("application/pdf");
  });

  it("404s an unknown receipt", async () => {
    const { app } = makeApp();
    expect((await request(app).get("/api/receipts/nope.jpg")).status).toBe(404);
  });

  it("filters history by action", async () => {
    const { app } = makeApp();
    const p = (await request(app).post("/api/products").send({ name: "Coffee", unit_price: 18500 })).body;
    await request(app)
      .post("/api/stock-receipts")
      .field("lines", JSON.stringify([{ product_id: p.id, quantity: 5 }]))
      .attach("receipt", Buffer.from("x"), { filename: "r.png", contentType: "image/png" });
    await request(app).post("/api/orders").send({ items: [{ product_id: p.id, quantity: 1 }] });

    const orders = (await request(app).get("/api/history?action=place_order")).body;
    expect(orders).toHaveLength(1);
    expect(orders.every((e: any) => e.action === "place_order")).toBe(true);
  });

  it("falls back to all entries on an unknown action/range (no 400)", async () => {
    const { app } = makeApp();
    await request(app).post("/api/products").send({ name: "Coffee", unit_price: 18500 });
    const res = await request(app).get("/api/history?action=banana&range=zzz");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1); // the add_item entry, unfiltered
  });

  it("excludes entries older than the requested range", async () => {
    const { app, db } = makeApp();
    const insert = db.prepare(
      `INSERT INTO logs (action, summary, product_id, order_id, receipt_filename, created_at)
       VALUES ('add_item', ?, NULL, NULL, NULL, ?)`,
    );
    insert.run("old", new Date(Date.now() - 10 * 86_400_000).toISOString());
    insert.run("recent", new Date().toISOString());

    const lastWeek = (await request(app).get("/api/history?range=1w")).body;
    expect(lastWeek.map((e: any) => e.summary)).toEqual(["recent"]);
  });
});
