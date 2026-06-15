import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const { listProducts, listCategories } = vi.hoisted(() => ({
  listProducts: vi.fn(),
  listCategories: vi.fn(),
}));
vi.mock("../src/api/client", () => ({ api: { listProducts, listCategories } }));

import { ProductsPage } from "../src/pages/ProductsPage";

const make = (id: number, name: string, stock = 5, category = "") => ({
  id,
  name,
  unit_price: 18500,
  stock,
  category,
  created_at: "",
  updated_at: "",
  deleted_at: null,
});

describe("ProductsPage", () => {
  beforeEach(() => {
    listProducts.mockReset();
    listCategories.mockReset();
    listProducts.mockResolvedValue([make(1, "Logo", 5, "Patches")]);
    listCategories.mockResolvedValue(["Patches"]);
  });

  it("fills the Product Name column and keeps Actions compact (no + Stock button)", async () => {
    render(<ProductsPage />);
    const nameCell = await screen.findByText("Logo");
    expect(nameCell.tagName).toBe("TD");
    expect(nameCell).toHaveClass("w-full");

    // Stock is added only on the Receive Stock page now — no + Stock shortcut here.
    expect(screen.queryByRole("button", { name: "+ Stock" })).not.toBeInTheDocument();

    const editButton = screen.getByRole("button", { name: "Edit" });
    expect(editButton.closest("td")).toHaveClass("whitespace-nowrap");
  });

  it("shows a Category column and a Category field in the Add form", async () => {
    render(<ProductsPage />);
    await screen.findByText("Logo");
    expect(screen.getByRole("columnheader", { name: "Category" })).toBeInTheDocument();
    expect(screen.getByText("Patches")).toBeInTheDocument(); // the row's category cell

    fireEvent.click(screen.getByRole("button", { name: "+ Add Product" }));
    expect(screen.getByLabelText("Category")).toBeInTheDocument();
  });
});
