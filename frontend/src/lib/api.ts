import { getApiUrl } from "./auth";

export async function fetchJSON(url: string) {
  const target = url.startsWith("http://") || url.startsWith("https://") ? url : getApiUrl(url);
  const res = await fetch(target);
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

export function getProducts() {
  return fetchJSON("/api/products");
}

export function getProduct(id: string) {
  return fetchJSON(`/api/products/${id}`);
}