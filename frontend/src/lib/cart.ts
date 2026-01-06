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

export function updateQuantity(productId: string, quantity: number): { success: boolean; message?: string } {
  const token = getToken();
  if (!token) {
    const dest = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    window.location.href = dest;
    return { success: false };
  }
  const items = read();
  const idx = items.findIndex((i) => i.product.id === productId);
  if (idx >= 0) {
    const product = items[idx].product;
    
    if (quantity > (product.stock || 999999)) {
      return { 
        success: false, 
        message: `Only ${product.stock} items available in stock. Cannot exceed available quantity.` 
      };
    }
    
    const newQuantity = Math.max(1, Math.min(quantity, product.stock || 999999));
    items[idx].quantity = newQuantity;
    write(items);
    
    if (token) {
      authFetch("/api/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: newQuantity }),
      }).then(() => {
        // Don't sync immediately - let the local state handle it
        // The cart:update event will trigger UI refresh
      }).catch(() => {
        // If server update fails, still keep local changes
      });
    }
    return { success: true };
  }
  return { success: false, message: "Product not found in cart" };
}

export function removeFromCart(productId: string) {
  const token = getToken();
  if (!token) {
    const dest = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    window.location.href = dest;
    return;
  }
  const items = read();
  const filteredItems = items.filter((i) => i.product.id !== productId);
  write(filteredItems);
  
  if (token) {
    // Use path parameter instead of query parameter
    authFetch(`/api/cart/${encodeURIComponent(productId)}`, { method: "DELETE" })
      .then(() => {
        // Don't sync immediately - let the local state handle it
        // The cart:update event will trigger UI refresh
      })
      .catch(() => {
        // If server delete fails, still keep local changes
      });
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