import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

const { listProducts, placeOrder } = vi.hoisted(() => ({
  listProducts: vi.fn(),
  placeOrder: vi.fn(),
}));
vi.mock("../src/api/client", () => ({ api: { listProducts, placeOrder } }));

import { OrderPage } from "../src/pages/OrderPage";

const make = (id: number, name: string, stock = 5, category = "") => ({
  id,
  name,
  unit_price: 1000,
  stock,
  category,
  created_at: "",
  updated_at: "",
  deleted_at: null,
});

describe("OrderPage product browsing", () => {
  beforeEach(() => {
    listProducts.mockReset();
    placeOrder.mockReset();
    listProducts.mockResolvedValue([make(1, "Logo"), make(2, "Pen"), make(3, "Eraser", 0)]);
  });

  it("shows all products on mount without searching", async () => {
    render(<OrderPage />);
    const list = screen.getByRole("list", { name: "Products" });
    await waitFor(() => expect(list.textContent).toContain("Logo"));
    expect(list.textContent).toContain("Pen");
    expect(list.textContent).toContain("Eraser");
    expect(listProducts).toHaveBeenCalledWith("");
  });

  it("filters the list instantly as you type, and restores on clear", async () => {
    render(<OrderPage />);
    const list = screen.getByRole("list", { name: "Products" });
    await waitFor(() => expect(list.textContent).toContain("Logo"));
    const search = screen.getByLabelText("Search product by name or ID");
    fireEvent.change(search, { target: { value: "Lo" } });
    await waitFor(() => expect(list.textContent).not.toContain("Pen"));
    expect(list.textContent).toContain("Logo");
    fireEvent.change(search, { target: { value: "" } });
    await waitFor(() => expect(list.textContent).toContain("Pen"));
  });

  it("disables Add for an out-of-stock product", async () => {
    render(<OrderPage />);
    const list = screen.getByRole("list", { name: "Products" });
    await waitFor(() => expect(list.textContent).toContain("Eraser"));
    const disabled = within(list)
      .getAllByRole("button", { name: "Add" })
      .filter((b) => (b as HTMLButtonElement).disabled);
    expect(disabled).toHaveLength(1);
    expect(disabled[0].closest("li")?.textContent).toContain("Eraser");
  });

  it("filters the picker by the category dropdown and ANDs with search", async () => {
    listProducts.mockResolvedValue([
      make(1, "Flag Pole", 5, "Flags"),
      make(2, "Flag Stand", 5, "Flags"),
      make(3, "ANF Patch", 5, "Patches"),
    ]);
    render(<OrderPage />);
    const list = screen.getByRole("list", { name: "Products" });
    await waitFor(() => expect(list.textContent).toContain("ANF Patch"));

    fireEvent.change(screen.getByLabelText("Filter by category"), { target: { value: "Flags" } });
    await waitFor(() => expect(list.textContent).not.toContain("ANF Patch"));
    expect(list.textContent).toContain("Flag Pole");
    expect(list.textContent).toContain("Flag Stand");

    fireEvent.change(screen.getByLabelText("Search product by name or ID"), { target: { value: "Stand" } });
    await waitFor(() => expect(list.textContent).not.toContain("Flag Pole"));
    expect(list.textContent).toContain("Flag Stand");
  });

  it("excludes non-sellable categories (OFFICE PROPERTIES) from the picker and dropdown", async () => {
    listProducts.mockResolvedValue([
      make(1, "Flag Pole", 5, "Flags"),
      make(2, "Lenovo Laptop", 1, "OFFICE PROPERTIES"),
    ]);
    render(<OrderPage />);
    const list = screen.getByRole("list", { name: "Products" });
    await waitFor(() => expect(list.textContent).toContain("Flag Pole"));
    expect(list.textContent).not.toContain("Lenovo Laptop");

    const dropdown = screen.getByLabelText("Filter by category");
    expect(dropdown.textContent).toContain("Flags");
    expect(dropdown.textContent).not.toContain("OFFICE PROPERTIES");
  });
});
