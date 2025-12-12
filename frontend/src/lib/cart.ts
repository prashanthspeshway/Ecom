import type { Product, CartItem } from "@/types/product";
import { authFetch, getToken } from "@/lib/auth";

function currentKey(): string {
  const token = getToken();
  if (!token) return "cart_items_guest";
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    const email = (payload?.email || "guest").toString();
    return `cart_items_${email}`;
  } catch {
    return "cart_items_guest";
  }
}

function read(): CartItem[] {
  try {
    const raw = localStorage.getItem(currentKey());
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function write(items: CartItem[]) {
  localStorage.setItem(currentKey(), JSON.stringify(items));
  window.dispatchEvent(new Event("cart:update"));
}

export function getCart(): CartItem[] {
  return read();
}

export function getCount(): number {
  return read().reduce((sum, it) => sum + it.quantity, 0);
}

export function addToCart(product: Product, quantity = 1) {
  const token = getToken();
  if (!token) {
    const dest = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    window.location.href = dest;
    return;
  }
  const items = read();
  const idx = items.findIndex((i) => i.product.id === product.id);
  if (idx >= 0) {
    items[idx].quantity = Math.min((items[idx].quantity || 0) + quantity, product.stock);
  } else {
    items.push({ product, quantity });
  }
  write(items);
  if (token) {
    const q = items.find((i) => i.product.id === product.id)?.quantity || quantity;
    authFetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id, quantity: q }),
    }).then(() => {
      syncCartFromServer().catch(() => {});
    }).catch(() => {});
  }
}

export function updateQuantity(productId: string, quantity: number) {
  const token = getToken();
  if (!token) {
    const dest = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    window.location.href = dest;
    return;
  }
  const items = read();
  const idx = items.findIndex((i) => i.product.id === productId);
  if (idx >= 0) {
    const product = items[idx].product;
    // Respect stock limit
    const maxQty = product.stock || 999;
    const newQty = Math.max(1, Math.min(quantity, maxQty));
    items[idx].quantity = newQty;
    write(items);
    // Dispatch event to update UI
    window.dispatchEvent(new CustomEvent("cart:update"));
    if (token) {
      authFetch("/api/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: newQty }),
      }).then(async (res) => {
        if (res.ok) {
          // Only sync if update was successful
          await syncCartFromServer().catch(() => {});
        }
      }).catch(() => {});
    }
  }
}

export function removeFromCart(productId: string) {
  const token = getToken();
  if (!token) {
    const dest = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    window.location.href = dest;
    return;
  }
  const items = read().filter((i) => i.product.id !== productId);
  write(items);
  if (token) {
    authFetch(`/api/cart?productId=${encodeURIComponent(productId)}`, { method: "DELETE" })
      .then(() => { syncCartFromServer().catch(() => {}); })
      .catch(() => {});
  }
}

export function clearCart() {
  const token = getToken();
  if (!token) {
    const dest = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    window.location.href = dest;
    return;
  }
  write([]);
  if (token) {
    authFetch(`/api/cart?all=1`, { method: "DELETE" })
      .then(() => { syncCartFromServer().catch(() => {}); })
      .catch(() => {});
  }
}

export async function syncCartFromServer() {
  const token = getToken();
  if (!token) return;
  const res = await authFetch("/api/cart");
  if (!res.ok) return;
  const data = (await res.json()) as CartItem[];
  write(data);
}