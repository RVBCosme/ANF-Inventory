import { useEffect, useState } from "react";
import type { Product } from "@anf/shared";
import { formatPeso } from "@anf/shared";
import { api } from "../api/client";
import { addToCart, removeFromCart, setQty, cartTotal, type CartLine } from "../lib/cart";
import { filterProducts, byCategory, distinctCategories, sellableProducts } from "../lib/productSearch";
import { Button } from "../components/Button";
import { Banner } from "../components/Banner";
import { ConfirmDialog } from "../components/ConfirmDialog";

// Shared column tracks for the product picker so the header and every row line
// up into the same ID · Name · Price · Stock · Add grid (like the Products table).
const PICKER_COLS =
  "grid grid-cols-[3.5rem_minmax(0,1fr)_7rem_8.5rem_5.5rem] items-center gap-x-3";

export function OrderPage() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [placedPdfId, setPlacedPdfId] = useState<number | null>(null);
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
    if (p.stock === 0) {
      setError(`${p.name} is out of stock — it can't be added.`);
      return;
    }
    setError(null);
    setCart((c) => addToCart(c, p));
  };

  const place = async () => {
    setError(null);
    try {
      const res = await api.placeOrder(cart.map((l) => ({ product_id: l.id, quantity: l.qty })));
      setPlacedPdfId(res.id);
      setCart([]);
      setSearch("");
      await loadProducts();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const orderable = sellableProducts(allProducts);
  const categories = distinctCategories(orderable);
  const hasUncategorized = orderable.some((p) => p.category === "");
  const visible = filterProducts(byCategory(orderable, categoryFilter), search);
  const total = cartTotal(cart);

  return (
    <section>
      <h2 className="mb-4 text-3xl font-bold">New Order</h2>

      {placedPdfId && (
        <div className="mb-4 flex items-center gap-4">
          <Banner kind="ok">Order #{placedPdfId} placed.</Banner>
          <a href={`/api/orders/${placedPdfId}/pdf`} target="_blank" rel="noreferrer">
            <Button>Open / Print PDF</Button>
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
            <option key={c} value={c}>
              {c}
            </option>
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
        {visible.length > 0 && (
          <li
            aria-hidden="true"
            className={`${PICKER_COLS} sticky top-0 z-10 bg-line px-4 py-2 text-base font-semibold text-muted`}
          >
            <span>ID</span>
            <span>Product</span>
            <span className="text-right">Price</span>
            <span className="text-right">Stock</span>
            <span />
          </li>
        )}
        {visible.map((p) => (
          <li
            key={p.id}
            className={`${PICKER_COLS} px-4 py-2 text-lg transition-colors hover:bg-line/40`}
          >
            <span className="font-mono text-muted">{String(p.id).padStart(4, "0")}</span>
            <span className="min-w-0 break-words">{p.name}</span>
            <span className="text-right font-semibold">{formatPeso(p.unit_price)}</span>
            <span className="text-right">
              {p.stock === 0 ? (
                <span className="font-semibold text-danger">Out of stock</span>
              ) : (
                <>
                  <span className="font-semibold">{p.stock}</span>{" "}
                  <span className="text-muted">in stock</span>
                </>
              )}
            </span>
            <div className="justify-self-end">
              <Button disabled={p.stock === 0} onClick={() => add(p)}>
                Add
              </Button>
            </div>
          </li>
        ))}
        {visible.length === 0 && (
          <li className="px-4 py-6 text-center text-muted">
            {orderable.length === 0
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
            <th className="p-3 text-right">Unit Price</th>
            <th className="p-3 text-center">Qty</th>
            <th className="p-3 text-right">Amount</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          {cart.map((l) => (
            <tr key={l.id} className="border-b border-divider">
              <td className="p-3 font-mono">{String(l.id).padStart(4, "0")}</td>
              <td className="p-3">{l.name}</td>
              <td className="p-3 text-right">{formatPeso(l.unit_price)}</td>
              <td className="p-3">
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="secondary"
                    aria-label={`Decrease ${l.name}`}
                    onClick={() => setCart((c) => setQty(c, l.id, l.qty - 1))}
                  >
                    −
                  </Button>
                  <span className="w-10 text-center text-xl font-bold" aria-live="polite">
                    {l.qty}
                  </span>
                  <Button
                    variant="secondary"
                    aria-label={`Increase ${l.name}`}
                    disabled={l.qty >= l.stock}
                    onClick={() => setCart((c) => setQty(c, l.id, l.qty + 1))}
                  >
                    +
                  </Button>
                </div>
              </td>
              <td className="p-3 text-right font-semibold">{formatPeso(l.unit_price * l.qty)}</td>
              <td className="p-3 text-right">
                <Button variant="secondary" onClick={() => setCart((c) => removeFromCart(c, l.id))}>
                  Remove
                </Button>
              </td>
            </tr>
          ))}
          {cart.length === 0 && (
            <tr>
              <td colSpan={6} className="p-6 text-center text-muted">
                Pick products above to start an order.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="mt-6 flex items-center justify-end gap-6">
        <span className="text-2xl font-bold">TOTAL: {formatPeso(total)}</span>
        <Button disabled={cart.length === 0} onClick={() => setConfirming(true)}>
          Place Order
        </Button>
      </div>

      {confirming && (
        <ConfirmDialog
          title="Place order"
          message={`Place this order for ${formatPeso(total)}? Stock will be reduced.`}
          confirmLabel="Place Order"
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            place();
          }}
        />
      )}
    </section>
  );
}
