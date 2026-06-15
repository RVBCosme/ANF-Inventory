import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api } from "../src/api/client";

describe("api.getHistory query building", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("includes action and range when provided", async () => {
    await api.getHistory({ action: "place_order", range: "1w" });
    expect(fetch).toHaveBeenCalledWith("/api/history?action=place_order&range=1w");
  });

  it("omits action when not provided", async () => {
    await api.getHistory({ range: "all" });
    expect(fetch).toHaveBeenCalledWith("/api/history?range=all");
  });

  it("hits the bare endpoint when given no options", async () => {
    await api.getHistory({});
    expect(fetch).toHaveBeenCalledWith("/api/history");
  });
});
