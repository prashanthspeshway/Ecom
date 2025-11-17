import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { authFetch, getRole } from "@/lib/auth";
import type { Product } from "@/types/product";
import { ImagePlus, FileUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { categories as categoryList } from "@/data/products";

const Admin = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const role = getRole();

  useEffect(() => {
    if (role !== "admin") navigate("/login");
  }, [role, navigate]);

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const res = await authFetch("/api/products");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Partial<Product> & { price: number; stock?: number }) => {
      const res = await authFetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Create failed");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-products"] }),
  });

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-products"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-products"] }),
  });

  const [form, setForm] = useState<{ name: string; brand: string; price: string; images: string; stock: string; category: string; discount: string }>({
    name: "",
    brand: "",
    price: "",
    images: "",
    stock: "",
    category: "",
    discount: "",
  });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [files, setFiles] = useState<(File | null)[]>([null, null, null, null, null]);
  const [filePickerIndex, setFilePickerIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ price: string; stock: string; discount: string }>({ price: "", stock: "", discount: "" });
  const [editName, setEditName] = useState("");
  const [editBrand, setEditBrand] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState(0);

  return (
    <div className="container px-4 py-8">
      <h1 className="font-serif text-3xl md:text-4xl font-bold mb-6">Admin Panel</h1>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-card rounded-lg p-6 space-y-4">
          <h2 className="font-serif text-2xl font-bold">Add Product</h2>
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Brand</Label>
            <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          </div>
          <div>
            <Label>Price</Label>
            <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <div>
            <Label>Discount (%)</Label>
            <Input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
          </div>
          <div>
            <Label>Thumbnail</Label>
            <div className="relative">
              <Input value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })} />
              <input
                id="thumb-file"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setThumbnailFile(f);
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1"
                onClick={() => {
                  const el = document.getElementById("thumb-file") as HTMLInputElement | null;
                  el?.click();
                }}
              >
                <FileUp className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <Label>Upload Images</Label>
            <div className="grid grid-cols-5 gap-2">
              {[0,1,2,3,4].map((i) => (
                <button
                  key={i}
                  type="button"
                  className="relative w-16 h-16 rounded-md overflow-hidden border bg-card flex items-center justify-center"
                  onClick={() => {
                    setFilePickerIndex(i);
                    const el = document.getElementById("multi-file-picker") as HTMLInputElement | null;
                    el?.click();
                  }}
                >
                  {files[i] ? (
                    <img src={URL.createObjectURL(files[i]!)} alt="img" className="w-full h-full object-cover" />
                  ) : (
                    <ImagePlus className="h-6 w-6 text-muted-foreground" />
                  )}
                </button>
              ))}
              <input
                id="multi-file-picker"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  if (filePickerIndex === null) return;
                  const next = [...files];
                  next[filePickerIndex] = f;
                  setFiles(next);
                  setFilePickerIndex(null);
                }}
              />
            </div>
          </div>
          <div>
            <Label>Stock</Label>
            <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          </div>
          <div>
            <Label>Category</Label>
            <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
          <Button
            onClick={async () => {
              let thumbUrl: string | null = null;
              if (thumbnailFile) {
                const tfd = new FormData();
                tfd.append("files", thumbnailFile);
                const tres = await authFetch("/api/upload", { method: "POST", body: tfd });
                const tdata = await tres.json();
                thumbUrl = (tdata.urls || [])[0] || null;
              }
              let uploaded: string[] = [];
              const selected = files.filter(Boolean) as File[];
              if (selected.length) {
                const fd = new FormData();
                selected.forEach((f) => fd.append("files", f));
                const res = await authFetch("/api/upload", { method: "POST", body: fd });
                const data = await res.json();
                uploaded = data.urls || [];
              }
              const thumbInputUrl = form.images.trim();
              const firstImage = thumbUrl || (thumbInputUrl ? thumbInputUrl : undefined);
              const urls = [] as string[];
              const imagesArray = firstImage ? [firstImage, ...uploaded, ...urls] : [...uploaded, ...urls];
              createMutation.mutate({
                name: form.name,
                brand: form.brand,
                price: Number(form.price),
                images: imagesArray,
                stock: Number(form.stock || 0),
                category: form.category,
                discount: form.discount ? Number(form.discount) : undefined,
              });
            }}
          >
            Create
          </Button>
        </div>

        <div className="bg-card rounded-lg p-6 space-y-4">
          <h2 className="font-serif text-2xl font-bold">Product Preview</h2>
          {form.name && (
            <div className="space-y-3">
              {(() => {
                const sources = [
                  thumbnailFile ? URL.createObjectURL(thumbnailFile) : (form.images.trim() || ""),
                  ...files.map((f) => (f ? URL.createObjectURL(f) : "")),
                ].filter(Boolean);
                const current = sources[selectedPreviewIndex] || sources[0] || "/placeholder.svg";
                return (
                  <>
                    <div className="relative overflow-hidden rounded-lg bg-card aspect-square mb-4">
                      <img src={current} alt={form.name} className="h-full w-full object-cover" />
                      {form.discount && (
                        <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground">
                          {form.discount}% OFF
                        </Badge>
                      )}
                    </div>
                    {sources.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {sources.map((src, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedPreviewIndex(index)}
                            className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 ${
                              selectedPreviewIndex === index ? "border-primary" : "border-transparent"
                            }`}
                          >
                            <img src={src} alt={`preview ${index + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
              <h3 className="font-serif text-lg font-medium">{form.name}</h3>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">₹{form.price}</span>
              </div>
            </div>
          )}
        </div>

        <div className="md:col-span-2 bg-card rounded-lg p-6">
          <h2 className="font-serif text-2xl font-bold mb-4">Products</h2>
          <div className="space-y-4">
            {products.map((p: Product) => (
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
                      <Select value={editCategory} onValueChange={(v) => setEditCategory(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categoryList.map((c) => (
                            <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                              category: editCategory,
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
    </div>
  );
};

export default Admin;