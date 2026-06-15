import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { tmpDataDir } from "./helpers";
import {
  ensureDataDirs,
  receiptFilename,
  saveReceiptBuffer,
  safeResolve,
  isAllowedReceipt,
} from "../src/lib/files";

describe("file helpers", () => {
  it("builds a unique receipt filename with an extension derived from the MIME type", () => {
    const a = receiptFilename("image/jpeg");
    const b = receiptFilename("image/jpeg");
    expect(a).toMatch(/^receipt_.*\.jpg$/);
    expect(a).not.toBe(b);
    // Unknown MIME falls back to a neutral, non-executable extension.
    expect(receiptFilename("text/html")).toMatch(/\.bin$/);
  });

  it("allows jpg/png/pdf and rejects others", () => {
    expect(isAllowedReceipt("image/jpeg")).toBe(true);
    expect(isAllowedReceipt("application/pdf")).toBe(true);
    expect(isAllowedReceipt("text/html")).toBe(false);
  });

  it("writes a receipt buffer into receipts/ and returns the filename", () => {
    const dir = tmpDataDir();
    const name = saveReceiptBuffer(dir, "image/png", Buffer.from("x"));
    expect(fs.existsSync(path.join(dir, "receipts", name))).toBe(true);
  });

  it("safeResolve blocks path traversal", () => {
    const dir = tmpDataDir();
    expect(() => safeResolve(path.join(dir, "receipts"), "../../etc/passwd")).toThrow();
    const ok = safeResolve(path.join(dir, "receipts"), "0001_x.jpg");
    expect(ok.startsWith(path.join(dir, "receipts"))).toBe(true);
  });
});
