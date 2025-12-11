import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { authFetch, apiBase } from "@/lib/auth";
import type { Product } from "@/types/product";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";

export function AdminFeaturedCollectionDialog() {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const res = await authFetch("/api/products");
      return res.json();
    },
    enabled: selectorOpen,
  });

  const { data: categoriesData = [] } = useQuery<string[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/api/categories`);
      return res.json();
    },
    enabled: selectorOpen,
  });

  const { data: manageSubcats = [] } = useQuery<string[]>({
    queryKey: ["subcategories", "Lenin"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/api/subcategories?category=Lenin`);
      return res.json();
    },
    enabled: selectorOpen && selectedCategory?.toLowerCase() === "lenin",
  });

  const [activeSlot, setActiveSlot] = useState<number | null>(null);

  const { data: featuredList = [] } = useQuery<Product[]>({
    queryKey: ["featured-collection"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/api/featured`);
      return res.json();
    },
  });

  const saveFeaturedMutation = useMutation({
    mutationFn: async (newIds: string[]) => {
      const res = await authFetch("/api/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: newIds }),
      });
      if (!res.ok) throw new Error("Save failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["featured-collection"] });
    },
  });

  const handleSlotClick = (index: number) => {
    setActiveSlot(index);
    setSelectorOpen(true);
  };

  const handleSlotSelect = (product: Product) => {
    if (activeSlot === null) return;
    const currentIds = Array(5).fill(null).map((_, i) => featuredList[i]?.id || null);
    currentIds[activeSlot] = product.id;
    saveFeaturedMutation.mutate(currentIds.filter(Boolean) as string[]);
    setSelectorOpen(false);
    setActiveSlot(null);
  };

  const handleRemoveFromSlot = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const currentIds = Array(5).fill(null).map((_, i) => featuredList[i]?.id || null);
    currentIds[index] = null;
    saveFeaturedMutation.mutate(currentIds.filter(Boolean) as string[]);
  };

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
      
    return afterSub;
  }, [products, searchTerm, selectedCategory, selectedSub]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {Array(5).fill(null).map((_, i) => {
          const product = featuredList[i];
          return (
            <div 
              key={i}
              onClick={() => handleSlotClick(i)}
              className={`
                relative aspect-[3/4] border-2 border-dashed rounded-lg cursor-pointer flex flex-col items-center justify-center text-center transition-all hover:bg-accent/50
                ${product ? "border-solid border-border bg-card" : "border-muted-foreground/30"}
              `}
            >
              {product ? (
                <>
                  <img 
                    src={(product.images?.[0] && !String(product.images?.[0]).startsWith("blob:")) ? product.images![0] : "/placeholder.svg"} 
                    alt={product.name} 
                    className="w-full h-full object-cover rounded-md" 
                  />
                  <button 
                    onClick={(e) => handleRemoveFromSlot(e, i)}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center shadow-sm hover:bg-destructive/90 z-10"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] p-2 truncate rounded-b-md">
                    {product.name}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Plus className="w-8 h-8 opacity-50" />
                  <span className="text-xs font-medium">Add Product</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={selectorOpen} onOpenChange={(v) => {
        setSelectorOpen(v);
        if (!v) setActiveSlot(null);
      }}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Product for Slot #{activeSlot !== null ? activeSlot + 1 : ""}</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col gap-4 py-4 flex-1 overflow-hidden">
            {/* Filters */}
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="Search products..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              
              {/* Categories */}
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => { setSelectedCategory(null); setSelectedSub(null); }} 
                  className={`rounded-lg border px-3 py-1 text-sm ${selectedCategory === null ? "bg-primary text-primary-foreground" : "bg-card hover:bg-accent"}`}
                >
                  All
                </button>
                {categoriesData.map((c) => (
                  <button 
                    key={c} 
                    onClick={() => { setSelectedCategory(c); setSelectedSub(null); }} 
                    className={`rounded-lg border px-3 py-1 text-sm ${selectedCategory === c ? "bg-primary text-primary-foreground" : "bg-card hover:bg-accent"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* Subcategories for Lenin */}
              {selectedCategory?.toLowerCase() === "lenin" && (
                <div className="flex flex-wrap gap-2 ml-4">
                  <button 
                    onClick={() => setSelectedSub(null)} 
                    className={`rounded-lg border px-2 py-1 text-xs ${selectedSub === null ? "bg-secondary text-secondary-foreground" : "bg-card hover:bg-accent"}`}
                  >
                    All Lenin
                  </button>
                  {manageSubcats.map((s) => (
                    <button 
                      key={s} 
                      onClick={() => setSelectedSub(s)} 
                      className={`rounded-lg border px-2 py-1 text-xs ${selectedSub === s ? "bg-secondary text-secondary-foreground" : "bg-card hover:bg-accent"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product List */}
            <div className="flex-1 overflow-y-auto border rounded-md p-2 space-y-2">
              {filtered.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No products found</div>
              ) : (
                filtered.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-2 border rounded hover:bg-accent/50">
                    <div className="flex items-center gap-3">
                      <img 
                        src={(p.images?.[0] && !String(p.images?.[0]).startsWith("blob:")) ? p.images![0] : "/placeholder.svg"} 
                        alt={p.name} 
                        className="w-12 h-12 rounded object-cover border" 
                      />
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.category} {p.category.toLowerCase() === "lenin" ? `- ${p.category}` : ""} • ₹{p.price}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <Button 
                         size="sm" 
                         onClick={() => handleSlotSelect(p)}
                         disabled={featuredList.some(cp => cp?.id === p.id)}
                       >
                         {featuredList.some(cp => cp?.id === p.id) ? "Selected" : "Select"}
                       </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="pt-2 border-t flex justify-between items-center text-sm text-muted-foreground">
              <div>Showing {filtered.length} products</div>
              <Button onClick={() => setSelectorOpen(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

