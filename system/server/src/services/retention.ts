import fs from "node:fs";
import path from "node:path";
import type { DB } from "../db";

const RETENTION_DAYS = 365;
const RETENTION_WINDOW_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

export function purgeOldRecords(db: DB, dataDir: string, now: Date = new Date()): void {
  const cutoff = new Date(now.getTime() - RETENTION_WINDOW_MS).toISOString();

  const removeFiles = db.transaction(() => {
    const receipts = (
      db
        .prepare("SELECT receipt_filename AS f FROM stock_receipts WHERE created_at < ?")
        .all(cutoff) as { f: string }[]
    ).map((r) => r.f);
    const pdfs = (
      db.prepare("SELECT pdf_filename AS f FROM orders WHERE created_at < ?").all(cutoff) as {
        f: string;
      }[]
    )
      .map((r) => r.f)
      .filter(Boolean);

    db.prepare("DELETE FROM orders WHERE created_at < ?").run(cutoff);
    db.prepare("DELETE FROM stock_receipts WHERE created_at < ?").run(cutoff); // cascades stock_additions
    db.prepare("DELETE FROM logs WHERE created_at < ?").run(cutoff);
    return { receipts, pdfs };
  });

  const { receipts, pdfs } = removeFiles();
  for (const f of receipts) rm(path.join(dataDir, "receipts", f));
  for (const f of pdfs) rm(path.join(dataDir, "orders", f));

  sweepOrphans(db, path.join(dataDir, "receipts"), "SELECT receipt_filename AS f FROM stock_receipts");
  sweepOrphans(db, path.join(dataDir, "orders"), "SELECT pdf_filename AS f FROM orders");
}

function rm(p: string): void {
  try {
    fs.rmSync(p, { force: true });
  } catch {
    /* already gone */
  }
}

function sweepOrphans(db: DB, dir: string, selectSql: string): void {
  if (!fs.existsSync(dir)) return;
  const referenced = new Set(
    (db.prepare(selectSql).all() as { f: string }[]).map((r) => r.f).filter(Boolean),
  );
  for (const file of fs.readdirSync(dir)) {
    if (!referenced.has(file)) rm(path.join(dir, file));
  }
}
