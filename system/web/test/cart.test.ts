import { describe, it, expect } from "vitest";
import { addToCart, setQty, removeFromCart, cartTotal, type CartLine } from "../src/lib/cart";

const coffee = { id: 1, name: "Coffee", unit_price: 18500, stock: 12 };

describe("cart logic", () => {
  it("adds an item, increments quantity if already present, and caps at stock", () => {
    let cart: CartLine[] = [];
    cart = addToCart(cart, coffee);
    cart = addToCart(cart, coffee);
    expect(cart[0].qty).toBe(2);
    cart = setQty(cart, 1, 999);
    expect(cart[0].qty).toBe(12);
  });

  it("removes an item and totals the cart in centavos", () => {
    let cart: CartLine[] = [];
    cart = addToCart(cart, coffee);
    cart = setQty(cart, 1, 2);
    expect(cartTotal(cart)).toBe(37000);
    cart = removeFromCart(cart, 1);
    expect(cart).toHaveLength(0);
  });
});
