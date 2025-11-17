export async function fetchJSON(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

export function getProducts() {
  return fetchJSON("/api/products");
}

export function getProduct(id: string) {
  return fetchJSON(`/api/products/${id}`);
}