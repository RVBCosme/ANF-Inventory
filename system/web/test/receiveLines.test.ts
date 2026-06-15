import { describe, it, expect } from "vitest";
import { addLine, setQty, removeLine, type ReceiveLine } from "../src/lib/receiveLines";

const flag = { id: 1, name: "Flag" };

describe("receiveLines", () => {
  it("adds a product as a line with qty 1 and is a no-op on duplicates", () => {
    let lines: ReceiveLine[] = [];
    lines = addLine(lines, flag);
    lines = addLine(lines, flag);
    expect(lines).toHaveLength(1);
    expect(lines[0].qty).toBe(1);
  });

  it("sets quantity with a floor of 1 and no stock ceiling", () => {
    let lines = addLine([], flag);
    lines = setQty(lines, 1, 500);
    expect(lines[0].qty).toBe(500);
    lines = setQty(lines, 1, 0);
    expect(lines[0].qty).toBe(1);
    lines = setQty(lines, 1, 2_000_000);
    expect(lines[0].qty).toBe(1_000_000); // capped at MAX_QTY
  });

  it("removes a line", () => {
    let lines = addLine([], flag);
    lines = removeLine(lines, 1);
    expect(lines).toHaveLength(0);
  });
});
