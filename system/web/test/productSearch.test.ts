import { describe, it, expect } from "vitest";
import type { Product } from "@anf/shared";
import { filterProducts, byCategory, distinctCategories, sellableProducts } from "../src/lib/productSearch";

const make = (id: number, name: string, stock = 5, category = ""): Product => ({
  id,
  name,
  unit_price: 1000,
  stock,
  category,
  created_at: "",
  updated_at: "",
  deleted_at: null,
});

const products = [make(1, "Logo", 5, "Patches"), make(2, "Pen", 5, "Office"), make(5, "Notebook", 5, "Office")];

describe("filterProducts", () => {
  it("returns all products for an empty or whitespace query", () => {
    expect(filterProducts(products, "")).toHaveLength(3);
    expect(filterProducts(products, "   ")).toHaveLength(3);
  });

  it("matches a name substring case-insensitively", () => {
    expect(filterProducts(products, "lo").map((p) => p.name)).toEqual(["Logo"]);
    expect(filterProducts(products, "LO").map((p) => p.name)).toEqual(["Logo"]);
  });

  it("matches a category substring case-insensitively", () => {
    expect(filterProducts(products, "office").map((p) => p.name)).toEqual(["Pen", "Notebook"]);
  });

  it("matches by raw id and zero-padded id", () => {
    expect(filterProducts(products, "5").map((p) => p.name)).toEqual(["Notebook"]);
    expect(filterProducts(products, "0005").map((p) => p.name)).toEqual(["Notebook"]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterProducts(products, "zzz")).toEqual([]);
  });
});

describe("byCategory", () => {
  it("returns all for null", () => {
    expect(byCategory(products, null)).toHaveLength(3);
  });
  it("filters to a named category", () => {
    expect(byCategory(products, "Office").map((p) => p.name)).toEqual(["Pen", "Notebook"]);
  });
  it("selects Uncategorized with an empty string", () => {
    const withBlank = [...products, make(9, "Mystery", 5, "")];
    expect(byCategory(withBlank, "").map((p) => p.name)).toEqual(["Mystery"]);
  });
});

describe("distinctCategories", () => {
  it("returns sorted, unique, non-empty categories", () => {
    const withBlank = [...products, make(9, "Mystery", 5, "")];
    expect(distinctCategories(withBlank)).toEqual(["Office", "Patches"]);
  });
});

describe("sellableProducts", () => {
  it("drops products in a non-sellable category (case-insensitive)", () => {
    const list = [
      make(1, "Flag Pole", 5, "Flags"),
      make(2, "Lenovo Laptop", 1, "OFFICE PROPERTIES"),
      make(3, "Printer", 1, "office properties"),
      make(4, "Patch", 5, "Patches"),
    ];
    expect(sellableProducts(list).map((p) => p.name)).toEqual(["Flag Pole", "Patch"]);
  });

  it("keeps everything when no product is in a non-sellable category", () => {
    const list = [make(1, "Flag Pole", 5, "Flags"), make(2, "Patch", 5, "Patches")];
    expect(sellableProducts(list)).toHaveLength(2);
  });
});
