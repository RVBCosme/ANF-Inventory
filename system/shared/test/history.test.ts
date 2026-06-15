import { describe, it, expect } from "vitest";
import { LOG_ACTIONS } from "../src/types";
import { HISTORY_RANGES, HISTORY_RANGE_VALUES, LOG_ACTION_FILTERS } from "../src/history";

describe("history filter tables", () => {
  it("exposes 7 time ranges, 'all' last with no day-bound", () => {
    expect(HISTORY_RANGE_VALUES).toEqual(["1d", "3d", "1w", "1m", "3m", "6m", "all"]);
    expect(HISTORY_RANGES).toHaveLength(7);
    expect(HISTORY_RANGES[HISTORY_RANGES.length - 1].value).toBe("all");
    expect(HISTORY_RANGES.find((r) => r.value === "all")?.days).toBeNull();
    expect(HISTORY_RANGES.find((r) => r.value === "1w")?.days).toBe(7);
    expect(HISTORY_RANGES.find((r) => r.value === "6m")?.days).toBe(180);
  });

  it("has exactly one filter label per LogAction", () => {
    expect(LOG_ACTION_FILTERS.map((f) => f.value).sort()).toEqual([...LOG_ACTIONS].sort());
    expect(LOG_ACTION_FILTERS.find((f) => f.value === "place_order")?.label).toBe("Orders");
    expect(LOG_ACTION_FILTERS.find((f) => f.value === "add_stock")?.label).toBe("Stock Added");
    expect(LOG_ACTION_FILTERS.find((f) => f.value === "add_item")?.label).toBe("New Product");
  });
});
