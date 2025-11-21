import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch, getToken } from "@/lib/auth";

const Checkout = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<{ product: { id: string; name: string; images: string[]; price: number }; quantity: number }[]>([]);
  const [pmethod, setPmethod] = useState("cod");
  const [coupon, setCoupon] = useState("");
  const [addr, setAddr] = useState({ first: "", last: "", email: "", phone: "", address: "", city: "", state: "", pincode: "" });
  useEffect(() => {
    const t = getToken();
    if (!t) { navigate(`/login?redirect=${encodeURIComponent("/checkout")}`); return; }
    authFetch("/api/cart").then(async (res) => { if (!res.ok) return; const data = await res.json(); setItems(data || []); });
  }, [navigate]);

  const subtotal = useMemo(() => items.reduce((s, it) => s + Number(it.product.price || 0) * it.quantity, 0), [items]);
  const shipping = 0;
  const tax = 0;
  const discount = 0;
  const total = subtotal + shipping + tax - discount;

  const canPlace = items.length > 0 && addr.first && addr.last && addr.email && addr.phone && addr.address && addr.city && addr.state && addr.pincode;

  return (
    <div className="container px-4 py-8">
      <h1 className="font-serif text-3xl md:text-4xl font-bold mb-8">Checkout</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-card rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-2xl font-bold">Shipping Address</h2>
              <div className="text-sm text-muted-foreground">Information ▸ Shipping ▸ Payment</div>
            </div>
            <div className="grid gap-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" value={addr.first} onChange={(e) => setAddr({ ...addr, first: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" value={addr.last} onChange={(e) => setAddr({ ...addr, last: e.target.value })} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={addr.email} onChange={(e) => setAddr({ ...addr, email: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" type="tel" value={addr.phone} onChange={(e) => setAddr({ ...addr, phone: e.target.value })} />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={addr.address} onChange={(e) => setAddr({ ...addr, address: e.target.value })} />
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input id="state" value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input id="pincode" value={addr.pincode} onChange={(e) => setAddr({ ...addr, pincode: e.target.value })} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg p-6">
            <h2 className="font-serif text-2xl font-bold mb-6">Payment Method</h2>
            <RadioGroup value={pmethod} onValueChange={setPmethod}>
              <div className="flex items-center space-x-2 p-4 border rounded-lg">
                <RadioGroupItem value="card" id="card" />
                <Label htmlFor="card" className="flex-1 cursor-pointer">Credit/Debit Card</Label>
              </div>
              {pmethod === "card" && (
                <div className="grid sm:grid-cols-3 gap-3 mt-3">
                  <Input placeholder="Card Number" />
                  <Input placeholder="MM/YY" />
                  <Input placeholder="CVV" />
                </div>
              )}
              <div className="flex items-center space-x-2 p-4 border rounded-lg mt-4">
                <RadioGroupItem value="upi" id="upi" />
                <Label htmlFor="upi" className="flex-1 cursor-pointer">UPI</Label>
              </div>
              {pmethod === "upi" && (
                <div className="mt-3">
                  <Input placeholder="yourid@upi" />
                </div>
              )}
              <div className="flex items-center space-x-2 p-4 border rounded-lg mt-4">
                <RadioGroupItem value="cod" id="cod" />
                <Label htmlFor="cod" className="flex-1 cursor-pointer">Cash on Delivery</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div>
          <div className="bg-card rounded-lg p-6 sticky top-24">
            <h2 className="font-serif text-2xl font-bold mb-6">Order Summary</h2>
            <div className="space-y-3 mb-4">
              {items.map((it, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <img src={(it.product.images || ["/placeholder.svg"])[0]} alt={it.product.name} className="w-14 h-14 rounded object-cover" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{it.product.name}</div>
                    <div className="text-xs text-muted-foreground">Qty: {it.quantity}</div>
                  </div>
                  <div className="text-sm font-semibold">₹{Number(it.product.price) * it.quantity}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mb-4">
              <Input placeholder="Enter promo code" value={coupon} onChange={(e) => setCoupon(e.target.value)} />
              <Button variant="secondary">Apply</Button>
            </div>
            <div className="space-y-4 mb-6">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-semibold">₹{subtotal}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span className="font-semibold">FREE</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span className="font-semibold">₹{tax}</span></div>
              <Separator />
              <div className="flex justify-between text-lg"><span className="font-semibold">Total</span><span className="font-bold">₹{total}</span></div>
            </div>
            <Button size="lg" className="w-full" disabled={!canPlace} onClick={async () => {
              const res = await authFetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address: addr, payment: pmethod }) });
              if (res.ok) {
                const o = await authFetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
                if (o.ok) {
                  try { await authFetch("/api/cart?all=1", { method: "DELETE" }); } catch { void 0; }
                }
                navigate("/account");
              }
            }}>Place Order</Button>
            <p className="text-xs text-muted-foreground text-center mt-4">By placing your order, you agree to our Terms & Conditions</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
