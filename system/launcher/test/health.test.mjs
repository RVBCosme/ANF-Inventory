import { describe, it, expect } from "vitest";
import { waitForHealthy } from "../health.mjs";

// Inject a no-op sleep so the tests exercise the polling logic without real timers.
const noSleep = () => Promise.resolve();

describe("waitForHealthy", () => {
  it("resolves true immediately when the first probe succeeds", async () => {
    let calls = 0;
    const probe = async () => {
      calls += 1;
      return true;
    };
    expect(await waitForHealthy(probe, { attempts: 5, sleep: noSleep })).toBe(true);
    expect(calls).toBe(1);
  });

  it("keeps polling until a later probe succeeds", async () => {
    let calls = 0;
    const probe = async () => {
      calls += 1;
      return calls >= 3;
    };
    expect(await waitForHealthy(probe, { attempts: 5, sleep: noSleep })).toBe(true);
    expect(calls).toBe(3);
  });

  it("resolves false after exhausting all attempts", async () => {
    let calls = 0;
    const probe = async () => {
      calls += 1;
      return false;
    };
    expect(await waitForHealthy(probe, { attempts: 4, sleep: noSleep })).toBe(false);
    expect(calls).toBe(4);
  });

  it("waits between attempts but not after the final one", async () => {
    let sleeps = 0;
    const sleep = () => {
      sleeps += 1;
      return Promise.resolve();
    };
    await waitForHealthy(async () => false, { attempts: 3, sleep });
    expect(sleeps).toBe(2);
  });
});
