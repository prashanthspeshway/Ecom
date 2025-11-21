import { useEffect, useState } from "react";
import { authFetch, getToken } from "@/lib/auth";

type Progress = { placed?: number; dispatched?: number; in_transit?: number; shipped?: number; out_for_delivery?: number; delivered?: number };
type Item = { productId: string; name: string; image?: string; quantity: number; price?: number; progress?: Progress };
type Order = { id: string; items: Item[]; status: string; createdAt: number };

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        if (!getToken()) { setLoading(false); return; }
        const res = await authFetch("/api/orders");
        if (!res.ok) throw new Error(String(res.status));
        setOrders(await res.json());
      } catch (e: any) {
        const code = Number(e?.message || 0);
        if (code === 401) {
          document.body.setAttribute("data-orders-error", "Login to view your orders");
        }
      } finally { setLoading(false); }
    })();
  }, []);
  if (loading) return (<div className="container px-4 py-16"><p>Loading…</p></div>);
  if (!orders.length) return (
    <div className="container px-4 py-16">
      <div className="max-w-2xl mx-auto text-center space-y-6">
        <h1 className="font-serif text-3xl md:text-4xl font-bold">My Orders</h1>
        <p className="text-muted-foreground">No orders yet</p>
        <a href="/products" className="inline-block">
          <button className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Start Shopping</button>
        </a>
      </div>
    </div>
  );
  return (
    <div className="container px-4 py-16">
      <h1 className="font-serif text-3xl md:text-4xl font-bold mb-6">My Orders</h1>
      <div className="space-y-4">
        {orders.map((o) => {
          const total = (o.items || []).reduce((sum, it) => sum + (Number(it.price || 0) * Number(it.quantity || 0)), 0);
          return (
            <div key={o.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">Order #{o.id}</div>
                  <div className="text-sm text-muted-foreground">{new Date(o.createdAt || Date.now()).toLocaleString()}</div>
                </div>
                <div className="text-sm">Status: <span className="font-medium">{o.status}</span></div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <a href={`/order/${o.id}`} className="inline-block">
                  <button className="inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm">Track</button>
                </a>
                <div className="ml-auto font-semibold">₹{total.toLocaleString()}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Orders;