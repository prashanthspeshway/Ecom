import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { authFetch, getRole, getToken } from "@/lib/auth";
import { toast } from "@/components/ui/sonner";
import { X, Plus, Edit, Trash2, Upload } from "lucide-react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";

type Blog = {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  date: number;
};

const AdminBlogs = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [role, setRole] = useState<string | null>(getRole());
  const [isChecking, setIsChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  useEffect(() => {
    (async () => {
      const token = getToken();
      if (!token) {
        navigate("/login");
        return;
      }
      
      try {
        const res = await authFetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          const backendRole = data.role || data.user?.role || null;
          if (backendRole && backendRole !== "undefined") {
            if (backendRole !== role) {
              localStorage.setItem("auth_role", backendRole);
              setRole(backendRole);
            }
            if (backendRole !== "admin") {
              navigate("/login");
              return;
            }
          } else {
            if (role !== "admin") {
              navigate("/login");
              return;
            }
          }
        } else {
          if (role !== "admin") {
            navigate("/login");
            return;
          }
        }
      } catch (e) {
        if (role !== "admin") {
          navigate("/login");
          return;
        }
      }
      setIsChecking(false);
    })();
  }, [navigate, role]);

  useEffect(() => {
    if (!isChecking && role === "admin") {
      loadBlogs();
      loadCategories();
    }
  }, [isChecking, role]);

  const loadBlogs = async () => {
    try {
      setLoading(true);
      const res = await authFetch("/api/blogs/admin/all");
      if (res.ok) {
        const data = await res.json();
        setBlogs(data || []);
      }
    } catch (e) {
      toast.error("Failed to load blogs");
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await authFetch("/api/blogs/categories/all");
      if (res.ok) {
        const data = await res.json();
        setCategories(data || []);
      }
    } catch (e) {
      toast.error("Failed to load categories");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show crop dialog
    const imageUrl = URL.createObjectURL(file);
    setCropImage(imageUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", (error) => reject(error));
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

    const maxSize = Math.max(image.width, image.height);
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

    canvas.width = safeArea;
    canvas.height = safeArea;

    ctx.translate(safeArea / 2, safeArea / 2);
    ctx.translate(-safeArea / 2, -safeArea / 2);

    ctx.drawImage(
      image,
      safeArea / 2 - image.width * 0.5,
      safeArea / 2 - image.height * 0.5
    );

    const data = ctx.getImageData(0, 0, safeArea, safeArea);

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.putImageData(
      data,
      Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
      Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        }
      }, "image/jpeg", 0.95);
    });
  };

  const handleCropComplete = async () => {
    if (!cropImage || !croppedAreaPixels) {
      toast.error("Please crop the image first");
      return;
    }

    try {
      setLoading(true);
      const croppedBlob = await getCroppedImg(cropImage, croppedAreaPixels);
      const formData = new FormData();
      formData.append("files", croppedBlob, "cropped-image.jpg");

      const res = await authFetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const uploadedUrl = (data.urls && data.urls[0]) || data.url || data.path || "";
        if (editingBlog && uploadedUrl) {
          setEditingBlog({ ...editingBlog, image: uploadedUrl });
          toast.success("Image cropped and uploaded successfully");
          setCropImage(null);
          if (cropImage.startsWith("blob:")) {
            URL.revokeObjectURL(cropImage);
          }
        } else {
          toast.error("Failed to get uploaded image URL");
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to upload image");
      }
    } catch (e) {
      console.error("Upload error:", e);
      toast.error("Failed to upload cropped image");
    } finally {
      setLoading(false);
    }
  };

  const handleCropCancel = () => {
    if (cropImage && cropImage.startsWith("blob:")) {
      URL.revokeObjectURL(cropImage);
    }
    setCropImage(null);
    setCroppedAreaPixels(null);
  };

  const saveBlog = async (blog: Blog) => {
    try {
      setLoading(true);
      if (!blog.title || !blog.category) {
        toast.error("Title and category are required");
        return;
      }
      const res = blog.id
        ? await authFetch(`/api/blogs/${blog.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(blog),
          })
        : await authFetch("/api/blogs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(blog),
          });
      if (res.ok) {
        toast.success("Blog saved successfully");
        await loadBlogs();
        setEditingBlog(null);
        qc.invalidateQueries({ queryKey: ["blogs"] });
      } else {
        toast.error("Failed to save blog");
      }
    } catch (e) {
      toast.error("Failed to save blog");
    } finally {
      setLoading(false);
    }
  };

  const deleteBlog = async (id: string) => {
    if (!confirm("Are you sure you want to delete this blog post?")) return;
    try {
      setLoading(true);
      const res = await authFetch(`/api/blogs/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Blog deleted successfully");
        await loadBlogs();
        qc.invalidateQueries({ queryKey: ["blogs"] });
      } else {
        toast.error("Failed to delete blog");
      }
    } catch (e) {
      toast.error("Failed to delete blog");
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      setLoading(true);
      const res = await authFetch("/api/blogs/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategory.trim() }),
      });
      if (res.ok) {
        toast.success("Category added successfully");
        setNewCategory("");
        await loadCategories();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to add category");
      }
    } catch (e) {
      toast.error("Failed to add category");
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (name: string) => {
    if (!confirm(`Are you sure you want to delete category "${name}"? This will remove the category from all blog posts.`)) return;
    try {
      setLoading(true);
      const res = await authFetch(`/api/blogs/categories/${encodeURIComponent(name)}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Category deleted successfully");
        await loadCategories();
        await loadBlogs();
      } else {
        toast.error("Failed to delete category");
      }
    } catch (e) {
      toast.error("Failed to delete category");
    } finally {
      setLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="container px-4 py-16 text-center">
        <p>Verifying admin access...</p>
      </div>
    );
  }

  if (role !== "admin" || !getToken()) {
    return (
      <div className="container px-4 py-16 text-center">
        <p>Unauthorized. Redirecting...</p>
      </div>
    );
  }

  const filteredBlogs = selectedCategory === "all" 
    ? blogs 
    : blogs.filter(b => b.category === selectedCategory);

  return (
    <div className="container px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-serif text-3xl md:text-4xl font-bold">Manage Blogs</h1>
          <Button variant="outline" onClick={() => navigate("/admin")}>
            Back to Admin
          </Button>
        </div>

        <div className="bg-card rounded-lg p-6 space-y-6">
          {/* Category Management */}
          <div className="border-b pb-6">
            <h2 className="text-xl font-semibold mb-4">Manage Categories</h2>
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="New category name"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addCategory();
                }}
                className="max-w-xs"
              />
              <Button onClick={addCategory} disabled={loading}>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <div
                  key={cat}
                  className="flex items-center gap-2 bg-secondary px-3 py-1 rounded-full"
                >
                  <span>{cat}</span>
                  <button
                    onClick={() => deleteCategory(cat)}
                    className="text-destructive hover:text-destructive/80"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-4">
            <Label>Filter by Category:</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Blog Form or List */}
          {editingBlog ? (
            <div className="space-y-4 border rounded-lg p-4">
              <div>
                <Label htmlFor="blog-title">Title *</Label>
                <Input
                  id="blog-title"
                  value={editingBlog.title}
                  onChange={(e) => setEditingBlog({ ...editingBlog, title: e.target.value })}
                  placeholder="Blog title"
                />
              </div>
              <div>
                <Label htmlFor="blog-description">Description</Label>
                <Textarea
                  id="blog-description"
                  value={editingBlog.description}
                  onChange={(e) => setEditingBlog({ ...editingBlog, description: e.target.value })}
                  placeholder="Blog description"
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="blog-category">Category *</Label>
                <Select
                  value={editingBlog.category}
                  onValueChange={(value) => setEditingBlog({ ...editingBlog, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="blog-date">Date</Label>
                <Input
                  id="blog-date"
                  type="date"
                  value={editingBlog.date ? new Date(editingBlog.date).toISOString().split("T")[0] : ""}
                  onChange={(e) => setEditingBlog({ ...editingBlog, date: new Date(e.target.value).getTime() })}
                />
              </div>
              <div>
                <Label htmlFor="blog-image">Image</Label>
                <div className="flex gap-2">
                  <Input
                    id="blog-image"
                    value={editingBlog.image}
                    onChange={(e) => setEditingBlog({ ...editingBlog, image: e.target.value })}
                    placeholder="Image URL or upload"
                  />
                  <label className="cursor-pointer">
                    <Button type="button" variant="outline" asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </label>
                </div>
                {editingBlog.image && (
                  <img
                    src={editingBlog.image}
                    alt="Preview"
                    className="mt-2 w-32 h-32 object-cover rounded"
                  />
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={() => saveBlog(editingBlog)} disabled={loading}>
                  {loading ? "Saving..." : "Save Blog"}
                </Button>
                <Button variant="outline" onClick={() => setEditingBlog(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Blog Posts</h2>
                <Button
                  onClick={() =>
                    setEditingBlog({
                      id: "",
                      title: "",
                      description: "",
                      image: "",
                      category: "",
                      date: Date.now(),
                    })
                  }
                  variant="secondary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Blog
                </Button>
              </div>
              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : filteredBlogs.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No blog posts yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredBlogs.map((blog) => (
                    <div key={blog.id} className="border rounded-lg overflow-hidden">
                      {blog.image && (
                        <img
                          src={blog.image}
                          alt={blog.title}
                          className="w-full h-48 object-cover"
                        />
                      )}
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            {blog.category}
                          </span>
                        </div>
                        <h3 className="font-semibold mb-1">{blog.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {blog.description}
                        </p>
                        <div className="text-xs text-muted-foreground mb-3">
                          {new Date(blog.date).toLocaleDateString()}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingBlog(blog)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteBlog(blog.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Image Crop Dialog */}
      <Dialog open={!!cropImage} onOpenChange={(open) => !open && handleCropCancel()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Crop Image for Blog Card</DialogTitle>
          </DialogHeader>
          {cropImage && (
            <div className="space-y-4">
              <div className="relative w-full h-[400px] bg-black rounded-lg overflow-hidden">
                <Cropper
                  image={cropImage}
                  crop={crop}
                  zoom={zoom}
                  aspect={4 / 3}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  cropShape="rect"
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
                <Button onClick={handleCropComplete} disabled={loading || !croppedAreaPixels}>
                  {loading ? "Uploading..." : "Apply Crop & Upload"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBlogs;

