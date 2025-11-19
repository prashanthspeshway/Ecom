import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Package, MapPin, Heart, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { authFetch, clearAuth, getRole, getToken } from "@/lib/auth";
import type { Product } from "@/types/product";
import { addToCart } from "@/lib/cart";

const Account = () => {
  type Profile = { email: string; name?: string; role?: string } | null;
  const [profile, setProfile] = useState<Profile>(null);
  const role = getRole();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setProfile(data as Profile);
        }
      } catch (e) {
        // no-op
      }
    })();
  }, []);

  useEffect(() => {
    if (!getToken()) navigate("/login");
  }, []);

  if (role === "admin") {
    return (
      <div className="container px-4 py-16 text-center">
        <h1 className="font-serif text-3xl md:text-4xl font-bold mb-4">Admin Account</h1>
        <p className="text-muted-foreground mb-6">Admins manage products from the Admin Panel.</p>
        <div className="flex items-center justify-center gap-4">
          <a href="/admin" className="inline-block">
            <Button>Go to Admin Panel</Button>
          </a>
          <Button
            variant="outline"
            onClick={() => {
              clearAuth();
              navigate("/login");
            }}
          >
            Logout
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-serif text-3xl md:text-4xl font-bold">My Account</h1>
          <Button
            variant="outline"
            onClick={() => {
              clearAuth();
              try { localStorage.removeItem("cart_items"); localStorage.removeItem("wishlist_items"); } catch { void 0; }
              navigate("/login");
            }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        <Tabs defaultValue="profile" className="space-y-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="orders">
              <Package className="h-4 w-4 mr-2" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="addresses">
              <MapPin className="h-4 w-4 mr-2" />
              Addresses
            </TabsTrigger>
            <TabsTrigger value="wishlist">
              <Heart className="h-4 w-4 mr-2" />
              Wishlist
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <div className="bg-card rounded-lg p-6">
              <h2 className="font-serif text-2xl font-bold mb-4">Profile Details</h2>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Full Name</span><span>{profile?.name || "- not added -"}</span></div>
                <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Email ID</span><span>{profile?.email || "- not added -"}</span></div>
                <div className="flex justify-between py-2"><span className="text-muted-foreground">Role</span><span>{role || "guest"}</span></div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <div className="bg-card rounded-lg p-6">
              <h2 className="font-serif text-2xl font-bold mb-6">Order History</h2>
              <div className="text-center py-12">
                <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No orders yet</p>
                <Button className="mt-4">Start Shopping</Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="addresses">
            <div className="bg-card rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif text-2xl font-bold">Saved Addresses</h2>
                <Button>Add New Address</Button>
              </div>
              <div className="text-center py-12">
                <MapPin className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No saved addresses</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="wishlist">
            <WishlistContent />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const WishlistContent = () => {
  const [items, setItems] = useState<Product[]>([] as Product[]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("wishlist_items");
      setItems(raw ? (JSON.parse(raw) as Product[]) : []);
    } catch {
      setItems([]);
    }
  }, []);

  if (!items.length) {
    return (
      <div className="bg-card rounded-lg p-6">
        <h2 className="font-serif text-2xl font-bold mb-6">My Wishlist</h2>
        <div className="text-center py-12">
          <Heart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Your wishlist is empty</p>
          <Button className="mt-4">Browse Products</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-6">
      <h2 className="font-serif text-2xl font-bold mb-6">My Wishlist</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((p) => (
          <div key={p.id} className="border rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={p.images?.[0] ?? "/placeholder.svg"} alt={p.name} className="w-16 h-16 rounded-md object-cover" />
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="text-sm text-muted-foreground">₹{p.price.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { addToCart(p, 1); }}>
                Add to Cart
              </Button>
              <Button variant="destructive" onClick={() => {
                try {
                  const raw = localStorage.getItem("wishlist_items");
                  const list = raw ? (JSON.parse(raw) as Product[]) : [];
                  const next = list.filter((x) => x.id !== p.id);
                  localStorage.setItem("wishlist_items", JSON.stringify(next));
                  setItems(next);
                } catch { void 0; }
              }}>
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Account;
