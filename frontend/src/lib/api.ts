import { getApiUrl } from "./auth";

export async function fetchJSON(url: string) {
  try {
    const target = url.startsWith("http://") || url.startsWith("https://") ? url : getApiUrl(url);
    const res = await fetch(target);
    if (!res.ok) {
      const errorText = await res.text();
      let errorMessage = `Request failed with status ${res.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }
    return res.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Network error: Failed to fetch data");
  }
}

export function getProducts() {
  return fetchJSON("/api/products");
}

export function getProduct(id: string) {
  return fetchJSON(`/api/products/${id}`);
}