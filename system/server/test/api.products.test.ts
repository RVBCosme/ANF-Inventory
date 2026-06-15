import { describe, it, expect } from "vitest";
import request from "supertest";
import { makeApp } from "./helpers";

describe("products API", () => {
  it("creates, lists, updates, and soft-deletes a product", async () => {
    const { app } = makeApp();

    const created = await request(app)
      .post("/api/products")
      .send({ name: "Coffee 200g", unit_price: 18500 });
    expect(created.status).toBe(201);
    const id = created.body.id;

    const list = await request(app).get("/api/products");
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);

    const patched = await request(app).patch(`/api/products/${id}`).send({ unit_price: 19000 });
    expect(patched.status).toBe(200);
    expect(patched.body.unit_price).toBe(19000);

    const del = await request(app).delete(`/api/products/${id}`);
    expect(del.status).toBe(204);
    expect((await request(app).get("/api/products")).body).toHaveLength(0);
  });

  it("returns 422 for invalid input and 404 for a missing product", async () => {
    const { app } = makeApp();
    expect((await request(app).post("/api/products").send({ name: "", unit_price: -1 })).status).toBe(422);
    expect((await request(app).patch("/api/products/999").send({ unit_price: 1 })).status).toBe(404);
  });

  it("returns 400 for a malformed JSON body", async () => {
    const { app } = makeApp();
    const res = await request(app)
      .post("/api/products")
      .set("Content-Type", "application/json")
      .send('{not json');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Request body is not valid JSON.");
  });

  it("round-trips category and lists distinct categories", async () => {
    const { app } = makeApp();
    const created = await request(app)
      .post("/api/products")
      .send({ name: "Flag Pole", unit_price: 0, category: "Flags" });
    expect(created.status).toBe(201);
    expect(created.body.category).toBe("Flags");

    await request(app).post("/api/products").send({ name: "ANF Patch", unit_price: 0, category: "Patches" });

    const cats = await request(app).get("/api/products/categories");
    expect(cats.status).toBe(200);
    expect(cats.body).toEqual(["Flags", "Patches"]);

    const found = await request(app).get("/api/products?query=Flags");
    expect(found.body.map((p: any) => p.name)).toEqual(["Flag Pole"]);
  });
});
