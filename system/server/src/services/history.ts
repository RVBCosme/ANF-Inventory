import type { DB } from "../db";
import type { LogAction, HistoryRange, LogEntry } from "@anf/shared";
import { HISTORY_RANGES } from "@anf/shared";

export interface HistoryQuery {
  action?: LogAction;
  range?: HistoryRange;
  limit?: number;
}

export function listHistory(db: DB, opts: HistoryQuery = {}): LogEntry[] {
  const { action, range = "all", limit = 100 } = opts;
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (action) {
    clauses.push("action = ?");
    params.push(action);
  }

  const days = HISTORY_RANGES.find((r) => r.value === range)?.days ?? null;
  if (days != null) {
    clauses.push("created_at >= ?");
    params.push(new Date(Date.now() - days * 86_400_000).toISOString());
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  params.push(limit);
  return db.prepare(`SELECT * FROM logs ${where} ORDER BY id DESC LIMIT ?`).all(...params) as LogEntry[];
}
