import type { Product } from "@anf/shared";

/** Case-insensitive match on name, category, raw id, or zero-padded id. Empty/whitespace query → all. */
export function filterProducts(products: Product[], query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return products;
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      String(p.id).includes(q) ||
      String(p.id).padStart(4, "0").includes(q),
  );
}

/** Filter to one category. `null` means "all categories"; `""` selects Uncategorized. */
export function byCategory(products: Product[], category: string | null): Product[] {
  if (category === null) return products;
  return products.filter((p) => p.category === category);
}

/** Sorted, unique, non-empty categories present in the list (for the dropdown). */
export function distinctCategories(products: Product[]): string[] {
  return [...new Set(products.map((p) => p.category).filter((c) => c !== ""))].sort();
}

/** Categories whose products are internal assets, not merchandise — excluded from the New Order picker. */
export const NON_SELLABLE_CATEGORIES = ["OFFICE PROPERTIES"];

/** Drop products in a non-sellable category (case-insensitive). Used by the New Order picker only. */
export function sellableProducts(products: Product[]): Product[] {
  const blocked = new Set(NON_SELLABLE_CATEGORIES.map((c) => c.toLowerCase()));
  return products.filter((p) => !blocked.has(p.category.toLowerCase()));
}
