import { useEffect, useRef, useState } from "react";
import type { LogEntry, LogAction, HistoryRange } from "@anf/shared";
import { LOG_ACTION_FILTERS, HISTORY_RANGES } from "@anf/shared";
import { api } from "../api/client";
import { Button } from "../components/Button";
import { Banner } from "../components/Banner";

const HISTORY_LIMIT = 100; // server's default cap; drives the "showing latest" note
const selectClass = "rounded-lg border-2 border-line px-4 py-3 text-lg";

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function HistoryPage() {
  const [type, setType] = useState<LogAction | "all">("all");
  const [range, setRange] = useState<HistoryRange>("all");
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  useEffect(() => {
    const id = ++reqId.current;
    setError(null);
    api
      .getHistory({ action: type === "all" ? undefined : type, range })
      .then((rows) => {
        if (id === reqId.current) setEntries(rows);
      })
      .catch((e) => {
        if (id === reqId.current) setError((e as Error).message);
      });
  }, [type, range]);

  const capped = entries.length === HISTORY_LIMIT;

  return (
    <section>
      <h2 className="mb-4 text-3xl font-bold">History</h2>

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          className={selectClass}
          aria-label="Filter by type"
          value={type}
          onChange={(e) => setType(e.target.value as LogAction | "all")}
        >
          <option value="all">All types</option>
          {LOG_ACTION_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        <select
          className={selectClass}
          aria-label="Filter by time range"
          value={range}
          onChange={(e) => setRange(e.target.value as HistoryRange)}
        >
          {HISTORY_RANGES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="mb-4"><Banner kind="danger">{error}</Banner></div>}

      <ul className="divide-y divide-divider rounded-lg border-2 border-line">
        {entries.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-4 p-4">
            <div>
              <div className="text-muted">{formatWhen(e.created_at)}</div>
              <div className="text-lg">{e.summary}</div>
            </div>
            {e.order_id && (
              <a href={`/api/orders/${e.order_id}/pdf`} target="_blank" rel="noreferrer">
                <Button variant="secondary">Open PDF</Button>
              </a>
            )}
            {e.receipt_filename && (
              <a href={`/api/receipts/${e.receipt_filename}`} target="_blank" rel="noreferrer">
                <Button variant="secondary">Open receipt</Button>
              </a>
            )}
          </li>
        ))}
        {entries.length === 0 && (
          <li className="p-6 text-center text-muted">No activity for this filter.</li>
        )}
      </ul>

      {capped && (
        <p className="mt-3 text-center text-muted">
          Showing the latest {HISTORY_LIMIT} — narrow the time range to see more.
        </p>
      )}
    </section>
  );
}
