import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Product } from "@/types/product";
import { authFetch, getRole, apiBase } from "@/lib/auth";
import { Plus, Trash2 } from "lucide-react";

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

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState("");

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const base = !q
      ? products
      : products.filter((p) => [p.name, p.brand, p.category].some((v) => (v || "").toLowerCase().includes(q)));
    const cat = selectedCategory?.toLowerCase();
    const afterCat = cat
      ? base.filter((p) => (p.category || "").toLowerCase().includes(cat))
      : base;
    const afterSub = cat === "lenin" && selectedSub
      ? afterCat.filter((p) => (p.category || "").toLowerCase() === selectedSub.toLowerCase())
      : afterCat;
    const loc = localSearch.trim().toLowerCase();
    return loc && cat
      ? afterSub.filter((p) => (p.name || "").toLowerCase().includes(loc))
      : afterSub;
  }, [products, searchTerm, selectedCategory, selectedSub, localSearch]);

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
      const res = await fetch(`${apiBase}/api/categories`);
      return res.json();
    },
  });
  const catCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (categoriesData || []).forEach((c) => {
      const lc = c.toLowerCase();
      counts[c] = (products || []).filter((p) => (p.category || "").toLowerCase().includes(lc)).length;
    });
    return counts;
  }, [products, categoriesData]);

  const [manageCategory] = useState<string>("Lenin");
  const { data: manageSubcats = [] } = useQuery<string[]>({
    queryKey: ["subcategories", manageCategory],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/api/subcategories?category=${encodeURIComponent(manageCategory)}`);
      return res.json();
    },
  });
  const subCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (manageSubcats || []).forEach((s) => {
      const lc = s.toLowerCase();
      counts[s] = (products || []).filter((p) => (p.category || "").toLowerCase() === lc).length;
    });
    const leninAll = (products || []).filter((p) => {
      const lc = (p.category || "").toLowerCase();
      if (lc.includes("lenin")) return true;
      return (manageSubcats || []).some((s) => lc === s.toLowerCase());
    }).length;
    counts["__ALL_LENIN__"] = leninAll;
    return counts;
  }, [products, manageSubcats]);
  useEffect(() => {
    if ((selectedCategory || "").toLowerCase() !== "lenin") setSelectedSub(null);
  }, [selectedCategory]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ price: string; stock: string; discount: string; onSale: boolean; isBestSeller: boolean }>({ price: "", stock: "", discount: "", onSale: false, isBestSeller: false });
  const [editName, setEditName] = useState("");
  
  const [editCategory, setEditCategory] = useState("");
  const [selectedLeninSub, setSelectedLeninSub] = useState<string>("");
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editOriginalPrice, setEditOriginalPrice] = useState<string>("");
  const [editSaveAmount, setEditSaveAmount] = useState<string>("");

  const handleKeyDown = (e: React.KeyboardEvent, p: Product) => {
    if (e.key === "Enter") {
        e.preventDefault();
        updateMutation.mutate({
            id: p.id,
            payload: {
                price: Number(edit.price),
                stock: Number(edit.stock),
                discount: edit.discount ? Number(edit.discount) : undefined,
                name: editName,
                category: (editCategory.toLowerCase() === "lenin" && selectedLeninSub) ? selectedLeninSub : editCategory,
                images: editImages,
                originalPrice: editOriginalPrice ? Number(editOriginalPrice) : undefined,
                saveAmount: editSaveAmount ? Number(editSaveAmount) : undefined,
                onSale: edit.onSale,
                isBestSeller: edit.isBestSeller,
            },
        });
        setEditingId(null);
    }
  };

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

      <section className="mb-8">
        <h2 className="text-sm font-semibold mb-3">Categories</h2>
        <div className="md:hidden -mx-4 px-4 overflow-x-auto snap-x snap-mandatory">
          <div className="flex gap-2">
            <button onClick={() => setSelectedCategory(null)} className={`group snap-start rounded-lg border px-3 py-2 ${selectedCategory === null ? "bg-accent/10" : "bg-card"}`}>
              <div className="text-sm font-semibold">All [{products.length}]</div>
            </button>
            {(categoriesData || []).map((c) => (
              <button key={c} onClick={() => setSelectedCategory(c)} className={`group snap-start rounded-lg border px-3 py-2 ${selectedCategory?.toLowerCase() === c.toLowerCase() ? "bg-primary/10 ring-1 ring-primary" : "bg-card"}`}>
                <div className="text-sm font-semibold">
                  {c} [{catCounts[c] ?? 0}]
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="hidden md:flex flex-wrap gap-2">
          <button onClick={() => setSelectedCategory(null)} className={`rounded-lg border px-3 py-2 ${selectedCategory === null ? "bg-accent/10" : "bg-card"}`}>
            <div className="text-sm font-semibold">All [{products.length}]</div>
          </button>
          {(categoriesData || []).map((c) => (
            <button key={c} onClick={() => setSelectedCategory(c)} className={`rounded-lg border px-3 py-2 ${selectedCategory?.toLowerCase() === c.toLowerCase() ? "bg-primary/10 ring-1 ring-primary" : "bg-card"}`}>
              <div className="text-sm font-semibold truncate">{c} [{catCounts[c] ?? 0}]</div>
            </button>
          ))}
        </div>
      </section>

      {(selectedCategory || "").toLowerCase() === "lenin" && (
        <div className="bg-card rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold mb-2">Subcategories</h3>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSelectedSub(null)} className={`rounded-lg border px-3 py-2 ${selectedSub === null ? "bg-accent/10" : "bg-card"}`}>
              <div className="text-sm font-semibold">All [{subCounts["__ALL_LENIN__"] ?? 0}]</div>
            </button>
            {(manageSubcats || []).map((s) => (
              <button key={s} onClick={() => setSelectedSub(s)} className={`rounded-lg border px-3 py-2 ${selectedSub?.toLowerCase() === s.toLowerCase() ? "bg-primary/10 ring-1 ring-primary" : "bg-card"}`}>
                <div className="text-sm font-semibold truncate">{s} [{subCounts[s] ?? 0}]</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Add</span>
            <span className="mx-2">›</span>
            <span>{selectedCategory ?? "All"}</span>
            <span className="mx-2">›</span>
            <span>{selectedCategory?.toLowerCase() === "lenin" ? (selectedSub || "All") : "-"}</span>
            <span className="mx-2">›</span>
            <span>{localSearch ? localSearch : "All Products"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder={selectedCategory ? `Search in ${selectedSub || selectedCategory}` : "Select a category to search"}
              className="w-[240px]"
              disabled={!selectedCategory}
            />
            <Button variant="outline" disabled={!selectedCategory} onClick={() => setLocalSearch(localSearch.trim())}>Search</Button>
          </div>
        </div>
        <div className="space-y-4">
          {filtered.map((p: Product) => (
            <div key={p.id} className="border rounded-lg p-2 relative hover:bg-accent/5 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 flex-shrink-0">
                    <img src={(p.images?.[0] && !String(p.images?.[0]).startsWith("blob:")) ? p.images![0] : "/placeholder.svg"} alt={p.name} className="w-full h-full rounded object-cover border" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate text-sm">{p.name}</p>
                    <div className="flex flex-wrap gap-1 text-xs">
                      <span className="text-muted-foreground">₹{p.price}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">{p.stock} in stock</span>
                      {p.onSale && <Badge variant="secondary" className="h-4 px-1 text-[10px]">Sale</Badge>}
                      {p.isBestSeller && <Badge variant="outline" className="h-4 px-1 text-[10px] border-green-600 text-green-600">Best Seller</Badge>}
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute top-2 right-2 flex gap-1">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8 rounded-full"
                  onClick={() => {
                    if (editingId === p.id) {
                      setEditingId(null);
                    } else {
                      setEditingId(p.id);
                      setEdit({ price: String(p.price), stock: String(p.stock), discount: String(p.discount ?? ""), onSale: !!p.onSale, isBestSeller: !!p.isBestSeller });
                      setEditName(p.name);
                      
                      setEditCategory(p.category);
                      setSelectedLeninSub("");
                      setEditImages((p.images || []).filter((u) => typeof u === "string" && u && !String(u).startsWith("blob:")));
                      setEditOriginalPrice(p.originalPrice ? String(p.originalPrice) : "");
                      setEditSaveAmount(p.saveAmount ? String(p.saveAmount) : "");
                    }
                  }}
                >
                  <Plus className={`h-4 w-4 transition-transform ${editingId === p.id ? "rotate-45" : ""}`} />
                </Button>
                <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full" onClick={() => deleteMutation.mutate(p.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {editingId === p.id && (
                <form 
                  className="mt-4 grid sm:grid-cols-3 gap-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    updateMutation.mutate({
                      id: p.id,
                      payload: {
                        price: Number(edit.price),
                        stock: Number(edit.stock),
                        discount: edit.discount ? Number(edit.discount) : undefined,
                        name: editName,
                        category: (editCategory.toLowerCase() === "lenin" && selectedLeninSub) ? selectedLeninSub : editCategory,
                        images: editImages,
                        originalPrice: editOriginalPrice ? Number(editOriginalPrice) : undefined,
                        saveAmount: editSaveAmount ? Number(editSaveAmount) : undefined,
                        onSale: edit.onSale,
                        isBestSeller: edit.isBestSeller,
                      },
                    });
                    setEditingId(null);
                  }}
                >
                  <div>
                    <Label>Price</Label>
                    <Input type="number" step="0.01" value={edit.price} onChange={(e) => setEdit({ ...edit, price: e.target.value })} onKeyDown={(e) => handleKeyDown(e, p)} />
                  </div>
                  <div>
                    <Label>Stock</Label>
                    <Input type="number" value={edit.stock} onChange={(e) => setEdit({ ...edit, stock: e.target.value })} onKeyDown={(e) => handleKeyDown(e, p)} />
                  </div>
                  <div>
                    <Label>Discount (%)</Label>
                    <Input type="number" value={edit.discount} onChange={(e) => setEdit({ ...edit, discount: e.target.value })} onKeyDown={(e) => handleKeyDown(e, p)} />
                  </div>
                  <div>
                    <Label>Cutoff</Label>
                    <Input type="number" value={editOriginalPrice} onChange={(e) => setEditOriginalPrice(e.target.value)} onKeyDown={(e) => handleKeyDown(e, p)} />
                  </div>
                  <div>
                    <Label>Save Amount</Label>
                    <Input type="number" value={editSaveAmount} onChange={(e) => setEditSaveAmount(e.target.value)} onKeyDown={(e) => handleKeyDown(e, p)} />
                  </div>
                  <div>
                    <Label>Name</Label>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => handleKeyDown(e, p)} />
                  </div>
                  <div className="sm:col-span-3 flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2 border px-3 py-2 rounded-md bg-accent/10">
                        <input 
                          type="checkbox" 
                          id={`edit-onSale-${p.id}`}
                          checked={edit.onSale} 
                          onChange={(e) => setEdit({ ...edit, onSale: e.target.checked })} 
                          className="w-5 h-5 accent-primary cursor-pointer"
                        />
                        <Label htmlFor={`edit-onSale-${p.id}`} className="font-semibold cursor-pointer select-none">On Sale</Label>
                    </div>
                    <div className="flex items-center gap-2 border px-3 py-2 rounded-md bg-accent/10">
                        <input 
                          type="checkbox" 
                          id={`edit-isBestSeller-${p.id}`}
                          checked={edit.isBestSeller} 
                          onChange={(e) => setEdit({ ...edit, isBestSeller: e.target.checked })} 
                          className="w-5 h-5 accent-primary cursor-pointer"
                        />
                        <Label htmlFor={`edit-isBestSeller-${p.id}`} className="font-semibold cursor-pointer select-none">Best Seller</Label>
                    </div>
                    {editOriginalPrice && (
                      <span className="text-muted-foreground line-through">₹{Number(editOriginalPrice).toLocaleString()}</span>
                    )}
                    {editSaveAmount && (
                      <Badge variant="secondary">Save ₹{Number(editSaveAmount).toLocaleString()}</Badge>
                    )}
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
                  <div className="sm:col-span-3">
                    <div className="flex items-center justify-between">
                      <Label>Images</Label>
                      <div className="flex gap-2">
                        <input id={`add-images-${p.id}`} type="file" accept="image/*" multiple className="hidden" onChange={async (e) => {
                          const list = Array.from(e.target.files || []);
                          if (!list.length) return;
                          const fd = new FormData();
                          list.forEach((f) => fd.append("files", f));
                          const res = await authFetch("/api/upload", { method: "POST", body: fd });
                          const data = await res.json();
                          const urls = data.urls || [];
                          setEditImages((imgs) => [...imgs, ...urls]);
                          const el = document.getElementById(`add-images-${p.id}`) as HTMLInputElement | null;
                          if (el) el.value = "";
                        }} />
                        <Button type="button" variant="secondary" onClick={() => (document.getElementById(`add-images-${p.id}`) as HTMLInputElement | null)?.click()}>Add Images</Button>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 sm:grid-cols-5 gap-3">
                      {editImages.map((src, idx) => (
                        <div key={src + String(idx)} className="relative">
                          <img src={src || "/placeholder.svg"} alt="img" className="w-full h-24 rounded-md object-cover border" />
                          <Button size="sm" variant="destructive" className="absolute top-1 right-1 h-7" onClick={() => setEditImages((arr) => arr.filter((_, i) => i !== idx))}>Remove</Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="sm:col-span-3 flex gap-2">
                    <Button type="submit">
                      Save
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                  </div>
                </form>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminProducts;