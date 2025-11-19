import type { Product } from "@/types/product";

const KEY = "wishlist_items";

function read(): Product[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Product[]) : [];
  } catch {
    return [];
  }
}

function write(items: Product[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("wishlist:update"));
}

export function getWishlist(): Product[] {
  return read();
}

export function isWishlisted(id: string): boolean {
  return read().some((p) => p.id === id);
}

export function toggleWishlist(product: Product) {
  const items = read();
  const idx = items.findIndex((p) => p.id === product.id);
  if (idx >= 0) {
    items.splice(idx, 1);
  } else {
    items.push(product);
  }
  write(items);
}

export function removeFromWishlist(id: string) {
  write(read().filter((p) => p.id !== id));
}

export function clearWishlist() {
  write([]);
}