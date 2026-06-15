import { useState } from "react";
import anfLogo from "./assets/anf-logo.png";
import { ProductsPage } from "./pages/ProductsPage";
import { ReceiveStockPage } from "./pages/ReceiveStockPage";
import { OrderPage } from "./pages/OrderPage";
import { HistoryPage } from "./pages/HistoryPage";

type Tab = "products" | "receive" | "order" | "history";

const TABS: { id: Tab; label: string }[] = [
  { id: "products", label: "Products" },
  { id: "receive", label: "Receive Stock" },
  { id: "order", label: "New Order" },
  { id: "history", label: "History" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("products");
  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center gap-3 bg-surface px-6 py-4 shadow">
        <img
          src={anfLogo}
          alt="Adoración Nocturna Filipina logo"
          className="h-12 w-auto select-none"
        />
        <h1 className="mr-4 text-2xl font-bold">ANF Inventory</h1>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`min-h-[48px] rounded-lg px-5 text-lg font-semibold ${
              tab === t.id ? "bg-primary text-white" : "bg-line text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </header>
      <main className="mx-auto max-w-5xl p-6">
        {tab === "products" && <ProductsPage />}
        {tab === "receive" && <ReceiveStockPage />}
        {tab === "order" && <OrderPage />}
        {tab === "history" && <HistoryPage />}
      </main>
    </div>
  );
}
