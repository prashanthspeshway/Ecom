import type { Product, CartItem } from "@/types/product";

const KEY = "cart_items";

function read(): CartItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function write(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("cart:update"));
}

export function getCart(): CartItem[] {
  return read();
}

export function getCount(): number {
  return read().reduce((sum, it) => sum + it.quantity, 0);
}

export function addToCart(product: Product, quantity = 1) {
  const items = read();
  const idx = items.findIndex((i) => i.product.id === product.id);
  if (idx >= 0) {
    items[idx].quantity = Math.min((items[idx].quantity || 0) + quantity, product.stock);
  } else {
    items.push({ product, quantity });
  }
  write(items);
}

export function updateQuantity(productId: string, quantity: number) {
  const items = read();
  const idx = items.findIndex((i) => i.product.id === productId);
  if (idx >= 0) {
    items[idx].quantity = Math.max(1, quantity);
    write(items);
  }
}

export function removeFromCart(productId: string) {
  const items = read().filter((i) => i.product.id !== productId);
  write(items);
}

export function clearCart() {
  write([]);
}