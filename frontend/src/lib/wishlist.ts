import type { Product } from "@/types/product";
import { authFetch, getToken } from "@/lib/auth";

function currentKey(): string {
  const token = getToken();
  if (!token) return "wishlist_items_guest";
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    const email = (payload?.email || "guest").toString();
    return `wishlist_items_${email}`;
  } catch {
    return "wishlist_items_guest";
  }
}

function read(): Product[] {
  try {
    const raw = localStorage.getItem(currentKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Ensure we return an array and filter out any invalid entries
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && item.id && typeof item.id !== 'undefined');
  } catch {
    return [];
  }
}

function write(items: Product[]) {
  localStorage.setItem(currentKey(), JSON.stringify(items));
  window.dispatchEvent(new Event("wishlist:update"));
}

export function getWishlist(): Product[] {
  return read();
}

export function isWishlisted(id: string): boolean {
  const items = read();
  if (!Array.isArray(items) || items.length === 0) return false;
  // Convert both to strings for reliable comparison
  const idStr = String(id);
  return items.some((p) => p && p.id && String(p.id) === idStr);
}

export function toggleWishlist(product: Product) {
  const token = getToken();
  if (!token) {
    const dest = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    window.location.href = dest;
    return;
  }
  const items = read();
  if (!Array.isArray(items)) {
    write([]);
    return;
  }
  // Convert both to strings for reliable comparison
  const productIdStr = String(product.id);
  const idx = items.findIndex((p) => p && p.id && String(p.id) === productIdStr);
  const wasWishlisted = idx >= 0;
  
  if (wasWishlisted) {
    items.splice(idx, 1);
  } else {
    items.push(product);
  }
  write(items);
  
  if (token) {
    if (wasWishlisted) {
      authFetch(`/api/wishlist/${encodeURIComponent(product.id)}`, { method: "DELETE" })
        .then(() => { syncWishlistFromServer().catch(() => {}); })
        .catch(() => {});
    } else {
      authFetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      }).then(() => { syncWishlistFromServer().catch(() => {}); }).catch(() => {});
    }
  }
}

export function removeFromWishlist(id: string) {
  const token = getToken();
  if (!token) {
    const dest = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    window.location.href = dest;
    return;
  }
  const idStr = String(id);
  write(read().filter((p) => p && p.id && String(p.id) !== idStr));
  if (token) {
    authFetch(`/api/wishlist/${encodeURIComponent(id)}`, { method: "DELETE" })
      .then(() => { syncWishlistFromServer().catch(() => {}); })
      .catch(() => {});
  }
}

export function clearWishlist() {
  const token = getToken();
  if (!token) {
    const dest = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    window.location.href = dest;
    return;
  }
  write([]);
  if (token) {
    authFetch(`/api/wishlist?all=1`, { method: "DELETE" })
      .then(() => { syncWishlistFromServer().catch(() => {}); })
      .catch(() => {});
  }
}

export async function syncWishlistFromServer() {
  const token = getToken();
  if (!token) return;
  try {
    const res = await authFetch("/api/wishlist");
    if (!res.ok) return;
    const data = (await res.json()) as Product[];
    // Ensure we only write valid product arrays
    if (Array.isArray(data)) {
      write(data);
    } else {
      write([]);
    }
  } catch (error) {
    // If sync fails, don't overwrite existing wishlist
    console.error("Failed to sync wishlist from server:", error);
  }
}