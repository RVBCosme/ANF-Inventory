import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

const { listProducts, receiveStock } = vi.hoisted(() => ({
  listProducts: vi.fn(),
  receiveStock: vi.fn(),
}));
vi.mock("../src/api/client", () => ({ api: { listProducts, receiveStock } }));

import { ReceiveStockPage } from "../src/pages/ReceiveStockPage";

const make = (id: number, name: string, stock = 5, category = "") => ({
  id, name, unit_price: 1000, stock, category, created_at: "", updated_at: "", deleted_at: null,
});

describe("ReceiveStockPage", () => {
  beforeEach(() => {
    listProducts.mockReset();
    receiveStock.mockReset();
    listProducts.mockResolvedValue([make(1, "Flag"), make(2, "Pole")]);
    receiveStock.mockResolvedValue({ receipt_id: 7, receipt_filename: "receipt_x.png" });
  });

  it("adds a picked product as a line and sends the mapped payload + receipt", async () => {
    render(<ReceiveStockPage />);
    const list = screen.getByRole("list", { name: "Products" });
    await waitFor(() => expect(list.textContent).toContain("Flag"));

    fireEvent.click(within(list).getAllByRole("button", { name: "Add" })[0]);
    const qty = screen.getByLabelText("Quantity for Flag") as HTMLInputElement;
    fireEvent.change(qty, { target: { value: "100" } });
    expect(qty.value).toBe("100");

    fireEvent.change(screen.getByLabelText("Receipt (JPG, PNG, or PDF)"), {
      target: { files: [new File(["x"], "r.png", { type: "image/png" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Receive Stock" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, receive" }));

    await waitFor(() => expect(receiveStock).toHaveBeenCalledTimes(1));
    const [linesArg, fileArg] = receiveStock.mock.calls[0];
    expect(linesArg).toEqual([{ product_id: 1, quantity: 100 }]);
    expect(fileArg).toBeInstanceOf(File);
  });

  it("shows a success banner with an Open receipt link after receiving", async () => {
    render(<ReceiveStockPage />);
    const list = screen.getByRole("list", { name: "Products" });
    await waitFor(() => expect(list.textContent).toContain("Flag"));
    fireEvent.click(within(list).getAllByRole("button", { name: "Add" })[0]);
    fireEvent.change(screen.getByLabelText("Receipt (JPG, PNG, or PDF)"), {
      target: { files: [new File(["x"], "r.png", { type: "image/png" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Receive Stock" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, receive" }));

    await waitFor(() => expect(screen.getByText("Stock received.")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Open receipt" })).toHaveAttribute(
      "href",
      "/api/receipts/receipt_x.png",
    );
  });
});
