import { describe, it, expect, vi } from "vitest";
import { stopAnf } from "../stop.mjs";

describe("stopAnf", () => {
  it("kills the PID LISTENING on ANF's port", async () => {
    const kill = vi.fn();
    const log = vi.fn();
    const netstat = () => "  TCP    127.0.0.1:4001   0.0.0.0:0   LISTENING   4321\r\n";
    const result = await stopAnf({ findAnf: async () => 4001, netstat, kill, log });
    expect(result).toBe(true);
    expect(kill).toHaveBeenCalledWith("4321");
    expect(log).toHaveBeenCalledWith("ANF Inventory has been stopped.");
  });

  it("no-ops when ANF is not running", async () => {
    const kill = vi.fn();
    const log = vi.fn();
    const result = await stopAnf({ findAnf: async () => null, netstat: () => "", kill, log });
    expect(result).toBe(false);
    expect(kill).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith("ANF Inventory was not running.");
  });

  it("no-ops when ANF's port has no LISTENING PID", async () => {
    const kill = vi.fn();
    const result = await stopAnf({
      findAnf: async () => 4001,
      netstat: () => "nothing useful here",
      kill,
      log: () => {},
    });
    expect(result).toBe(false);
    expect(kill).not.toHaveBeenCalled();
  });
});
