import { useEffect, useState } from "react";
import type { Product } from "@anf/shared";
import { formatPeso } from "@anf/shared";
import { api } from "../api/client";
import { addLine, removeLine, setQty, type ReceiveLine } from "../lib/receiveLines";
import { filterProducts, byCategory, distinctCategories } from "../lib/productSearch";
import { Button } from "../components/Button";
import { Banner } from "../components/Banner";
import { ConfirmDialog } from "../components/ConfirmDialog";

export function ReceiveStockPage() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [lines, setLines] = useState<ReceiveLine[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [received, setReceived] = useState<{ filename: string } | null>(null);
  const [confirming, setConfirming] = useState(false);

  const loadProducts = async () => {
    try {
      const rows = await api.listProducts("");
      setAllProducts([...rows].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const add = (p: Product) => {
    setError(null);
    setLines((ls) => addLine(ls, { id: p.id, name: p.name }));
  };

  const receive = async () => {
    setError(null);
    if (!file) {
      setError("Attach a receipt (JPG, PNG, or PDF).");
      return;
    }
    try {
      const res = await api.receiveStock(
        lines.map((l) => ({ product_id: l.id, quantity: l.qty })),
        file,
      );
      setReceived({ filename: res.receipt_filename });
      setLines([]);
      setSearch("");
      setFile(null);
      await loadProducts();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const categories = distinctCategories(allProducts);
  const hasUncategorized = allProducts.some((p) => p.category === "");
  const visible = filterProducts(byCategory(allProducts, categoryFilter), search);
  const canReceive = lines.length > 0 && file !== null;

  return (
    <section>
      <h2 className="mb-4 text-3xl font-bold">Receive Stock</h2>

      {received && (
        <div className="mb-4 flex items-center gap-4">
          <Banner kind="ok">Stock received.</Banner>
          <a href={`/api/receipts/${received.filename}`} target="_blank" rel="noreferrer">
            <Button>Open receipt</Button>
          </a>
        </div>
      )}
      {error && <div className="mb-4"><Banner kind="warn">{error}</Banner></div>}

      <div className="mb-3 flex flex-wrap gap-3">
        <select
          className="rounded-lg border-2 border-line px-4 py-3 text-lg"
          aria-label="Filter by category"
          value={categoryFilter === null ? "__all__" : categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value === "__all__" ? null : e.target.value)}
        >
          <option value="__all__">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
          {hasUncategorized && <option value="">Uncategorized</option>}
        </select>

        <input
          className="flex-1 rounded-lg border-2 border-line px-4 py-3 text-lg"
          placeholder="Search product by name or ID…"
          aria-label="Search product by name or ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <ul
        aria-label="Products"
        className="mb-6 max-h-80 divide-y divide-divider overflow-y-auto rounded-lg border-2 border-line"
      >
        {visible.map((p) => (
          <li key={p.id} className="flex items-center justify-between p-3 text-lg">
            <span>
              <span className="font-mono">{String(p.id).padStart(4, "0")}</span> {p.name} ·{" "}
              {formatPeso(p.unit_price)} · In stock: {p.stock}
            </span>
            <Button onClick={() => add(p)}>Add</Button>
          </li>
        ))}
        {visible.length === 0 && (
          <li className="p-6 text-center text-muted">
            {allProducts.length === 0
              ? "No products yet — add them on the Products tab."
              : "No products match your search."}
          </li>
        )}
      </ul>

      <table className="w-full border-collapse text-lg">
        <thead>
          <tr className="bg-line text-left">
            <th className="p-3">ID</th>
            <th className="p-3">Name</th>
            <th className="p-3 text-center">Qty to add</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.id} className="border-b border-divider">
              <td className="p-3 font-mono">{String(l.id).padStart(4, "0")}</td>
              <td className="p-3">{l.name}</td>
              <td className="p-3 text-center">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  aria-label={`Quantity for ${l.name}`}
                  className="w-28 rounded-lg border-2 border-line px-3 py-2 text-center text-lg"
                  value={l.qty}
                  onChange={(e) => setLines((ls) => setQty(ls, l.id, Number(e.target.value)))}
                />
              </td>
              <td className="p-3 text-right">
                <Button variant="secondary" onClick={() => setLines((ls) => removeLine(ls, l.id))}>
                  Remove
                </Button>
              </td>
            </tr>
          ))}
          {lines.length === 0 && (
            <tr>
              <td colSpan={4} className="p-6 text-center text-muted">
                Pick products above to receive stock.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <label className="flex-1">
          <span className="mb-1 block text-lg font-semibold">Receipt (JPG, PNG, or PDF)</span>
          <input
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-lg"
          />
        </label>
        <Button disabled={!canReceive} onClick={() => setConfirming(true)}>
          Receive Stock
        </Button>
      </div>

      {confirming && (
        <ConfirmDialog
          title="Receive stock"
          message={`Receive stock for ${lines.length} product${lines.length > 1 ? "s" : ""}? Stock will increase.`}
          confirmLabel="Yes, receive"
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            receive();
          }}
        />
      )}
    </section>
  );
}
