import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch, getToken, getApiUrl } from "@/lib/auth";
import { toast } from "@/components/ui/sonner";
import { indianStates, stateCities } from "@/data/indianStatesCities";

const Checkout = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<{ product: { id: string; name: string; images: string[]; price: number }; quantity: number }[]>([]);
  const [pmethod, setPmethod] = useState("razorpay");
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [addr, setAddr] = useState({ first: "", last: "", email: "", phone: "", address: "", city: "", state: "", pincode: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [shippingCharges, setShippingCharges] = useState<Array<{ state: string; city: string; charge: number }>>([]);
  
  // Validation functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  const validatePhone = (phone: string): boolean => {
    // Must be exactly 10 digits and start with 9876
    const phoneRegex = /^9876\d{6}$/;
    return phoneRegex.test(phone);
  };
  
  const validateName = (name: string): boolean => {
    // Name should be at least 2 characters and contain only letters and spaces
    const nameRegex = /^[a-zA-Z\s]{2,}$/;
    return nameRegex.test(name.trim());
  };
  
  const validateAllFields = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!addr.first.trim()) {
      newErrors.first = "First name is required";
    } else if (!validateName(addr.first)) {
      newErrors.first = "Please enter a valid first name";
    }
    
    if (!addr.last.trim()) {
      newErrors.last = "Last name is required";
    } else if (!validateName(addr.last)) {
      newErrors.last = "Please enter a valid last name";
    }
    
    if (!addr.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(addr.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    if (!addr.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!validatePhone(addr.phone)) {
      newErrors.phone = "Phone must be 10 digits starting with 9876";
    }
    
    if (!addr.address.trim()) {
      newErrors.address = "Address is required";
    }
    
    if (!addr.state) {
      newErrors.state = "State is required";
    }
    
    if (!addr.city) {
      newErrors.city = "City is required";
    }
    
    if (!addr.pincode.trim()) {
      newErrors.pincode = "Pincode is required";
    } else if (!/^\d{6}$/.test(addr.pincode)) {
      newErrors.pincode = "Pincode must be 6 digits";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  useEffect(() => {
    const t = getToken();
    if (!t) { navigate(`/login?redirect=${encodeURIComponent("/checkout")}`); return; }
    authFetch("/api/cart").then(async (res) => { if (!res.ok) return; const data = await res.json(); setItems(data || []); });
    
    // Load shipping charges from settings
    fetch(getApiUrl("/api/settings")).then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        if (data.shippingCharges && Array.isArray(data.shippingCharges)) {
          setShippingCharges(data.shippingCharges);
        }
      }
    }).catch(() => {});
    
    // Load Razorpay script
    if (!(window as any).Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => setRazorpayLoaded(true);
      document.body.appendChild(script);
    } else {
      setRazorpayLoaded(true);
    }
  }, [navigate]);

  const subtotal = useMemo(() => items.reduce((s, it) => s + Number(it.product.price || 0) * it.quantity, 0), [items]);
  const shipping = useMemo(() => {
    if (!addr.state || !addr.city) return 0;
    // First check for city-specific charge
    const cityCharge = shippingCharges.find(
      (sc) => sc.state === addr.state && sc.city === addr.city
    );
    if (cityCharge) return cityCharge.charge;
    
    // If no city-specific charge, check for state-wide charge (ALL cities)
    const stateCharge = shippingCharges.find(
      (sc) => sc.state === addr.state && sc.city === "ALL"
    );
    return stateCharge ? stateCharge.charge : 0;
  }, [addr.state, addr.city, shippingCharges]);
  const tax = 0;
  const discount = 0;
  const total = subtotal + shipping + tax - discount;

  // Helper function to check if all fields are filled (without showing errors)
  const areAllFieldsFilled = (): boolean => {
    return !!(
      addr.first.trim() &&
      addr.last.trim() &&
      addr.email.trim() &&
      addr.phone.trim() &&
      addr.address.trim() &&
      addr.state &&
      addr.city &&
      addr.pincode.trim()
    );
  };
  
  const canPlace = items.length > 0 && areAllFieldsFilled();

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
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input 
                    id="firstName" 
                    value={addr.first} 
                    onChange={(e) => {
                      setAddr({ ...addr, first: e.target.value });
                      if (errors.first) {
                        const newErrors = { ...errors };
                        delete newErrors.first;
                        setErrors(newErrors);
                      }
                    }}
                    className={errors.first ? "border-red-500" : ""}
                  />
                  {errors.first && <p className="text-sm text-red-500 mt-1">{errors.first}</p>}
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input 
                    id="lastName" 
                    value={addr.last} 
                    onChange={(e) => {
                      setAddr({ ...addr, last: e.target.value });
                      if (errors.last) {
                        const newErrors = { ...errors };
                        delete newErrors.last;
                        setErrors(newErrors);
                      }
                    }}
                    className={errors.last ? "border-red-500" : ""}
                  />
                  {errors.last && <p className="text-sm text-red-500 mt-1">{errors.last}</p>}
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={addr.email} 
                    onChange={(e) => {
                      setAddr({ ...addr, email: e.target.value });
                      if (errors.email) {
                        const newErrors = { ...errors };
                        delete newErrors.email;
                        setErrors(newErrors);
                      }
                    }}
                    className={errors.email ? "border-red-500" : ""}
                  />
                  {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
                </div>
                <div>
                  <Label htmlFor="phone">Phone * (10 digits starting with 9876)</Label>
                  <Input 
                    id="phone" 
                    type="tel" 
                    maxLength={10}
                    value={addr.phone} 
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, ''); // Only allow digits
                      setAddr({ ...addr, phone: value });
                      if (errors.phone) {
                        const newErrors = { ...errors };
                        delete newErrors.phone;
                        setErrors(newErrors);
                      }
                    }}
                    className={errors.phone ? "border-red-500" : ""}
                    placeholder="9876XXXXXX"
                  />
                  {errors.phone && <p className="text-sm text-red-500 mt-1">{errors.phone}</p>}
                </div>
              </div>
              <div>
                <Label htmlFor="address">Address *</Label>
                <Input 
                  id="address" 
                  value={addr.address} 
                  onChange={(e) => {
                    setAddr({ ...addr, address: e.target.value });
                    if (errors.address) {
                      const newErrors = { ...errors };
                      delete newErrors.address;
                      setErrors(newErrors);
                    }
                  }}
                  className={errors.address ? "border-red-500" : ""}
                />
                {errors.address && <p className="text-sm text-red-500 mt-1">{errors.address}</p>}
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="state">State *</Label>
                  <Select 
                    value={addr.state} 
                    onValueChange={(value) => { 
                      setAddr({ ...addr, state: value, city: "" });
                      if (errors.state) {
                        const newErrors = { ...errors };
                        delete newErrors.state;
                        setErrors(newErrors);
                      }
                    }}
                  >
                    <SelectTrigger id="state" className={errors.state ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select State" />
                    </SelectTrigger>
                    <SelectContent>
                      {indianStates.map((state) => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.state && <p className="text-sm text-red-500 mt-1">{errors.state}</p>}
                </div>
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Select 
                    value={addr.city} 
                    onValueChange={(value) => {
                      setAddr({ ...addr, city: value });
                      if (errors.city) {
                        const newErrors = { ...errors };
                        delete newErrors.city;
                        setErrors(newErrors);
                      }
                    }} 
                    disabled={!addr.state}
                  >
                    <SelectTrigger id="city" className={errors.city ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select City" />
                    </SelectTrigger>
                    <SelectContent>
                      {addr.state && stateCities[addr.state]?.map((city) => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.city && <p className="text-sm text-red-500 mt-1">{errors.city}</p>}
                </div>
                <div>
                  <Label htmlFor="pincode">Pincode *</Label>
                  <Input 
                    id="pincode" 
                    maxLength={6}
                    value={addr.pincode} 
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, ''); // Only allow digits
                      setAddr({ ...addr, pincode: value });
                      if (errors.pincode) {
                        const newErrors = { ...errors };
                        delete newErrors.pincode;
                        setErrors(newErrors);
                      }
                    }}
                    className={errors.pincode ? "border-red-500" : ""}
                  />
                  {errors.pincode && <p className="text-sm text-red-500 mt-1">{errors.pincode}</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg p-6">
            <h2 className="font-serif text-2xl font-bold mb-6">Payment Method</h2>
            <RadioGroup value={pmethod} onValueChange={setPmethod}>
              <div className="flex items-center space-x-2 p-4 border rounded-lg">
                <RadioGroupItem value="razorpay" id="razorpay" />
                <Label htmlFor="razorpay" className="flex-1 cursor-pointer">Razorpay (Cards, UPI, Wallets, Net Banking)</Label>
              </div>
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
            <div className="space-y-4 mb-6">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-semibold">₹{subtotal}</span></div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-semibold">{shipping === 0 ? "FREE" : `₹${shipping}`}</span>
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span className="font-semibold">₹{tax}</span></div>
              <Separator />
              <div className="flex justify-between text-lg"><span className="font-semibold">Total</span><span className="font-bold">₹{total}</span></div>
            </div>
            <Button size="lg" className="w-full" disabled={pmethod === "razorpay" && !razorpayLoaded} onClick={async () => {
              // Validate all fields before proceeding
              if (!validateAllFields()) {
                toast.error("Please fill all fields correctly");
                return;
              }
              
              if (items.length === 0) {
                toast.error("Your cart is empty");
                return;
              }
              
              if (pmethod === "razorpay") {
                // Handle Razorpay payment
                try {
                  // Create Razorpay order
                  const orderRes = await authFetch("/api/payments/create-order", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      amount: total,
                      currency: "INR",
                      receipt: `receipt_${Date.now()}`,
                    }),
                  });

                  if (!orderRes.ok) {
                    const errorData = await orderRes.json();
                    toast.error(errorData.error || "Failed to create payment order");
                    return;
                  }

                  const orderData = await orderRes.json();

                  // Save checkout data first
                  await authFetch("/api/checkout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ address: addr, payment: pmethod }),
                  });

                  // Get Razorpay key from backend (for security, key should come from backend)
                  // For now, we'll fetch it from env. In production, get it from backend API
                  const razorpayKeyRes = await authFetch("/api/payments/get-key");
                  let razorpayKey = "";
                  if (razorpayKeyRes.ok) {
                    const keyData = await razorpayKeyRes.json();
                    razorpayKey = keyData.key_id;
                  } else {
                    razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || "";
                  }

                  if (!razorpayKey) {
                    toast.error("Razorpay key not configured");
                    return;
                  }

                  // Initialize Razorpay checkout
                  const options = {
                    key: razorpayKey,
                    amount: orderData.amount,
                    currency: orderData.currency,
                    name: "Saree Elegance",
                    description: "Order Payment",
                    order_id: orderData.id,
                    handler: async function (response: any) {
                      // Verify payment
                      const verifyRes = await authFetch("/api/payments/verify-payment", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          razorpay_order_id: response.razorpay_order_id,
                          razorpay_payment_id: response.razorpay_payment_id,
                          razorpay_signature: response.razorpay_signature,
                        }),
                      });

                      if (verifyRes.ok) {
                        const verifyData = await verifyRes.json();
                        if (verifyData.success) {
                          // Create order
                          const o = await authFetch("/api/orders", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              payment_id: verifyData.payment_id,
                              payment_method: "razorpay",
                            }),
                          });
                          if (o.ok) {
                            try {
                              await authFetch("/api/cart?all=1", { method: "DELETE" });
                            } catch {
                              void 0;
                            }
                            toast.success("Payment successful! Order placed.");
                            navigate("/account");
                          }
                        } else {
                          toast.error("Payment verification failed");
                        }
                      } else {
                        toast.error("Payment verification failed");
                      }
                    },
                    prefill: {
                      name: `${addr.first} ${addr.last}`,
                      email: addr.email,
                      contact: addr.phone,
                    },
                    theme: {
                      color: "#000000",
                    },
                    modal: {
                      ondismiss: function () {
                        toast.error("Payment cancelled");
                      },
                    },
                  };

                  const razorpay = new (window as any).Razorpay(options);
                  razorpay.open();
                } catch (e) {
                  console.error("Razorpay error:", e);
                  toast.error("Failed to process payment");
                }
              } else {
                // Cash on Delivery
                const res = await authFetch("/api/checkout", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ address: addr, payment: pmethod }),
                });
                if (res.ok) {
                  const o = await authFetch("/api/orders", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({}),
                  });
                  if (o.ok) {
                    try {
                      await authFetch("/api/cart?all=1", { method: "DELETE" });
                    } catch {
                      void 0;
                    }
                    navigate("/account");
                  }
                }
              }
            }}>
              {pmethod === "razorpay" ? "Pay with Razorpay" : "Place Order"}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-4">By placing your order, you agree to our Terms & Conditions</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
