import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const { getHistory } = vi.hoisted(() => ({ getHistory: vi.fn() }));
vi.mock("../src/api/client", () => ({ api: { getHistory } }));

import { HistoryPage } from "../src/pages/HistoryPage";

const row = (over: Record<string, unknown> = {}) => ({
  id: 1,
  action: "place_order",
  summary: "Order #1",
  product_id: null,
  order_id: 1,
  receipt_filename: null,
  created_at: new Date().toISOString(),
  ...over,
});

describe("HistoryPage filters", () => {
  beforeEach(() => {
    getHistory.mockReset();
    getHistory.mockResolvedValue([row()]);
  });

  it("requests all types / all time on mount and renders rows", async () => {
    render(<HistoryPage />);
    await waitFor(() => expect(getHistory).toHaveBeenCalledWith({ action: undefined, range: "all" }));
    expect(await screen.findByText("Order #1")).toBeInTheDocument();
  });

  it("maps the type dropdown to the action param and keeps the range", async () => {
    render(<HistoryPage />);
    await waitFor(() => expect(getHistory).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText("Filter by type"), { target: { value: "place_order" } });
    await waitFor(() =>
      expect(getHistory).toHaveBeenLastCalledWith({ action: "place_order", range: "all" }),
    );
    fireEvent.change(screen.getByLabelText("Filter by time range"), { target: { value: "1w" } });
    await waitFor(() =>
      expect(getHistory).toHaveBeenLastCalledWith({ action: "place_order", range: "1w" }),
    );
  });

  it("shows the cap note only when results hit the limit", async () => {
    getHistory.mockResolvedValue(Array.from({ length: 100 }, (_, i) => row({ id: i + 1, summary: `e${i}` })));
    render(<HistoryPage />);
    expect(await screen.findByText(/Showing the latest 100/)).toBeInTheDocument();
  });
});
