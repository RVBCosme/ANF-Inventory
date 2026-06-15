import type { DB } from "../db";
import type { LogAction } from "@anf/shared";
import { nowIso } from "../lib/time";

interface LogContext {
  product_id?: number;
  order_id?: number;
  receipt_filename?: string;
}

export function writeLog(db: DB, action: LogAction, summary: string, ctx: LogContext = {}): void {
  db.prepare(
    `INSERT INTO logs (action, summary, product_id, order_id, receipt_filename, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    action,
    summary,
    ctx.product_id ?? null,
    ctx.order_id ?? null,
    ctx.receipt_filename ?? null,
    nowIso(),
  );
}
