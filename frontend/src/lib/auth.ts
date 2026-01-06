export function setToken(token: string, role: string) {
  localStorage.setItem("auth_token", token);
  localStorage.setItem("auth_role", role);
}

export function getToken(): string | null {
  return localStorage.getItem("auth_token");
}

export function getRole(): string | null {
  const role = localStorage.getItem("auth_role");
  // Prevent "undefined" string from being returned
  if (role === "undefined" || role === "null") {
    return null;
  }
  return role;
}

// Function to sync role from backend - call this if role seems incorrect
export async function syncRoleFromBackend(): Promise<string | null> {
  try {
    const token = getToken();
    if (!token) return null;
    
    const apiUrl = apiBase ? `${apiBase}/api/auth/me` : "/api/auth/me";
    const res = await authFetch(apiUrl);
    if (res.ok) {
      const data = await res.json();
      const role = data.role || data.user?.role || null;
      if (role && role !== "undefined") {
        localStorage.setItem("auth_role", role);
        return role;
      }
    }
  } catch (e) {
    console.error("Failed to sync role from backend:", e);
  }
  return getRole();
}

export function clearAuth() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_role");
}

export function getEmail(): string | null {
  try {
    const token = getToken();
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload?.email || null;
  } catch {
    return null;
  }
}

const apiBase = import.meta.env.VITE_API_BASE_URL || "";
export { apiBase };

export async function register(payload: { email: string; password: string; name?: string; invite?: string }) {
  const apiUrl = apiBase ? `${apiBase}/api/auth/register` : "/api/auth/register";
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let msg = "";
    try { msg = (await res.json()).error || ""; } catch (err) { void err; }
    if (res.status === 409) throw new Error("EMAIL_EXISTS");
    if (res.status === 503) throw new Error("BACKEND_UNAVAILABLE");
    throw new Error("REGISTRATION_FAILED");
  }
  const data = await res.json();
  // Backend returns { token, user: { email, role } }
  const role = data.user?.role || data.role || "user";
  // CRITICAL: Always set the role from the backend response
  if (!role || role === "undefined") {
    console.error("Invalid role received from register:", data);
    throw new Error("REGISTRATION_FAILED");
  }
  setToken(data.token, role);
  // Verify role was set correctly
  const storedRole = getRole();
  if (storedRole !== role) {
    console.error("Role mismatch after setting:", { expected: role, got: storedRole });
    localStorage.setItem("auth_role", role);
  }
  await syncAccountStateAfterAuth();
  // Double-check role after sync
  const finalRole = getRole();
  if (finalRole !== role) {
    localStorage.setItem("auth_role", role);
  }
  return data;
}

export async function login(payload: { email: string; password: string }) {
  const apiUrl = apiBase ? `${apiBase}/api/auth/login` : "/api/auth/login";
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let msg = "";
    try { msg = (await res.json()).error || ""; } catch (err) { void err; }
    if (res.status === 401) throw new Error("INVALID_CREDENTIALS");
    if (res.status === 503) throw new Error("BACKEND_UNAVAILABLE");
    throw new Error("LOGIN_FAILED");
  }
  const data = await res.json();
  // Backend returns { token, user: { email, role } }
  const role = data.user?.role || data.role || "user";
  // CRITICAL: Always set the role from the backend response
  if (!role || role === "undefined") {
    console.error("Invalid role received from login:", data);
    throw new Error("LOGIN_FAILED");
  }
  setToken(data.token, role);
  // Verify role was set correctly
  const storedRole = getRole();
  if (storedRole !== role) {
    console.error("Role mismatch after setting:", { expected: role, got: storedRole });
    // Force set it again
    localStorage.setItem("auth_role", role);
  }
  // Run sync in background without blocking login
  syncAccountStateAfterAuth().catch(() => {});
  return data;
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  
  // Handle relative URLs with apiBase
  let url = input;
  if (typeof input === "string" && input.startsWith("/") && apiBase) {
    url = `${apiBase}${input}`;
  }
  
  return fetch(url, { ...init, headers });
}

import { syncCartFromServer } from "@/lib/cart";
import { syncWishlistFromServer } from "@/lib/wishlist";

async function syncAccountStateAfterAuth() {
  try {
    const token = getToken();
    if (!token) return;
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    const email = (payload?.email || "guest").toString();
    const rawCart = localStorage.getItem("cart_items_guest");
    const rawWish = localStorage.getItem("wishlist_items_guest");
    const cartItems = rawCart ? JSON.parse(rawCart) as Array<{ product: { id: string }; quantity: number }> : [];
    const wishItems = rawWish ? JSON.parse(rawWish) as Array<{ id: string }> : [];
    for (const it of cartItems) {
      const productId = it?.product?.id;
      const quantity = typeof it?.quantity === "number" ? it.quantity : 1;
      if (productId) {
        await authFetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, quantity }) });
      }
    }
    for (const p of wishItems) {
      const productId = p?.id;
      if (productId) {
        await authFetch("/api/wishlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId }) });
      }
    }
    localStorage.removeItem("cart_items_guest");
    localStorage.removeItem("wishlist_items_guest");
    localStorage.removeItem(`cart_items_${email}`);
    localStorage.removeItem(`wishlist_items_${email}`);
    await syncCartFromServer();
    await syncWishlistFromServer();
  } catch {
    // no-op
  }
}