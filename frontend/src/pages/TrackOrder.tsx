import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiBase } from "@/lib/auth";
import { Package, Search } from "lucide-react";

type ProgressT = { placed?: number; dispatched?: number; in_transit?: number; shipped?: number; out_for_delivery?: number; delivered?: number };
type Item = { productId: string; name: string; image?: string; quantity: number; price?: number; progress?: ProgressT };
type Shipping = { first?: string; last?: string; email?: string; phone?: string; address?: string | { line1?: string; line2?: string }; city?: string; state?: string; pincode?: string; postalCode?: string } | null;
type Order = { id: string; trackingId?: string; items: Item[]; status: string; createdAt: number; shipping?: Shipping };

const stages = ["placed", "dispatched", "in_transit", "shipped", "out_for_delivery", "delivered"] as const;

const TrackOrder = () => {
  const navigate = useNavigate();
  const [trackingId, setTrackingId] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingId || trackingId.length !== 12 || !/^\d+$/.test(trackingId)) {
      setError("Please enter a valid 12-digit tracking ID");
      return;
    }

    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const res = await fetch(`${apiBase}/api/orders/track/${trackingId}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Order not found");
        setLoading(false);
        return;
      }
      const orderData = await res.json();
      setOrder(orderData);
    } catch (e) {
      setError("Failed to track order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const humanStatus = (status: string) => {
    switch (status) {
      case "in_transit": return "In Transit";
      case "out_for_delivery": return "Out for Delivery";
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered": return "text-green-600";
      case "out_for_delivery": return "text-blue-600";
      case "shipped":
      case "in_transit": return "text-blue-500";
      case "dispatched": return "text-yellow-600";
      default: return "text-gray-600";
    }
  };

  return (
    <div className="container px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl md:text-4xl font-bold mb-2">Track Your Order</h1>
          <p className="text-muted-foreground">Enter your 12-digit tracking ID to check your order status</p>
        </div>

        <form onSubmit={handleTrack} className="max-w-md mx-auto mb-8">
          <div className="space-y-4">
            <div>
              <Label htmlFor="trackingId">Tracking ID</Label>
              <div className="flex gap-2">
                <Input
                  id="trackingId"
                  type="text"
                  placeholder="Enter 12-digit tracking ID"
                  value={trackingId}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 12);
                    setTrackingId(value);
                    setError(null);
                  }}
                  maxLength={12}
                  className="text-center text-lg tracking-widest"
                />
                <Button type="submit" disabled={loading || trackingId.length !== 12}>
                  <Search className="h-4 w-4 mr-2" />
                  Track
                </Button>
              </div>
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        </form>

        {loading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Searching for your order...</p>
          </div>
        )}

        {order && (
          <div className="space-y-6">
            <div className="border rounded-lg p-6 bg-card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-serif text-2xl font-bold">Order Details</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tracking ID: <span className="font-mono font-semibold">{order.trackingId}</span>
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-semibold ${getStatusColor(order.status)}`}>
                    {humanStatus(order.status)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(order.createdAt || Date.now()).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {order.shipping && (
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-medium mb-2">Shipping Address</h3>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {(() => {
                      const s = order.shipping as NonNullable<Shipping>;
                      const name = [s.first, s.last].filter(Boolean).join(" ");
                      const addr = typeof s.address === "string" ? s.address : [s.address?.line1, s.address?.line2].filter(Boolean).join(", ");
                      const cityState = [s.city, s.state].filter(Boolean).join(", ");
                      const pin = s.pincode ? String(s.pincode) : s.postalCode ? String(s.postalCode) : "";
                      return (
                        <>
                          {name && <div>{name}</div>}
                          {addr && <div>{addr}</div>}
                          {(cityState || pin) && <div>{[cityState, pin].filter(Boolean).join(" • ")}</div>}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="font-serif text-xl font-bold">Order Items</h3>
              {order.items.map((item) => {
                const progress = item.progress || {};
                const maxIdx = (() => {
                  for (let i = stages.length - 1; i >= 0; i--) {
                    if (progress[stages[i]]) return i;
                  }
                  return 0;
                })();

                return (
                  <div key={item.productId} className="border rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <img
                        src={item.image || "/placeholder.svg"}
                        alt={item.name}
                        className="w-16 h-16 rounded object-cover"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Quantity: {item.quantity} × ₹{Number(item.price || 0).toLocaleString()}
                        </div>
                      </div>
                      <div className="font-semibold">
                        ₹{(Number(item.price || 0) * item.quantity).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center overflow-x-auto pb-2">
                      {stages.map((stage, i) => {
                        const done = Boolean(progress[stage]);
                        const human = (s: typeof stages[number]) => {
                          switch (s) {
                            case "in_transit": return "In Transit";
                            case "out_for_delivery": return "Out for Delivery";
                            default: return s.charAt(0).toUpperCase() + s.slice(1);
                          }
                        };
                        return (
                          <div key={stage} className="flex items-center flex-shrink-0">
                            <div className="flex flex-col items-center min-w-[80px]">
                              <div
                                className={`w-3 h-3 rounded-full mb-1 ${
                                  done ? "bg-green-600" : i <= maxIdx ? "bg-blue-500" : "bg-gray-300"
                                }`}
                              />
                              <span className="text-xs text-center">{human(stage)}</span>
                              {done && progress[stage] && (
                                <span className="text-xs text-muted-foreground mt-1">
                                  {new Date(progress[stage]!).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            {i < stages.length - 1 && (
                              <div
                                className={`h-[2px] w-12 md:w-16 rounded ${
                                  i < maxIdx ? "bg-green-600" : "bg-gray-300"
                                }`}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <div className="text-sm text-muted-foreground">Total Amount</div>
                <div className="text-xl font-bold">
                  ₹{order.items.reduce((sum, it) => sum + Number(it.price || 0) * it.quantity, 0).toLocaleString()}
                </div>
              </div>
              <Button variant="outline" onClick={() => navigate("/")}>
                Continue Shopping
              </Button>
            </div>
          </div>
        )}

        {!order && !loading && (
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Enter a tracking ID above to view your order status</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackOrder;

