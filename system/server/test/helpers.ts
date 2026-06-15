import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach } from "vitest";
import { openDb } from "../src/db";
import { createApp } from "../src/app";

// Temp dirs created by the helpers below; removed in afterEach (same pattern as
// launcher/test/setup-check.test.mjs). maxRetries rides out transient Windows
// file locks on just-written PDFs/receipts.
const temps: string[] = [];

afterEach(() => {
  for (const dir of temps.splice(0)) fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
});

/** mkdtemp under the OS temp dir, auto-removed after each test. */
export function tmpDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  temps.push(dir);
  return dir;
}

/** Create an isolated temp data dir with receipts/ and orders/ subfolders. */
export function tmpDataDir(): string {
  const dir = tmpDir("anf-test-");
  fs.mkdirSync(path.join(dir, "receipts"), { recursive: true });
  fs.mkdirSync(path.join(dir, "orders"), { recursive: true });
  return dir;
}

export function makeApp() {
  const db = openDb(":memory:");
  const dataDir = tmpDataDir();
  const app = createApp(db, dataDir);
  return { app, db, dataDir };
}
