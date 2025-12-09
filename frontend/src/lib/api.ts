import { apiBase } from "./auth";

export async function fetchJSON(url: string) {
  const target = url.startsWith("/") ? `${apiBase}${url}` : url;
  const res = await fetch(target);
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

export function getProducts(opts?: { new?: boolean; sale?: boolean; bestseller?: boolean }) {
  const params = new URLSearchParams();
  if (opts?.new) params.append("new", "true");
  if (opts?.sale) params.append("sale", "true");
  if (opts?.bestseller) params.append("bestseller", "true");
  const str = params.toString();
  return fetchJSON(str ? `/api/products?${str}` : "/api/products");
}

export function getProduct(id: string) {
  return fetchJSON(`/api/products/${id}`);
}