import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { HttpError } from "../errors";

const ALLOWED = new Map<string, string>([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["application/pdf", ".pdf"],
]);

export function isAllowedReceipt(mime: string): boolean {
  return ALLOWED.has(mime);
}

export function ensureDataDirs(dataDir: string): void {
  fs.mkdirSync(path.join(dataDir, "receipts"), { recursive: true });
  fs.mkdirSync(path.join(dataDir, "orders"), { recursive: true });
}

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

// Derive the extension from the validated MIME type, never the user-supplied
// filename — otherwise an attacker can upload `evil.html` with an allowed MIME
// and have it served back as text/html (stored XSS).
export function receiptFilename(mime: string): string {
  const ext = ALLOWED.get(mime) ?? ".bin";
  const rand = crypto.randomBytes(2).toString("hex");
  return `receipt_${stamp()}_${rand}${ext}`;
}

export function orderPdfFilename(orderId: number): string {
  return `order_${orderId}_${stamp()}.pdf`;
}

export function saveReceiptBuffer(dataDir: string, mime: string, buf: Buffer): string {
  ensureDataDirs(dataDir);
  const name = receiptFilename(mime);
  fs.writeFileSync(path.join(dataDir, "receipts", name), buf);
  return name;
}

/** Resolve `filename` inside `dir`, throwing if it escapes the directory. */
export function safeResolve(dir: string, filename: string): string {
  const resolved = path.resolve(dir, filename);
  const base = path.resolve(dir);
  if (resolved !== base && !resolved.startsWith(base + path.sep)) {
    throw new HttpError(400, "Invalid filename.");
  }
  return resolved;
}
