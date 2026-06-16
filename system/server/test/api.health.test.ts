import { describe, it, expect } from "vitest";
import request from "supertest";
import { makeApp } from "./helpers";

describe("health API", () => {
  it("identifies itself as ANF so the launcher recognizes its own instance", async () => {
    const { app } = makeApp();
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, app: "anf-inventory" });
  });
});
