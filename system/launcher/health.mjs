// Poll an async health probe until it succeeds or the attempts run out.
// Pure control flow — `probe` and `sleep` are injected — so it is unit-testable
// without real timers or network access. Used by launch.mjs to wait for the
// server to answer before opening the app over http:// (sidestepping the
// browser's file:// restrictions on the splash's own probe).

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function waitForHealthy(
  probe,
  { attempts = 60, delayMs = 1000, sleep = defaultSleep } = {},
) {
  for (let i = 0; i < attempts; i += 1) {
    if (await probe()) return true;
    if (i < attempts - 1) await sleep(delayMs);
  }
  return false;
}
