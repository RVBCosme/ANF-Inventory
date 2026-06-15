import type {
  Product,
  LogEntry,
  OrderResult,
  LogAction,
  HistoryRange,
  ReceiveStockResult,
} from "@anf/shared";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listProducts: (query?: string) =>
    fetch(`/api/products${query ? `?query=${encodeURIComponent(query)}` : ""}`).then(json<Product[]>),

  createProduct: (name: string, unit_price: number, category: string) =>
    fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, unit_price, category }),
    }).then(json<Product>),

  updateProduct: (id: number, data: { name?: string; unit_price?: number; category?: string }) =>
    fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(json<Product>),

  listCategories: (): Promise<string[]> =>
    fetch("/api/products/categories").then(json<string[]>),

  deleteProduct: async (id: number) => {
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Delete failed");
  },

  receiveStock: (lines: { product_id: number; quantity: number }[], receipt: File) => {
    const form = new FormData();
    form.append("lines", JSON.stringify(lines));
    form.append("receipt", receipt);
    return fetch("/api/stock-receipts", { method: "POST", body: form }).then(json<ReceiveStockResult>);
  },

  placeOrder: (items: { product_id: number; quantity: number }[]) =>
    fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    }).then(json<OrderResult>),

  getHistory: (opts: { action?: LogAction; range?: HistoryRange } = {}) => {
    const qs = new URLSearchParams();
    if (opts.action) qs.set("action", opts.action);
    if (opts.range) qs.set("range", opts.range);
    const suffix = qs.toString();
    return fetch(`/api/history${suffix ? `?${suffix}` : ""}`).then(json<LogEntry[]>);
  },
};
