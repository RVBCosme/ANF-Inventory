import { describe, it, expect, vi, afterEach } from "vitest";
import { api } from "../src/api/client";

afterEach(() => vi.unstubAllGlobals());

describe("api.receiveStock", () => {
  it("POSTs FormData with lines + receipt to /api/stock-receipts", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ receipt_id: 1, receipt_filename: "r.png" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const file = new File(["x"], "r.png", { type: "image/png" });
    const res = await api.receiveStock([{ product_id: 3, quantity: 9 }], file);

    expect(res).toEqual({ receipt_id: 1, receipt_filename: "r.png" });
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/stock-receipts");
    expect(opts.method).toBe("POST");
    expect(opts.body).toBeInstanceOf(FormData);
    expect((opts.body as FormData).get("lines")).toBe(
      JSON.stringify([{ product_id: 3, quantity: 9 }]),
    );
    expect((opts.body as FormData).get("receipt")).toBeInstanceOf(File);
  });
});
