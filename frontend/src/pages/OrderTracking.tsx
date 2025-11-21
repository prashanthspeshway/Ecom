import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus, Star } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/sonner";
import { authFetch, getRole } from "@/lib/auth";

type ProgressT = { placed?: number; dispatched?: number; shipped?: number; delivered?: number };
type Item = { productId: string; name: string; image?: string; quantity: number; price?: number; progress?: ProgressT };
type Order = { id: string; user?: string; items: Item[]; status: string; createdAt: number; shipping?: any };

const stages = ["placed", "dispatched", "in_transit", "shipped", "out_for_delivery", "delivered"] as const;

const OrderTracking = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const role = getRole();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const url = role === "admin" ? `/api/admin/orders/${id}` : `/api/orders/${id}`;
        const res = await authFetch(url);
        if (!res.ok) throw new Error(String(res.status));
        setOrder(await res.json());
      } catch (e: any) {
        const code = Number(e?.message || 0);
        if (code === 401) setError("Login required to view this order");
        else if (code === 404) setError("Order not found");
        else setError("Unable to load order");
      }
    })();
  }, [id, role]);

  const percent = 0;

  const downloadInvoice = () => {
    if (!order) return;
    const w = window.open("", "_blank");
    if (!w) return;
    const total = (order.items || []).reduce((s, it) => s + Number(it.price || 0) * Number(it.quantity || 0), 0);
    const styles = `
      body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:24px;color:#111}
      h1{font-size:20px;margin:0 0 12px}
      .meta{display:flex;justify-content:space-between;margin-bottom:16px;font-size:12px;color:#555}
      table{width:100%;border-collapse:collapse;margin-top:12px}
      th,td{border:1px solid #e5e7eb;padding:8px;font-size:12px;text-align:left}
      tfoot td{font-weight:600}
    `;
    const rows = (order.items || []).map((it) => `<tr><td>${it.name}</td><td>${it.quantity}</td><td>₹${Number(it.price||0).toLocaleString()}</td><td>₹${(Number(it.price||0)*Number(it.quantity||0)).toLocaleString()}</td></tr>`).join("");
    const html = `<!doctype html><html><head><meta charset='utf-8'><title>Invoice ${order.id}</title><style>${styles}</style></head><body>
      <h1>Invoice #${order.id}</h1>
      <div class='meta'><div>Customer: ${order.user || "You"}</div><div>Date: ${new Date(order.createdAt||Date.now()).toLocaleString()}</div></div>
      <table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead><tbody>${rows}</tbody>
      <tfoot><tr><td colspan='3'>Total</td><td>₹${total.toLocaleString()}</td></tr></tfoot></table>
    </body></html>`;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  if (error) {
    return (
      <div className="container px-4 py-8 text-center">
        <p className="text-destructive">{error}</p>
        <Button className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }
  if (!order) return (<div className="container px-4 py-8"><p>Loading...</p></div>);

  const total = (order.items || []).reduce((s, it) => s + Number(it.price || 0) * Number(it.quantity || 0), 0);

  return (
    <div className="container px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-serif text-2xl md:text-3xl font-bold">Order #{order.id}</h1>
        <div className="text-sm text-muted-foreground">{new Date(order.createdAt || Date.now()).toLocaleString()}</div>
      </div>

      {order.shipping ? (
        <div className="border rounded-lg p-4 mb-6">
          <div className="font-medium mb-2">Shipping Details</div>
          {(() => {
            const s: any = order.shipping || {};
            const name = [s.first, s.last].filter(Boolean).join(" ");
            const addr = typeof s.address === "string" ? s.address : [s.address?.line1, s.address?.line2].filter(Boolean).join(", ");
            const cityState = [s.city, s.state].filter(Boolean).join(", ");
            const pin = s.pincode ? String(s.pincode) : s.postalCode ? String(s.postalCode) : "";
            return (
              <div className="text-sm text-muted-foreground space-y-1">
                {name ? <div>{name}</div> : null}
                {s.email ? <div>{s.email}</div> : null}
                {s.phone ? <div>{s.phone}</div> : null}
                {addr ? <div>{addr}</div> : null}
                {(cityState || pin) ? <div>{[cityState, pin].filter(Boolean).join(" • ")}</div> : null}
              </div>
            );
          })()}
        </div>
      ) : null}
      <div className="space-y-4">
        {(order.items || []).map((it) => {
          const progress = it.progress || {};
          const maxIdx = (() => { for (let i = stages.length - 1; i >= 0; i--) { if (progress[stages[i]]) return i; } return 0; })();
          const human = (s: typeof stages[number]) => {
            switch (s) {
              case "in_transit": return "In Transit";
              case "out_for_delivery": return "Out for Delivery";
              default: return s.charAt(0).toUpperCase() + s.slice(1);
            }
          };
          return (
            <div key={it.productId} className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <img src={it.image || "/placeholder.svg"} className="w-16 h-16 rounded object-cover" />
                <div className="flex-1">
                  <div className="font-medium">{it.name}</div>
                  <div className="text-xs text-muted-foreground">Qty: {it.quantity}</div>
                </div>
                <div className="font-semibold">₹{Number(it.price || 0) * it.quantity}</div>
              </div>
              <div className="flex items-center">
                {stages.map((s, i) => {
                  const done = Boolean(progress[s]);
                  const canEdit = role === "admin";
                  return (
                    <div key={s} className="flex items-center">
                      <div className="flex flex-col items-center w-32">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={done}
                            disabled={!canEdit}
                            onCheckedChange={async (checkedVal) => {
                              const checked = checkedVal === true;
                              if (!canEdit || !checked) return;
                              const optimisticTime = Date.now();
                              setOrder((prev) => {
                                if (!prev) return prev;
                                const items = prev.items.map((x) => {
                                  if (x.productId !== it.productId) return x;
                                  const prog = { ...(x.progress || {}) };
                                  prog[s] = optimisticTime;
                                  return { ...x, progress: prog };
                                });
                                let overall: string = prev.status;
                                for (let k = stages.length - 1; k >= 0; k--) {
                                  if (items.some((xi) => Boolean((xi.progress || {})[stages[k]]))) { overall = stages[k]; break; }
                                }
                                return { ...prev, items, status: overall };
                              });
                              try {
                                const res = await authFetch(`/api/admin/orders/${order.id}/item/${it.productId}`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ stage: s }),
                                });
                                if (res.ok) {
                                  toast(`Status updated: ${human(s)}`);
                                } else {
                                  toast("Update failed; refreshing");
                                  const url = role === "admin" ? `/api/admin/orders/${order.id}` : `/api/orders/${order.id}`;
                                  const ref = await authFetch(url);
                                  if (ref.ok) setOrder(await ref.json());
                                }
                              } catch {
                                toast("Update failed; refreshing");
                                const url = role === "admin" ? `/api/admin/orders/${order.id}` : `/api/orders/${order.id}`;
                                const ref = await authFetch(url);
                                if (ref.ok) setOrder(await ref.json());
                              }
                            }}
                          />
                          <span className="text-xs">{human(s)}</span>
                        </div>
                      </div>
                      {i < stages.length - 1 && (
                        <div className={`h-[4px] w-16 md:w-24 rounded ${i < maxIdx ? "bg-green-600" : "bg-muted"}`}></div>
                      )}
                    </div>
                  );
                })}
              </div>
              {getRole() !== "admin" && Boolean(progress.delivered) ? (
                <ReviewBox productId={it.productId} />
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Label>Overall Status</Label>
        <div className="text-sm">{order.status}</div>
      </div>

      <div className="mt-6 flex items-center gap-2">
        <Button onClick={downloadInvoice}>Download Invoice (PDF)</Button>
        <Button variant="secondary" onClick={() => navigate(-1)}>Back</Button>
      </div>
    </div>
  );
};

export default OrderTracking;

function ReviewBox({ productId }: { productId: string }) {
  const [rating, setRating] = useState<number>(0);
  const [hover, setHover] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState<(File | null)[]>([null, null, null]);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    try {
      if (!rating || rating < 1 || rating > 5) { toast("Select rating"); return; }
      setSubmitting(true);
      let urls: string[] = [];
      const picked = files.filter(Boolean) as File[];
      if (picked.length) {
        const fd = new FormData();
        picked.forEach((f) => fd.append("files", f));
        const up = await authFetch("/api/upload-public", { method: "POST", body: fd });
        if (!up.ok) { toast("Image upload failed"); setSubmitting(false); return; }
        const j = await up.json();
        urls = Array.isArray(j?.urls) ? j.urls.slice(0, 3) : [];
      }
      const res = await authFetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment, images: urls }),
      });
      if (!res.ok) { toast("Failed to submit review"); setSubmitting(false); return; }
      toast("Review submitted");
      setRating(0); setHover(0); setComment(""); setFiles([null, null, null]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-6 border-t pt-4">
      <div className="font-semibold mb-2">Add Review</div>
      <div className="flex items-center gap-2 mb-3">
        {[1,2,3,4,5].map((n) => (
          <button key={n} className="p-1" onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => setRating(n)}>
            <Star className={(hover >= n || rating >= n) ? "text-amber-500" : "text-muted-foreground"} fill={(hover >= n || rating >= n) ? "currentColor" : "none"} size={20} />
          </button>
        ))}
      </div>
      <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write your experience" className="mb-3" />
      <div className="flex items-center gap-3 mb-3">
        {files.map((f, idx) => (
          <label key={idx} className="h-14 w-14 border rounded flex items-center justify-center cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setFiles((arr) => { const next = [...arr]; next[idx] = file; return next; });
            }} />
            {f ? (
              <img
                src={URL.createObjectURL(f)}
                className="h-12 w-12 object-cover rounded"
                onClick={() => window.open(URL.createObjectURL(f), "_blank")}
              />
            ) : (
              <ImagePlus className="h-5 w-5 text-muted-foreground" />
            )}
          </label>
        ))}
      </div>
      <Button disabled={submitting} onClick={submit}>Submit Review</Button>
    </div>
  );
}