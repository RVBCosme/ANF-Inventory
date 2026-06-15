import type { LogAction } from "./types";

export const HISTORY_RANGE_VALUES = ["1d", "3d", "1w", "1m", "3m", "6m", "all"] as const;
export type HistoryRange = (typeof HISTORY_RANGE_VALUES)[number];

/** Ordered for the dropdown; `days: null` means "no time bound" (all time). */
export const HISTORY_RANGES: readonly { value: HistoryRange; label: string; days: number | null }[] = [
  { value: "1d", label: "Last 24 hours", days: 1 },
  { value: "3d", label: "Last 3 days", days: 3 },
  { value: "1w", label: "Last week", days: 7 },
  { value: "1m", label: "Last month", days: 30 },
  { value: "3m", label: "Last 3 months", days: 90 },
  { value: "6m", label: "Last 6 months", days: 180 },
  { value: "all", label: "All time", days: null },
];

/** Ordered for the dropdown; one entry per LogAction. */
export const LOG_ACTION_FILTERS: readonly { value: LogAction; label: string }[] = [
  { value: "place_order", label: "Orders" },
  { value: "add_item", label: "New Product" },
  { value: "add_stock", label: "Stock Added" },
  { value: "edit_item", label: "Edited" },
  { value: "delete_item", label: "Deleted" },
];
