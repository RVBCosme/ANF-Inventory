import { computeTotal } from "@anf/shared";

export interface CartProduct {
  id: number;
  name: string;
  unit_price: number;
  stock: number;
}

export interface CartLine extends CartProduct {
  qty: number;
}

function clamp(qty: number, stock: number): number {
  return Math.max(1, Math.min(qty, stock));
}

export function addToCart(cart: CartLine[], product: CartProduct): CartLine[] {
  const existing = cart.find((l) => l.id === product.id);
  if (existing) {
    return cart.map((l) => (l.id === product.id ? { ...l, qty: clamp(l.qty + 1, l.stock) } : l));
  }
  return [...cart, { ...product, qty: 1 }];
}

export function setQty(cart: CartLine[], id: number, qty: number): CartLine[] {
  return cart.map((l) => (l.id === id ? { ...l, qty: clamp(qty, l.stock) } : l));
}

export function removeFromCart(cart: CartLine[], id: number): CartLine[] {
  return cart.filter((l) => l.id !== id);
}

export function cartTotal(cart: CartLine[]): number {
  return computeTotal(cart.map((l) => ({ unitPrice: l.unit_price, qty: l.qty })));
}
