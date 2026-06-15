export interface Product {
  id: number;
  name: string;
  unit_price: number; // centavos
  stock: number;
  category: string; // '' = Uncategorized
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export const LOG_ACTIONS = ["add_item", "edit_item", "delete_item", "add_stock", "place_order"] as const;
export type LogAction = (typeof LOG_ACTIONS)[number];

export interface LogEntry {
  id: number;
  action: LogAction;
  summary: string;
  product_id: number | null;
  order_id: number | null;
  receipt_filename: string | null;
  created_at: string;
}

export interface OrderResult {
  id: number;
  total: number; // centavos
  pdf_filename: string;
}

export interface StockConflictLine {
  product_id: number;
  requested: number;
  available: number;
}

export interface ReceiveStockResult {
  receipt_id: number;
  receipt_filename: string;
}
