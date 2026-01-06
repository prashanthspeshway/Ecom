import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { authFetch, getRole, getToken, getApiUrl, syncRoleFromBackend } from "@/lib/auth";
 
import type { Product } from "@/types/product";
import { ImagePlus, FileUp } from "lucide-react";
import { Trash, X, Pencil, Plus } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";

const Admin = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [role, setRole] = useState<string | null>(getRole());
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = getToken();
      if (!token) {
        navigate("/login");
        return;
      }
      
      // Check localStorage first - if admin, allow immediately
      const currentRole = getRole();
      if (currentRole === "admin") {
        setIsAuthorized(true);
        setIsChecking(false);
      }
      
      // Verify with backend in background
      try {
        const res = await authFetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          const backendRole = data.role || data.user?.role || null;
          if (backendRole && backendRole !== "undefined") {
            localStorage.setItem("auth_role", backendRole);
            setRole(backendRole);
            if (backendRole === "admin") {
              setIsAuthorized(true);
            } else {
              // Not admin, redirect
              navigate("/login");
            }
          }
        }
        setIsChecking(false);
      } catch (e) {
        // If API fails but we have admin in localStorage, allow access
        if (currentRole === "admin") {
          setIsAuthorized(true);
        }
        setIsChecking(false);
      }
    };
    
    checkAuth();
  }, [navigate]);

  // Check authorization
  const currentRole = getRole();
  const hasToken = getToken();
  const isAdmin = currentRole === "admin" || isAuthorized;
  
  // Show loading while checking (only if we don't have admin role)
  if (isChecking && !isAdmin) {
    return (
      <div className="container px-4 py-16 text-center">
        <p>Verifying admin access...</p>
      </div>
    );
  }
  
  if (!hasToken) {
    return (
      <div className="container px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold">Not Authenticated</h1>
        <p>Please log in to access the admin panel.</p>
        <Button onClick={() => navigate("/login")}>Go to Login</Button>
      </div>
    );
  }
  
  if (!isAdmin) {
    return (
      <div className="container px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p>You need admin privileges to access this page.</p>
        <p className="text-sm text-muted-foreground">Current role: {currentRole || "none"}</p>
        <Button onClick={() => navigate("/account")}>Go to Account</Button>
      </div>
    );
  }
  
  // If we get here, user is authorized - render admin panel

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.refetchQueries({ queryKey: ["admin-products"] });
      qc.refetchQueries({ queryKey: ["products"] });
      toast("Product created successfully");
      setForm(initialForm);
      setThumbnailFile(null);
      setFiles([null, null, null, null, null]);
      setSelectedPreviewIndex(0);
      setFilePickerIndex(null);
      setColorItems([]);
      const thumbEl = document.getElementById("thumb-file") as HTMLInputElement | null;
      if (thumbEl) thumbEl.value = "";
      const multiEl = document.getElementById("multi-file-picker") as HTMLInputElement | null;
      if (multiEl) multiEl.value = "";
    },
  });

  

  const initialForm = { name: "", price: "", originalPrice: "", saveAmount: "", images: "", stock: "", category: "", discount: "" };
  const [form, setForm] = useState<{ name: string; price: string; originalPrice: string; saveAmount: string; images: string; stock: string; category: string; discount: string }>({
    name: "",
    price: "",
    originalPrice: "",
    saveAmount: "",
    images: "",
    stock: "",
    category: "",
    discount: "",
  });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [files, setFiles] = useState<(File | null)[]>([null, null, null, null, null]);
  const [filePickerIndex, setFilePickerIndex] = useState<number | null>(null);
  
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState(0);
  const [colorItems, setColorItems] = useState<{ file: File | null; imageUrl?: string; url: string }[]>([]);
  const { data: categoriesData = [] } = useQuery<string[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/categories"));
      return res.json();
    },
  });
  const { data: subsByCat = {} as Record<string, string[]> } = useQuery<Record<string, string[]>>({
    queryKey: ["subcategories-preview"],
    queryFn: async () => {
      const cats = categoriesData || [];
      if (!cats.length) return {} as Record<string, string[]>;
      const entries = await Promise.all(cats.map(async (c) => {
        const res = await fetch(getApiUrl(`/api/subcategories?category=${encodeURIComponent(c)}`));
        const arr = await res.json();
        return [c, arr] as const;
      }));
      return Object.fromEntries(entries);
    },
    enabled: (categoriesData || []).length > 0,
  });

  const topCategories = (() => {
    const allSubs = new Set(Object.values(subsByCat || {}).flat());
    return (categoriesData || []).filter((c) => !allSubs.has(c));
  })();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<
    | { type: "category"; name: string }
    | { type: "sub"; category: string; name: string }
    | null
  >(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState<string>("");
  const [editingSub, setEditingSub] = useState<{ category: string; name: string } | null>(null);
  const [editingSubValue, setEditingSubValue] = useState<string>("");
  const [addingCategoryOpen, setAddingCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingSubFor, setAddingSubFor] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState("");
  const [openItem, setOpenItem] = useState<string | undefined>(undefined);
  const addCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await authFetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      if (!res.ok) throw new Error("Add category failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.refetchQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["subcategories-preview"] });
      qc.refetchQueries({ queryKey: ["subcategories-preview"] });
      toast("Category added");
      setNewCategoryName("");
      setAddingCategoryOpen(false);
    },
  });
  const delCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await authFetch(`/api/categories?name=${encodeURIComponent(name)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete category failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.refetchQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["subcategories-preview"] });
      qc.refetchQueries({ queryKey: ["subcategories-preview"] });
      toast("Category deleted");
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Delete failed";
      toast(msg);
    },
  });
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ oldName, newName }: { oldName: string; newName: string }) => {
      const res = await authFetch("/api/categories", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ oldName, newName }) });
      if (!res.ok) throw new Error("Update category failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.refetchQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["subcategories-preview", categoriesData] });
      qc.refetchQueries({ queryKey: ["subcategories-preview", categoriesData] });
      toast("Category updated");
    },
  });
  const addSubMutation = useMutation({
    mutationFn: async ({ category, name }: { category: string; name: string }) => {
      const res = await authFetch("/api/subcategories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category, name }) });
      if (!res.ok) throw new Error("Add subcategory failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subcategories"] });
      qc.refetchQueries({ queryKey: ["subcategories"] });
      toast("Subcategory added");
      qc.invalidateQueries({ queryKey: ["subcategories-preview"] });
      qc.refetchQueries({ queryKey: ["subcategories-preview"] });
      setAddingSubFor(null);
      setNewSubName("");
    },
  });
  const updateSubMutation = useMutation({
    mutationFn: async ({ category, oldName, newName }: { category: string; oldName: string; newName: string }) => {
      const res = await authFetch("/api/subcategories", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category, oldName, newName }) });
      if (!res.ok) throw new Error("Update subcategory failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subcategories"] });
      qc.refetchQueries({ queryKey: ["subcategories"] });
      qc.invalidateQueries({ queryKey: ["subcategories-preview"] });
      qc.refetchQueries({ queryKey: ["subcategories-preview"] });
      toast("Subcategory updated");
    },
  });
  const delSubMutation = useMutation({
    mutationFn: async ({ category, name }: { category: string; name: string }) => {
      const res = await authFetch(`/api/subcategories?category=${encodeURIComponent(category)}&name=${encodeURIComponent(name)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete subcategory failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subcategories"] });
      qc.refetchQueries({ queryKey: ["subcategories"] });
      qc.invalidateQueries({ queryKey: ["subcategories-preview"] });
      qc.refetchQueries({ queryKey: ["subcategories-preview"] });
      toast("Subcategory deleted");
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Delete failed";
      toast(msg);
    },
  });
  const [selectedSub, setSelectedSub] = useState<string>("");
  const { data: formSubcats = [] } = useQuery<string[]>({
    queryKey: ["subcategories", form.category],
    queryFn: async () => {
      const cat = form.category;
      if (!cat) return [];
      const res = await fetch(getApiUrl(`/api/subcategories?category=${encodeURIComponent(cat)}`));
      return res.json();
    },
    enabled: !!form.category,
  });
  const { data: banners = [] } = useQuery<string[]>({
    queryKey: ["banners"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/banners"));
      return res.json();
    },
  });
  const [bannerCropImage, setBannerCropImage] = useState<string | null>(null);
  const [bannerCrop, setBannerCrop] = useState({ x: 0, y: 0 });
  const [bannerZoom, setBannerZoom] = useState(1);
  const [bannerCroppedAreaPixels, setBannerCroppedAreaPixels] = useState<Area | null>(null);
  const [isEditingBanner, setIsEditingBanner] = useState(false);

  // Banner crop functions
  const onBannerCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setBannerCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createBannerImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      if (url.startsWith("https://") && !url.startsWith("blob:")) {
        image.crossOrigin = "anonymous";
      }
      const timeout = setTimeout(() => {
        reject(new Error("Image load timeout"));
      }, 10000);
      image.addEventListener("load", () => {
        clearTimeout(timeout);
        if (image.naturalWidth === 0 || image.naturalHeight === 0) {
          reject(new Error("Image failed to load properly"));
        } else {
          resolve(image);
        }
      });
      image.addEventListener("error", () => {
        clearTimeout(timeout);
        reject(new Error("Failed to load image"));
      });
      image.src = url;
    });

  const getBannerCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area
  ): Promise<Blob> => {
    const image = await createBannerImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("No 2d context");
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const sourceX = pixelCrop.x * scaleX;
    const sourceY = pixelCrop.y * scaleY;
    const sourceWidth = pixelCrop.width * scaleX;
    const sourceHeight = pixelCrop.height * scaleY;

    const outputWidth = Math.round(pixelCrop.width);
    const outputHeight = Math.round(pixelCrop.height);
    
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(
      image,
      Math.round(sourceX),
      Math.round(sourceY),
      Math.round(sourceWidth),
      Math.round(sourceHeight),
      0,
      0,
      outputWidth,
      outputHeight
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to create blob"));
          }
        },
        "image/jpeg",
        0.95
      );
    });
  };

  const handleBannerCropComplete = async () => {
    if (!bannerCropImage || !bannerCroppedAreaPixels) {
      toast.error("Please crop the image first");
      return;
    }

    try {
      if (bannerCroppedAreaPixels.width <= 0 || bannerCroppedAreaPixels.height <= 0) {
        toast.error("Invalid crop area");
        return;
      }

      const croppedBlob = await getBannerCroppedImg(bannerCropImage, bannerCroppedAreaPixels);
      
      if (!croppedBlob || croppedBlob.size === 0) {
        toast.error("Failed to create cropped image");
        return;
      }

      const croppedFile = new File([croppedBlob], `banner-${Date.now()}.jpg`, { type: "image/jpeg" });
      const fd = new FormData();
      fd.append("files", croppedFile);
      
      const res = await authFetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        toast.error("Failed to upload cropped image");
        return;
      }

      const data = await res.json();
      const urls = data.urls || [];
      if (urls.length) {
        // Delete all existing banners first
        if (banners.length > 0) {
          const deletePromises = banners.map(banner => 
            authFetch("/api/banners", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: banner }),
            })
          );
          await Promise.all(deletePromises);
        }
        // Add new banner
        addBannersMutation.mutate([urls[0]]);
        toast.success("Banner cropped and uploaded successfully");
      }

      // Close crop dialog
      if (bannerCropImage.startsWith("blob:")) {
        URL.revokeObjectURL(bannerCropImage);
      }
      setBannerCropImage(null);
      setBannerCroppedAreaPixels(null);
      setIsEditingBanner(false);
    } catch (e: any) {
      console.error("Banner crop error:", e);
      toast.error(e?.message || "Failed to crop banner");
    }
  };

  const handleBannerCropCancel = () => {
    if (bannerCropImage && bannerCropImage.startsWith("blob:")) {
      URL.revokeObjectURL(bannerCropImage);
    }
    setBannerCropImage(null);
    setBannerCroppedAreaPixels(null);
    setIsEditingBanner(false);
  };

  const handleBannerFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    setBannerCropImage(imageUrl);
    setBannerCrop({ x: 0, y: 0 });
    setBannerZoom(1);
    setBannerCroppedAreaPixels(null);
    setIsEditingBanner(true);
    
    e.target.value = "";
  };
  const { data: carousel = [] } = useQuery<string[]>({
    queryKey: ["carousel"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/carousel"));
      return res.json();
    },
  });
  const saveCarouselMutation = useMutation({
    mutationFn: async (images: string[]) => {
      const res = await authFetch("/api/carousel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ images }) });
      if (!res.ok) throw new Error("Save carousel failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["carousel"] });
      qc.refetchQueries({ queryKey: ["carousel"] });
      toast("Carousel updated");
    },
  });
  const addBannersMutation = useMutation({
    mutationFn: async (urls: string[]) => {
      const res = await authFetch("/api/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Add banners failed");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["banners"] });
      qc.refetchQueries({ queryKey: ["banners"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add banners");
    },
  });
  const deleteBannerMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await authFetch("/api/banners", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Delete banner failed");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["banners"] });
      qc.refetchQueries({ queryKey: ["banners"] });
      toast.success("Banner removed successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete banner");
    },
  });

  const [adminSearchTerm, setAdminSearchTerm] = useState("");

  function ProductSelectionDialog({ 
    open, 
    onOpenChange, 
    onSelect, 
    products, 
    categoriesData 
  }: { 
    open: boolean; 
    onOpenChange: (open: boolean) => void; 
    onSelect: (productId: string) => void;
    products: Product[];
    categoriesData: string[];
  }) {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const filteredProducts = useMemo(() => {
      let filtered = products;
      
      // Filter by category
      if (selectedCategory) {
        filtered = filtered.filter((p) => 
          (p.category || "").toLowerCase().includes(selectedCategory.toLowerCase())
        );
      }
      
      // Filter by search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter((p) =>
          [p.name, p.brand, p.category].some((v) => (v || "").toLowerCase().includes(term))
        );
      }
      
      return filtered;
    }, [products, selectedCategory, searchTerm]);

    const catCounts = useMemo(() => {
      const counts: Record<string, number> = {};
      (categoriesData || []).forEach((c) => {
        const lc = c.toLowerCase();
        counts[c] = (products || []).filter((p) => (p.category || "").toLowerCase().includes(lc)).length;
      });
      return counts;
    }, [products, categoriesData]);

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select a Product</DialogTitle>
            <DialogDescription>
              Choose a product to add. You can filter by category or search by name.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Search */}
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products..."
              className="w-full"
            />

            {/* Categories */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Categories</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    selectedCategory === null ? "bg-primary/10 ring-1 ring-primary" : "bg-card"
                  }`}
                >
                  All [{products.length}]
                </button>
                {(categoriesData || []).map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedCategory(c)}
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      selectedCategory?.toLowerCase() === c.toLowerCase()
                        ? "bg-primary/10 ring-1 ring-primary"
                        : "bg-card"
                    }`}
                  >
                    {c} [{catCounts[c] ?? 0}]
                  </button>
                ))}
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="border rounded-lg p-3 cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => {
                    onSelect(product.id);
                    onOpenChange(false);
                  }}
                >
                  <img
                    src={(product.images?.[0] && !String(product.images[0]).startsWith("blob:")) 
                      ? product.images[0] 
                      : "/placeholder.svg"}
                    alt={product.name}
                    className="w-full h-32 object-cover rounded-md mb-2"
                  />
                  <p className="text-sm font-semibold truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.category}</p>
                  <p className="text-sm font-bold mt-1">₹{product.price.toLocaleString()}</p>
                </div>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No products found. Try adjusting your filters.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  function BestSellersManager({ products }: { products: Product[] }) {
    const qc = useQueryClient();
    const { data: current = [] } = useQuery<Product[]>({
      queryKey: ["bestsellers"],
      queryFn: async () => {
        const res = await authFetch("/api/bestsellers");
        return res.json();
      },
    });
    const [slotIds, setSlotIds] = useState<string[]>(["", "", "", "", ""]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
    
    useEffect(() => {
      const ids = current.map((p) => p.id);
      setSlotIds((["", "", "", "", ""]).map((_, i) => ids[i] || ""));
    }, [current]);
    
    const saveListMutation = useMutation({
      mutationFn: async (ids: string[]) => {
        const res = await authFetch("/api/bestsellers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        if (!res.ok) throw new Error("Save failed");
        return res.json();
      },
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["bestsellers"] });
        qc.refetchQueries({ queryKey: ["bestsellers"] });
        toast("Bestsellers updated");
      },
    });

    const handleProductSelect = (productId: string) => {
      if (selectedSlotIndex !== null) {
        const newSlotIds = [...slotIds];
        newSlotIds[selectedSlotIndex] = productId;
        setSlotIds(newSlotIds);
        const arr = newSlotIds.filter(Boolean);
        saveListMutation.mutate(arr);
      }
    };

    const handleRemove = (index: number) => {
      const newSlotIds = [...slotIds];
      newSlotIds[index] = "";
      setSlotIds(newSlotIds);
      const arr = newSlotIds.filter(Boolean);
      saveListMutation.mutate(arr);
    };

    return (
      <>
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[0,1,2,3,4].map((idx) => {
              const pid = slotIds[idx] || "";
              const p = pid ? current.find((x) => x.id === pid) : undefined;
              return (
                <div key={`slot-${idx}`} className="relative">
                  {p ? (
                    <div className="relative overflow-hidden rounded-lg bg-card aspect-[3/4] border">
                      <img
                        src={(p.images?.[0] && !String(p.images[0]).startsWith("blob:")) 
                          ? p.images[0] 
                          : "/placeholder.svg"}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(idx);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div 
                      className="relative overflow-hidden rounded-lg bg-card aspect-[3/4] border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => {
                        setSelectedSlotIndex(idx);
                        setDialogOpen(true);
                      }}
                    >
                      <Plus className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <ProductSelectionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSelect={handleProductSelect}
          products={products}
          categoriesData={categoriesData || []}
        />
      </>
    );
  }

  function FeaturedCollectionManager({ products }: { products: Product[] }) {
    const qc = useQueryClient();
    const { data: current = [] } = useQuery<Product[]>({
      queryKey: ["featured"],
      queryFn: async () => {
        const res = await authFetch("/api/featured");
        return res.json();
      },
    });
    const [slotIds, setSlotIds] = useState<string[]>(["", "", "", "", ""]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
    
    useEffect(() => {
      const ids = current.map((p) => p.id);
      setSlotIds((["", "", "", "", ""]).map((_, i) => ids[i] || ""));
    }, [current]);
    
    const saveListMutation = useMutation({
      mutationFn: async (ids: string[]) => {
        const res = await authFetch("/api/featured", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        if (!res.ok) throw new Error("Save failed");
        return res.json();
      },
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["featured"] });
        qc.refetchQueries({ queryKey: ["featured"] });
        toast("Featured collection updated");
      },
    });

    const handleProductSelect = (productId: string) => {
      if (selectedSlotIndex !== null) {
        const newSlotIds = [...slotIds];
        newSlotIds[selectedSlotIndex] = productId;
        setSlotIds(newSlotIds);
        const arr = newSlotIds.filter(Boolean);
        saveListMutation.mutate(arr);
      }
    };

    const handleRemove = (index: number) => {
      const newSlotIds = [...slotIds];
      newSlotIds[index] = "";
      setSlotIds(newSlotIds);
      const arr = newSlotIds.filter(Boolean);
      saveListMutation.mutate(arr);
    };

    return (
      <>
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[0,1,2,3,4].map((idx) => {
              const pid = slotIds[idx] || "";
              const p = pid ? current.find((x) => x.id === pid) : undefined;
              return (
                <div key={`slot-${idx}`} className="relative">
                  {p ? (
                    <div className="relative overflow-hidden rounded-lg bg-card aspect-[3/4] border">
                      <img
                        src={(p.images?.[0] && !String(p.images[0]).startsWith("blob:")) 
                          ? p.images[0] 
                          : "/placeholder.svg"}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(idx);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div 
                      className="relative overflow-hidden rounded-lg bg-card aspect-[3/4] border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => {
                        setSelectedSlotIndex(idx);
                        setDialogOpen(true);
                      }}
                    >
                      <Plus className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <ProductSelectionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSelect={handleProductSelect}
          products={products}
          categoriesData={categoriesData || []}
        />
      </>
    );
  }

  function CategoryTilesManager({ categories }: { categories: string[] }) {
    const qc = useQueryClient();
    type CategoryTile = { category: string; image: string; position: number };
    const { data: tiles = [] } = useQuery<CategoryTile[]>({
      queryKey: ["category-tiles"],
      queryFn: async () => {
        const res = await authFetch("/api/category-tiles");
        return res.json();
      },
    });
    const [files, setFiles] = useState<(File | null)[]>([null, null, null, null, null, null]);
    const [values, setValues] = useState<string[]>(["", "", "", "", "", ""]);
    const [cropImage, setCropImage] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [currentPosition, setCurrentPosition] = useState<number | null>(null);

    const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const createImage = (url: string): Promise<HTMLImageElement> =>
      new Promise((resolve, reject) => {
        const image = new Image();
        // Don't set crossOrigin for blob URLs or local URLs - it causes CORS errors
        // Only set for external URLs (https://) that might need CORS
        if (url.startsWith("https://") && !url.startsWith("blob:")) {
          image.crossOrigin = "anonymous";
        }
        
        // Set timeout to catch images that never load
        const timeout = setTimeout(() => {
          reject(new Error("Image load timeout. Please check the image URL."));
        }, 10000); // 10 second timeout
        
        image.addEventListener("load", () => {
          clearTimeout(timeout);
          if (image.naturalWidth === 0 || image.naturalHeight === 0) {
            reject(new Error("Image failed to load properly"));
          } else {
            resolve(image);
          }
        });
        image.addEventListener("error", (event) => {
          clearTimeout(timeout);
          console.error("Image load error:", event, url);
          reject(new Error("Failed to load image. Please try again."));
        });
        
        image.src = url;
      });

    const getCroppedImg = async (
      imageSrc: string,
      pixelCrop: Area
    ): Promise<Blob> => {
      const image = await createImage(imageSrc);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("No 2d context");
      }

      // Get the scale factor between displayed image and natural image
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      // Calculate actual crop coordinates in natural image dimensions
      const sourceX = pixelCrop.x * scaleX;
      const sourceY = pixelCrop.y * scaleY;
      const sourceWidth = pixelCrop.width * scaleX;
      const sourceHeight = pixelCrop.height * scaleY;

      // Set canvas to exact crop size
      const outputWidth = Math.round(pixelCrop.width);
      const outputHeight = Math.round(pixelCrop.height);
      
      canvas.width = outputWidth;
      canvas.height = outputHeight;

      // Enable image smoothing for better quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Draw the cropped portion
      ctx.drawImage(
        image,
        Math.round(sourceX),
        Math.round(sourceY),
        Math.round(sourceWidth),
        Math.round(sourceHeight),
        0,
        0,
        outputWidth,
        outputHeight
      );

      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to create blob from canvas"));
            }
          },
          "image/jpeg",
          0.95
        );
      });
    };

    const handleCropComplete = async () => {
      if (!cropImage || !croppedAreaPixels || currentPosition === null) {
        toast.error("Please crop the image first");
        return;
      }

      try {
        // Validate crop area
        if (croppedAreaPixels.width <= 0 || croppedAreaPixels.height <= 0) {
          toast.error("Invalid crop area. Please adjust the crop selection.");
          return;
        }

        const croppedBlob = await getCroppedImg(cropImage, croppedAreaPixels);
        
        if (!croppedBlob || croppedBlob.size === 0) {
          toast.error("Failed to create cropped image. Please try again.");
          return;
        }

        const croppedFile = new File([croppedBlob], `cropped-image-${Date.now()}.jpg`, { type: "image/jpeg" });
        
        // Set the cropped file and close dialog
        const newFiles = [...files];
        newFiles[currentPosition] = croppedFile;
        setFiles(newFiles);
        
        // Close crop dialog
        if (cropImage.startsWith("blob:")) {
          URL.revokeObjectURL(cropImage);
        }
        setCropImage(null);
        setCroppedAreaPixels(null);
        setCurrentPosition(null);
        
        toast.success("Image cropped successfully. Click 'Add' to upload.");
      } catch (e: any) {
        console.error("Crop error:", e);
        const errorMessage = e?.message || "Failed to crop image";
        toast.error(errorMessage);
      }
    };

    const handleCropCancel = () => {
      if (cropImage && cropImage.startsWith("blob:")) {
        URL.revokeObjectURL(cropImage);
      }
      setCropImage(null);
      setCroppedAreaPixels(null);
      setCurrentPosition(null);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, pos: number) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Show crop dialog
      const imageUrl = URL.createObjectURL(file);
      setCropImage(imageUrl);
      // Initialize crop to center - will be adjusted by react-easy-crop
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setCurrentPosition(pos);
      
      // Reset file input
      e.target.value = "";
    };

    const addMutation = useMutation({
      mutationFn: async (pos: number) => {
        const category = values[pos];
        const file = files[pos];
        const existingTile = tileByPos[pos];
        
        if (!category) throw new Error("Select category");
        
        let image = existingTile?.image;
        
        // If there's a new file (cropped), upload it
        if (file) {
          const fd = new FormData();
          fd.append("files", file);
          const upRes = await authFetch("/api/upload", { method: "POST", body: fd });
          if (!upRes.ok) {
            const errorData = await upRes.json().catch(() => ({}));
            throw new Error(errorData.error || "Upload failed");
          }
          const up = await upRes.json();
          image = (up.urls || [])[0];
          if (!image) throw new Error("Failed to get uploaded image URL");
        } else if (!existingTile) {
          throw new Error("Select and crop an image");
        }
        
        const res = await authFetch("/api/category-tiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category, image, position: pos }),
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || "Save failed");
        }
        return res.json();
      },
      onSuccess: (_data, pos) => {
        qc.setQueryData<CategoryTile[]>(["category-tiles"], (old) => {
          const arr: CategoryTile[] = Array.isArray(old) ? [...old] : [];
          const idx = arr.findIndex((t) => Number(t.position) === Number(pos));
          const category = values[pos];
          if (idx >= 0) arr[idx] = { position: pos, category, image: "" };
          else arr.push({ position: pos, category, image: "" });
          return arr;
        });
        qc.invalidateQueries({ queryKey: ["category-tiles"] });
        qc.refetchQueries({ queryKey: ["category-tiles"] });
        toast.success("Category tile updated successfully");
        setFiles((fs) => { const nf = [...fs]; nf[pos] = null; return nf; });
        setEditingPosition(null);
      },
      onError: (error: Error) => {
        toast.error(error.message || "Failed to save category tile");
      },
    });
    const delMutation = useMutation({
      mutationFn: async (position: number) => {
        const res = await authFetch(`/api/category-tiles?position=${position}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Delete failed");
        return res.json();
      },
      onSuccess: (_data, position) => {
        qc.setQueryData<CategoryTile[]>(["category-tiles"], (old) => {
          const arr: CategoryTile[] = Array.isArray(old) ? [...old] : [];
          return arr.filter((t) => Number(t.position) !== Number(position));
        });
        qc.invalidateQueries({ queryKey: ["category-tiles"] });
        qc.refetchQueries({ queryKey: ["category-tiles"] });
      },
    });
    const tileByPos: Record<number, { category: string; image: string } | undefined> = {};
    for (const t of tiles) tileByPos[t.position] = { category: t.category, image: t.image };
    
    // Initialize values from existing tiles on mount
    useEffect(() => {
      if (tiles.length > 0) {
        const newValues = [...values];
        tiles.forEach((tile) => {
          if (tile.position >= 0 && tile.position < 6) {
            newValues[tile.position] = tile.category;
          }
        });
        setValues(newValues);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run once on mount
    
    return (
      <div className="space-y-6">
        {[0,1,2,3,4,5].map((pos) => (
          <div key={pos} className="flex items-center gap-3">
            <select
              className="border rounded-md px-2 py-1 bg-background"
              value={values[pos]}
              onChange={(e) => setValues((v) => { const nv = [...v]; nv[pos] = e.target.value; return nv; })}
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => handleFileSelect(e, pos)}
              className="text-sm"
            />
            <Button 
              onClick={() => addMutation.mutate(pos)} 
              disabled={!values[pos] || addMutation.isPending}
            >
              {addMutation.isPending ? "Saving..." : (tileByPos[pos] ? "Update" : "Add")}
            </Button>
            {tileByPos[pos] && (
              <div className="flex items-center gap-2">
                <img src={tileByPos[pos]!.image || "/placeholder.svg"} alt={tileByPos[pos]!.category} className="w-16 h-16 rounded object-cover" />
                <span className="text-sm">{tileByPos[pos]!.category}</span>
                <Button variant="destructive" size="sm" onClick={() => delMutation.mutate(pos)}>Remove</Button>
              </div>
            )}
          </div>
        ))}
        
        {/* Image Crop Dialog */}
        <Dialog open={!!cropImage} onOpenChange={(open) => !open && handleCropCancel()}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Crop Image for Category Tile</DialogTitle>
            </DialogHeader>
            {cropImage && (
              <div className="space-y-4">
                <div className="relative w-full h-[500px] bg-black rounded-lg overflow-hidden">
                  <Cropper
                    image={cropImage}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                    cropShape="rect"
                    showGrid={true}
                    restrictPosition={false}
                    minZoom={0.5}
                    maxZoom={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Zoom</Label>
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={handleCropCancel}>
                    Cancel
                  </Button>
                  <Button onClick={handleCropComplete} disabled={!croppedAreaPixels}>
                    Apply Crop
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  function CarouselItemEditor({ index, currentUrl, onSave, onRemove }: { index: number; currentUrl?: string; onSave: (file: File | null) => void; onRemove: () => void }) {
    const [file, setFile] = useState<File | null>(null);
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="relative w-24 h-16 rounded-md overflow-hidden border bg-card flex items-center justify-center"
            onClick={() => (document.getElementById(`carousel-file-${index}`) as HTMLInputElement | null)?.click()}
          >
            {file ? (
              <img src={URL.createObjectURL(file)} alt="carousel" className="w-full h-full object-cover" />
            ) : currentUrl ? (
              <img src={currentUrl} alt="carousel" className="w-full h-full object-cover" />
            ) : (
              <ImagePlus className="h-6 w-6 text-muted-foreground" />
            )}
          </button>
          <input id={`carousel-file-${index}`} type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => onSave(file)} disabled={!file}>Save</Button>
          <Button variant="destructive" onClick={onRemove} disabled={!currentUrl}>Remove</Button>
        </div>
      </div>
    );
  }

  function ColorOptionsEditor() {
    return (
      <div className="space-y-3">
        {colorItems.map((ci, idx) => (
          <div key={`color-${idx}`} className="space-y-2">
            <button
              type="button"
              className="relative w-16 h-16 rounded-md overflow-hidden border bg-card flex items-center justify-center"
              onClick={() => {
                const el = document.getElementById(`color-file-${idx}`) as HTMLInputElement | null;
                el?.click();
              }}
            >
              {ci.file || ci.imageUrl ? (
                <>
                  <img src={ci.file ? URL.createObjectURL(ci.file) : (ci.imageUrl || "/placeholder.svg")} alt="color" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    className="absolute top-1 right-1 bg-background/70 rounded-md p-1"
                    onClick={(e) => { e.stopPropagation(); setColorItems((items) => items.map((it, i) => i === idx ? { ...it, file: null, imageUrl: undefined } : it)); }}
                    aria-label="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </>
              ) : (
                <ImagePlus className="h-6 w-6 text-muted-foreground" />
              )}
            </button>
            <input id={`color-file-${idx}`} type="file" accept="image/*" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setColorItems((items) => items.map((it, i) => i === idx ? { ...it, file: f, imageUrl: undefined } : it));
            }} />
            <Input
              placeholder="Target URL"
              value={ci.url}
              onChange={(e) => setColorItems((items) => items.map((it, i) => i === idx ? { ...it, url: e.target.value } : it))}
            />
            <div>
              <Button variant="destructive" size="sm" onClick={() => setColorItems((items) => items.filter((_, i) => i !== idx))}>Remove</Button>
            </div>
          </div>
        ))}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setColorItems((items) => [...items, { file: null, url: "" }])}>Add Color</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl md:text-4xl font-bold">Admin Panel</h1>
        <div className="flex items-center gap-2">
          <Input
            value={adminSearchTerm}
            onChange={(e) => setAdminSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") navigate(`/admin/products?query=${encodeURIComponent(adminSearchTerm)}`);
            }}
            placeholder="Search products"
            className="w-[260px]"
          />
          <Button onClick={() => navigate(`/admin/products?query=${encodeURIComponent(adminSearchTerm)}`)}>Search</Button>
          <Button variant="outline" onClick={() => navigate("/admin/products")}>Manage Products</Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card rounded-lg p-4 space-y-4">
          <h2 className="font-serif text-2xl font-bold">Add Product</h2>
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <Label>Price</Label>
              <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <div>
              <Label>Discount (%)</Label>
              <Input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
            </div>
            <div>
              <Label>Cutoff</Label>
              <Input type="number" value={form.originalPrice} onChange={(e) => setForm({ ...form, originalPrice: e.target.value })} />
            </div>
            <div>
              <Label>Save Amount</Label>
              <Input type="number" value={form.saveAmount} onChange={(e) => setForm({ ...form, saveAmount: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            {form.originalPrice && (
              <span className="text-muted-foreground line-through">₹{Number(form.originalPrice).toLocaleString()}</span>
            )}
            {form.saveAmount && (
              <Badge variant="secondary">Save ₹{Number(form.saveAmount).toLocaleString()}</Badge>
            )}
          </div>
          <div>
            <Label>Main Image</Label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="relative w-16 h-16 rounded-md overflow-hidden border bg-card flex items-center justify-center"
                onClick={() => {
                  const el = document.getElementById("thumb-file") as HTMLInputElement | null;
                  el?.click();
                }}
              >
                {thumbnailFile ? (
                  <>
                    <img src={URL.createObjectURL(thumbnailFile)} alt="main" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      className="absolute top-1 right-1 bg-background/70 rounded-md p-1"
                      onClick={(e) => { e.stopPropagation(); setThumbnailFile(null); }}
                      aria-label="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <ImagePlus className="h-6 w-6 text-muted-foreground" />
                )}
              </button>
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
                    <>
                      <img src={URL.createObjectURL(files[i]!)} alt="img" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        className="absolute top-1 right-1 bg-background/70 rounded-md p-1"
                        onClick={(e) => { e.stopPropagation(); const next = [...files]; next[i] = null; setFiles(next); }}
                        aria-label="Remove"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
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
          <div className="space-y-3">
            <Label>Color</Label>
            <ColorOptionsEditor />
          </div>
          <div>
            <Label>Stock</Label>
            <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          </div>
          <div>
            <Label>Category</Label>
            <div className="space-y-2">
              <Select value={form.category} onValueChange={(v) => {
                setForm({ ...form, category: v });
                setSelectedSub("");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {topCategories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.category && formSubcats.length > 0 && (
                <div>
                  <Label>Subcategory</Label>
                  <Select value={selectedSub} onValueChange={setSelectedSub}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      {formSubcats.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
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
              // prepare colorLinks from editor state
              const colorLinks = colorItems.filter((ci) => ci.file || ci.imageUrl);
              const filesToUpload = colorLinks.filter((ci) => ci.file).map((ci) => ci.file!)
              let uploadedColorUrls: string[] = [];
              if (filesToUpload.length) {
                const cfd = new FormData();
                filesToUpload.forEach((f) => cfd.append("files", f));
                const cres = await authFetch("/api/upload", { method: "POST", body: cfd });
                const cdata = await cres.json();
                uploadedColorUrls = cdata.urls || [];
              }
              let colorUrlIndex = 0;
              const finalColorLinks = colorItems.map((ci) => {
                const hasFile = !!ci.file;
                return {
                  image: hasFile ? uploadedColorUrls[colorUrlIndex++] : (ci.imageUrl || ""),
                  url: ci.url,
                };
              }).filter((x) => x.image && x.url);

              await createMutation.mutateAsync({
                name: form.name,
                price: Number(form.price),
                images: imagesArray,
                stock: Number(form.stock || 0),
                category: selectedSub || form.category,
                originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
                saveAmount: form.saveAmount ? Number(form.saveAmount) : undefined,
                discount: form.discount ? Number(form.discount) : undefined,
                colorLinks: finalColorLinks,
              });
              setForm(initialForm);
              setSelectedSub("");
              setThumbnailFile(null);
              setFiles([null, null, null, null, null]);
              setSelectedPreviewIndex(0);
              setFilePickerIndex(null);
              setColorItems([]);
              const thumbEl = document.getElementById("thumb-file") as HTMLInputElement | null;
              if (thumbEl) thumbEl.value = "";
              const multiEl = document.getElementById("multi-file-picker") as HTMLInputElement | null;
              if (multiEl) multiEl.value = "";
            }}
          >
            Create
          </Button>
        </div>

        <div className="bg-card rounded-lg p-4 space-y-4">
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
                    <div className="relative overflow-hidden rounded-lg bg-card aspect-[3/4] max-w-[400px] mb-3">
                      <img src={current} alt={form.name} className="h-full w-full object-cover" />
                      {form.discount && (
                        <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground">
                          {form.discount}% OFF
                        </Badge>
                      )}
                    </div>
                    {sources.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-1">
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

        
        <div className="md:col-span-2 bg-card rounded-lg p-6 space-y-4">
          <h2 className="font-serif text-2xl font-bold">Carousel Images</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[0,1,2,3,4].map((idx) => (
              <CarouselItemEditor
                key={idx}
                index={idx}
                currentUrl={carousel[idx] || ""}
                onSave={async (file) => {
                  if (!file) return;
                  const fd = new FormData();
                  fd.append("files", file);
                  const res = await authFetch("/api/upload", { method: "POST", body: fd });
                  const data = await res.json();
                  const url = (data.urls || [])[0];
                  const next = [...carousel];
                  next[idx] = url;
                  saveCarouselMutation.mutate(next);
                }}
                onRemove={() => {
                  const next = [...carousel];
                  next[idx] = "";
                  saveCarouselMutation.mutate(next.filter(Boolean));
                }}
              />
            ))}
          </div>
        </div>

        <div className="md:col-span-2 bg-card rounded-lg p-6 space-y-4">
          <h2 className="font-serif text-2xl font-bold">Banner Container</h2>
          {banners.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Current Banner</h3>
                <div className="flex gap-2">
                  <input
                    id="banner-file-edit"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleBannerFileSelect}
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => (document.getElementById("banner-file-edit") as HTMLInputElement | null)?.click()}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Banner
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this banner?")) {
                        deleteBannerMutation.mutate(banners[0]);
                      }
                    }}
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </div>
              </div>
              <div className="rounded-lg overflow-hidden border bg-card">
                <img src={banners[0]} alt="Banner" className="w-full h-[260px] md:h-[320px] lg:h-[400px] object-cover" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-2 items-center">
                <input
                  id="banner-file"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBannerFileSelect}
                />
                <Button variant="secondary" onClick={() => (document.getElementById("banner-file") as HTMLInputElement | null)?.click()}>
                  Upload Banner Image
                </Button>
              </div>
              <div className="border-2 border-dashed rounded-lg p-12 text-center text-muted-foreground">
                <p>No banner image uploaded yet</p>
                <p className="text-sm mt-2">Click "Upload Banner Image" to add a banner</p>
              </div>
            </div>
          )}
        </div>

        {/* Banner Crop Dialog */}
        <Dialog open={!!bannerCropImage} onOpenChange={(open) => !open && handleBannerCropCancel()}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Crop Banner Image (16:5 ratio)</DialogTitle>
            </DialogHeader>
            {bannerCropImage && (
              <div className="space-y-4">
                <div className="relative w-full h-[500px] bg-black rounded-lg overflow-hidden">
                  <Cropper
                    image={bannerCropImage}
                    crop={bannerCrop}
                    zoom={bannerZoom}
                    aspect={16 / 5}
                    onCropChange={setBannerCrop}
                    onZoomChange={setBannerZoom}
                    onCropComplete={onBannerCropComplete}
                    cropShape="rect"
                    showGrid={true}
                    restrictPosition={false}
                    minZoom={0.5}
                    maxZoom={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Zoom</Label>
                  <input
                    type="range"
                    value={bannerZoom}
                    min={0.5}
                    max={3}
                    step={0.1}
                    onChange={(e) => setBannerZoom(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={handleBannerCropCancel}>
                    Cancel
                  </Button>
                  <Button onClick={handleBannerCropComplete} disabled={!bannerCroppedAreaPixels}>
                    Apply Crop & Upload
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        <div className="md:col-span-2 bg-card rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl font-bold">Categories</h2>
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => setAddingCategoryOpen((v) => !v)}
              aria-label="Add category"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
          {addingCategoryOpen && (
            <div className="flex gap-2">
              <Input placeholder="Category name" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
              <Button
                variant="secondary"
                onClick={() => {
                  const name = newCategoryName.trim();
                  if (!name) return;
                  addCategoryMutation.mutate(name);
                }}
              >Add</Button>
            </div>
          )}
          <div className="h-[600px] overflow-y-auto rounded-md border w-full">
            <Accordion type="single" collapsible className="w-full" value={openItem} onValueChange={setOpenItem}>
              {topCategories.map((c) => (
                <AccordionItem key={c} value={c}>
                  <AccordionTrigger className="px-3 pr-16">
                    <div className="flex w-full items-center justify-between">
                      {editingCategory === c ? (
                        <div className="flex items-center gap-2">
                          <Input value={editingCategoryValue} onChange={(e) => setEditingCategoryValue(e.target.value)} className="h-8 w-48" />
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const v = editingCategoryValue.trim();
                              if (!v || v === c) { setEditingCategory(null); return; }
                              updateCategoryMutation.mutate({ oldName: c, newName: v });
                              setEditingCategory(null);
                            }}
                          >Save</Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingCategory(null); }}
                          >Cancel</Button>
                        </div>
                      ) : (
                        <span>{c}</span>
                      )}
                      <div className="flex items-center">
                        <button
                          type="button"
                          className="ml-4 mr-2 text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingCategory(c);
                            setEditingCategoryValue(c);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="ml-2 mr-2 text-primary hover:underline"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setAddingSubFor(c);
                            setOpenItem(c);
                            setTimeout(() => {
                              const el = document.getElementById(`new-sub-input-${c}`) as HTMLInputElement | null;
                              el?.focus();
                            }, 0);
                          }}
                          aria-label="Add subcategory"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="ml-2 mr-4 text-destructive hover:underline"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setConfirmData({ type: "category", name: c });
                            setConfirmOpen(true);
                          }}
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3">
                    {addingSubFor === c && (
                      <div className="flex gap-2 mb-2">
                        <Input id={`new-sub-input-${c}`} placeholder="New subcategory" value={newSubName} onChange={(e) => setNewSubName(e.target.value)} className="h-8" />
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            const name = newSubName.trim();
                            if (!name) return;
                            addSubMutation.mutate({ category: c, name });
                          }}
                        >Add</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setAddingSubFor(null); setNewSubName(""); }}>Cancel</Button>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {(subsByCat[c] || []).map((s) => (
                        <span key={s} className="text-xs rounded-md border px-2 py-1 flex items-center gap-1">
                          {editingSub && editingSub.category === c && editingSub.name === s ? (
                            <>
                              <Input value={editingSubValue} onChange={(e) => setEditingSubValue(e.target.value)} className="h-7 w-40 text-xs" />
                              <Button
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => {
                                  const v = editingSubValue.trim();
                                  if (!v || v === s) { setEditingSub(null); return; }
                                  updateSubMutation.mutate({ category: c, oldName: s, newName: v });
                                  setEditingSub(null);
                                }}
                              >Save</Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingSub(null)}>Cancel</Button>
                            </>
                          ) : (
                            <>
                              <span>{s}</span>
                              <button
                                type="button"
                                className="ml-1 text-muted-foreground hover:text-foreground"
                                onClick={() => { setEditingSub({ category: c, name: s }); setEditingSubValue(s); }}
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                className="ml-1 text-muted-foreground hover:text-destructive"
                                onClick={() => {
                                  setConfirmData({ type: "sub", category: c, name: s });
                                  setConfirmOpen(true);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </span>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
        
      <div className="md:col-span-2 bg-card rounded-lg p-6 space-y-4">
        <h2 className="font-serif text-2xl font-bold">Featured Collection</h2>
        <FeaturedCollectionManager products={products} />
      </div>
      <div className="md:col-span-2 bg-card rounded-lg p-6 space-y-4">
        <h2 className="font-serif text-2xl font-bold">Best Sellers</h2>
        <BestSellersManager products={products} />
      </div>
      <div className="md:col-span-2 bg-card rounded-lg p-6 space-y-4">
        <h2 className="font-serif text-2xl font-bold">Category Tiles</h2>
        <CategoryTilesManager categories={topCategories} />
      </div>
      </div>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmData
                ? `Delete ${confirmData.type === "category" ? "category" : "subcategory"} "${confirmData.name}"?`
                : ""}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete? Deleting this will remove {confirmData?.type === "category" ? "this category and all its subcategories" : "this subcategory"}.
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmData) return;
                if (confirmData.type === "category") {
                  delCategoryMutation.mutate(confirmData.name);
                } else {
                  delSubMutation.mutate({ category: confirmData.category, name: confirmData.name });
                }
                setConfirmOpen(false);
                setConfirmData(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Admin;