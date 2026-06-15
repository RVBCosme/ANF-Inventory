import { useEffect, useRef, useState } from "react";
import type { Product } from "@anf/shared";
import { formatPeso, pesosToCentavos } from "@anf/shared";
import { api } from "../api/client";
import { Button } from "../components/Button";
import { Banner } from "../components/Banner";
import { Modal } from "../components/Modal";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { TextField } from "../components/TextField";
import { NumberField } from "../components/NumberField";

type Dialog =
  | { kind: "add" }
  | { kind: "edit"; product: Product }
  | { kind: "delete"; product: Product }
  | null;

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [find, setFind] = useState("");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  const refresh = (q = find) => {
    const id = ++reqId.current;
    return api
      .listProducts(q)
      .then((rows) => {
        if (id === reqId.current) setProducts(rows);
      })
      .catch((e) => {
        if (id === reqId.current) setError((e as Error).message);
      });
  };
  const refreshCategories = () => api.listCategories().then(setCategories).catch(() => {});

  useEffect(() => {
    refresh("");
    refreshCategories();
  }, []);

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      setDialog(null);
      await refresh();
      await refreshCategories();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-3xl font-bold">Products</h2>
        <Button onClick={() => setDialog({ kind: "add" })}>+ Add Product</Button>
      </div>

      <input
        className="mb-4 w-full rounded-lg border-2 border-line px-4 py-3 text-lg"
        placeholder="Find a product by name, category, or ID…"
        aria-label="Find a product"
        value={find}
        onChange={(e) => {
          setFind(e.target.value);
          refresh(e.target.value);
        }}
      />

      {error && <div className="mb-4"><Banner kind="danger">{error}</Banner></div>}

      <table className="w-full border-collapse text-lg">
        <thead>
          <tr className="bg-line text-left">
            <th className="p-3">ID</th>
            <th className="w-full p-3">Product Name</th>
            <th className="whitespace-nowrap p-3">Category</th>
            <th className="whitespace-nowrap p-3 text-right">Unit Price</th>
            <th className="whitespace-nowrap p-3 text-right">Stock</th>
            <th className="whitespace-nowrap p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="border-b border-divider">
              <td className="p-3 font-mono">{String(p.id).padStart(4, "0")}</td>
              <td className="w-full p-3">{p.name}</td>
              <td className="whitespace-nowrap p-3 text-muted">{p.category}</td>
              <td className="whitespace-nowrap p-3 text-right font-semibold">{formatPeso(p.unit_price)}</td>
              <td className="whitespace-nowrap p-3 text-right font-bold">
                {p.stock === 0 ? <span className="text-danger">‼ 0</span> : p.stock}
              </td>
              <td className="whitespace-nowrap p-3">
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setDialog({ kind: "edit", product: p })}>
                    Edit
                  </Button>
                  <Button variant="danger" onClick={() => setDialog({ kind: "delete", product: p })}>
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {products.length === 0 && (
            <tr>
              <td colSpan={6} className="p-6 text-center text-muted">
                No products yet. Tap "+ Add Product" to begin.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {dialog?.kind === "add" && (
        <ProductForm
          title="Add Product"
          question="Add this product?"
          categories={categories}
          onCancel={() => setDialog(null)}
          onSubmit={(name, pesos, category) =>
            run(() => api.createProduct(name, pesosToCentavos(pesos), category))
          }
        />
      )}
      {dialog?.kind === "edit" && (
        <ProductForm
          title="Edit Product"
          question="Save these changes?"
          categories={categories}
          initialName={dialog.product.name}
          initialPesos={dialog.product.unit_price / 100}
          initialCategory={dialog.product.category}
          onCancel={() => setDialog(null)}
          onSubmit={(name, pesos, category) =>
            run(() =>
              api.updateProduct(dialog.product.id, {
                name,
                unit_price: pesosToCentavos(pesos),
                category,
              }),
            )
          }
        />
      )}
      {dialog?.kind === "delete" && (
        <ConfirmDialog
          title="Delete product"
          message={`Delete "${dialog.product.name}"? It is removed from your products. Past orders that include it are kept.`}
          confirmLabel="Delete"
          danger
          onCancel={() => setDialog(null)}
          onConfirm={() => run(() => api.deleteProduct(dialog.product.id))}
        />
      )}
    </section>
  );
}

function ProductForm({
  title,
  question,
  categories,
  initialName = "",
  initialPesos = 0,
  initialCategory = "",
  onSubmit,
  onCancel,
}: {
  title: string;
  question: string;
  categories: string[];
  initialName?: string;
  initialPesos?: number;
  initialCategory?: string;
  onSubmit: (name: string, pesos: number, category: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [pesos, setPesos] = useState(String(initialPesos || ""));
  const [category, setCategory] = useState(initialCategory);
  const [confirming, setConfirming] = useState(false);
  const valid = name.trim().length > 0 && pesos !== "" && Number(pesos) >= 0;

  return (
    <Modal title={title} onClose={onCancel}>
      {!confirming ? (
        <>
          <TextField label="Product name" value={name} onChange={(e) => setName(e.target.value)} />
          <NumberField label="Unit price (₱)" value={pesos} onChange={(e) => setPesos(e.target.value)} />
          <TextField
            label="Category"
            list="category-options"
            placeholder="e.g. Flags (optional)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <datalist id="category-options">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onCancel}>Cancel</Button>
            <Button disabled={!valid} onClick={() => setConfirming(true)}>Save</Button>
          </div>
        </>
      ) : (
        <>
          <p className="mb-6 text-lg">
            {question}
            <br />
            <span className="font-semibold">{name.trim()}</span> at{" "}
            <span className="font-semibold">{formatPeso(pesosToCentavos(Number(pesos)))}</span>
            {category.trim() && (
              <>
                {" "}
                · <span className="font-semibold">{category.trim()}</span>
              </>
            )}
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setConfirming(false)}>Back</Button>
            <Button onClick={() => onSubmit(name.trim(), Number(pesos), category.trim())}>Confirm</Button>
          </div>
        </>
      )}
    </Modal>
  );
}
