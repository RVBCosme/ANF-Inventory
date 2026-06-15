import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import request from "supertest";
import { makeApp } from "./helpers";

async function makeProduct(app: any, name = "Coffee") {
  return (await request(app).post("/api/products").send({ name, unit_price: 100 })).body;
}

describe("stock receipts API", () => {
  it("receives stock for multiple products with one receipt", async () => {
    const { app } = makeApp();
    const a = await makeProduct(app, "Flag");
    const b = await makeProduct(app, "Pole");
    const res = await request(app)
      .post("/api/stock-receipts")
      .field("lines", JSON.stringify([
        { product_id: a.id, quantity: 100 },
        { product_id: b.id, quantity: 24 },
      ]))
      .attach("receipt", Buffer.from("fake"), { filename: "r.png", contentType: "image/png" });
    expect(res.status).toBe(201);
    expect(typeof res.body.receipt_id).toBe("number");
    const flag = (await request(app).get("/api/products?query=Flag")).body[0];
    expect(flag.stock).toBe(100);
  });

  it("rejects a receipt with no file (422)", async () => {
    const { app } = makeApp();
    const a = await makeProduct(app);
    const res = await request(app)
      .post("/api/stock-receipts")
      .field("lines", JSON.stringify([{ product_id: a.id, quantity: 5 }]));
    expect(res.status).toBe(422);
  });

  it("rejects empty lines (422)", async () => {
    const { app } = makeApp();
    const res = await request(app)
      .post("/api/stock-receipts")
      .field("lines", JSON.stringify([]))
      .attach("receipt", Buffer.from("fake"), { filename: "r.png", contentType: "image/png" });
    expect(res.status).toBe(422);
  });

  it("rejects a disallowed file type (422)", async () => {
    const { app } = makeApp();
    const a = await makeProduct(app);
    const res = await request(app)
      .post("/api/stock-receipts")
      .field("lines", JSON.stringify([{ product_id: a.id, quantity: 5 }]))
      .attach("receipt", Buffer.from("<html>"), { filename: "x.html", contentType: "text/html" });
    expect(res.status).toBe(422);
  });

  it("404s and rolls back when a product is missing", async () => {
    const { app } = makeApp();
    const a = await makeProduct(app);
    const res = await request(app)
      .post("/api/stock-receipts")
      .field("lines", JSON.stringify([
        { product_id: a.id, quantity: 5 },
        { product_id: 9999, quantity: 1 },
      ]))
      .attach("receipt", Buffer.from("fake"), { filename: "r.png", contentType: "image/png" });
    expect(res.status).toBe(404);
    const got = (await request(app).get(`/api/products?query=${a.id}`)).body[0];
    expect(got.stock).toBe(0);
  });

  it("derives the stored extension from the MIME type, not the filename (blocks stored XSS)", async () => {
    const { app, dataDir } = makeApp();
    const a = await makeProduct(app);
    const res = await request(app)
      .post("/api/stock-receipts")
      .field("lines", JSON.stringify([{ product_id: a.id, quantity: 1 }]))
      .attach("receipt", Buffer.from("<script>alert(1)</script>"), {
        filename: "evil.html",
        contentType: "image/png",
      });
    expect(res.status).toBe(201);
    const files = fs.readdirSync(path.join(dataDir, "receipts"));
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/\.png$/);
    expect(files[0]).not.toMatch(/\.html$/);
  });

  it("serves receipts with X-Content-Type-Options: nosniff", async () => {
    const { app, dataDir } = makeApp();
    const a = await makeProduct(app);
    await request(app)
      .post("/api/stock-receipts")
      .field("lines", JSON.stringify([{ product_id: a.id, quantity: 1 }]))
      .attach("receipt", Buffer.from("fake"), { filename: "r.png", contentType: "image/png" });
    const [name] = fs.readdirSync(path.join(dataDir, "receipts"));
    const res = await request(app).get(`/api/receipts/${name}`);
    expect(res.status).toBe(200);
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("returns 400 for a path-traversal receipt filename", async () => {
    const { app } = makeApp();
    const res = await request(app).get("/api/receipts/..%2Fanf.db");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid filename.");
  });
});
