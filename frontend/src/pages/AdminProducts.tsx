import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Product } from "@/types/product";
import { authFetch, getRole } from "@/lib/auth";

const AdminProducts = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const role = getRole();

  useEffect(() => {
    if (role !== "admin") navigate("/login");
  }, [role, navigate]);

  const searchParam = new URLSearchParams(location.search).get("query") || "";
  const [searchTerm, setSearchTerm] = useState(searchParam);

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const res = await authFetch("/api/products");
      return res.json();
    },
  });

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [p.name, p.brand, p.category].some((v) => (v || "").toLowerCase().includes(q)),
    );
  }, [products, searchTerm]);

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<Product> }) => {
      const res = await authFetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.refetchQueries({ queryKey: ["admin-products"] });
      qc.refetchQueries({ queryKey: ["products"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.refetchQueries({ queryKey: ["admin-products"] });
      qc.refetchQueries({ queryKey: ["products"] });
    },
  });

  const { data: categoriesData = [] } = useQuery<string[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      return res.json();
    },
  });

  const [manageCategory] = useState<string>("Lenin");
  const { data: manageSubcats = [] } = useQuery<string[]>({
    queryKey: ["subcategories", manageCategory],
    queryFn: async () => {
      const res = await fetch(`/api/subcategories?category=${encodeURIComponent(manageCategory)}`);
      return res.json();
    },
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ price: string; stock: string; discount: string }>({ price: "", stock: "", discount: "" });
  const [editName, setEditName] = useState("");
  const [editBrand, setEditBrand] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [selectedLeninSub, setSelectedLeninSub] = useState<string>("");

  return (
    <div className="container px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl md:text-4xl font-bold">Manage Products</h1>
        <div className="flex items-center gap-2">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") navigate(`/admin/products?query=${encodeURIComponent(searchTerm)}`);
            }}
            placeholder="Search products"
            className="w-[260px]"
          />
          <Button onClick={() => navigate(`/admin/products?query=${encodeURIComponent(searchTerm)}`)}>Search</Button>
        </div>
      </div>

      <div className="bg-card rounded-lg p-6">
        <div className="space-y-4">
          {filtered.map((p: Product) => (
            <div key={p.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{p.name}</p>
                  <div className="flex gap-2">
                    <Badge variant="outline">₹{p.price}</Badge>
                    <Badge variant="secondary">{p.stock} in stock</Badge>
                    {p.discount && <Badge>{p.discount}% OFF</Badge>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingId(p.id);
                      setEdit({ price: String(p.price), stock: String(p.stock), discount: String(p.discount ?? "") });
                      setEditName(p.name);
                      setEditBrand(p.brand);
                      setEditCategory(p.category);
                      setSelectedLeninSub("");
                    }}
                  >
                    Update
                  </Button>
                  <Button variant="destructive" onClick={() => deleteMutation.mutate(p.id)}>Delete</Button>
                </div>
              </div>

              {editingId === p.id && (
                <div className="mt-4 grid sm:grid-cols-3 gap-4">
                  <div>
                    <Label>Price</Label>
                    <Input type="number" value={edit.price} onChange={(e) => setEdit({ ...edit, price: e.target.value })} />
                  </div>
                  <div>
                    <Label>Stock</Label>
                    <Input type="number" value={edit.stock} onChange={(e) => setEdit({ ...edit, stock: e.target.value })} />
                  </div>
                  <div>
                    <Label>Discount (%)</Label>
                    <Input type="number" value={edit.discount} onChange={(e) => setEdit({ ...edit, discount: e.target.value })} />
                  </div>
                  <div>
                    <Label>Name</Label>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </div>
                  <div>
                    <Label>Brand</Label>
                    <Input value={editBrand} onChange={(e) => setEditBrand(e.target.value)} />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={editCategory} onValueChange={(v) => { setEditCategory(v); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {((categoriesData || []).filter((c) => !(manageSubcats || []).includes(c))).map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {editCategory.toLowerCase() === "lenin" && (
                      <div className="mt-2">
                        <Label>Lenin Subcategory</Label>
                        <Select value={selectedLeninSub} onValueChange={setSelectedLeninSub}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select subcategory" />
                          </SelectTrigger>
                          <SelectContent>
                            {manageSubcats.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <div className="sm:col-span-3 flex gap-2">
                    <Button
                      onClick={() => {
                        updateMutation.mutate({
                          id: p.id,
                          payload: {
                            price: Number(edit.price),
                            stock: Number(edit.stock),
                            discount: edit.discount ? Number(edit.discount) : undefined,
                            name: editName,
                            brand: editBrand,
                            category: (editCategory.toLowerCase() === "lenin" && selectedLeninSub) ? selectedLeninSub : editCategory,
                          },
                        });
                        setEditingId(null);
                      }}
                    >
                      Save
                    </Button>
                    <Button variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminProducts;