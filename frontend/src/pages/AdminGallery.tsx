import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authFetch, getRole, getToken } from "@/lib/auth";
import { toast } from "@/components/ui/sonner";
import { Download, Copy, Search, X, Image as ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type GalleryImage = {
  url: string;
  source: string;
  id: string;
};

type GalleryData = {
  [category: string]: GalleryImage[];
};

const AdminGallery = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<string | null>(getRole());
  const [isChecking, setIsChecking] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const { data: gallery = {}, isLoading } = useQuery<GalleryData>({
    queryKey: ["gallery"],
    queryFn: async () => {
      const res = await authFetch("/api/gallery");
      if (!res.ok) return {};
      return res.json();
    },
  });

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
            localStorage.setItem("auth_role", backendRole);
            setRole(backendRole);
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

  const categories = Object.keys(gallery);
  const totalImages = Object.values(gallery).reduce((sum, images) => sum + images.length, 0);

  // Set default category on mount
  useEffect(() => {
    if (!selectedCategory && categories.length > 0) {
      setSelectedCategory(categories[0]);
    }
  }, [categories, selectedCategory]);

  const filteredGallery: GalleryData = {};
  Object.entries(gallery).forEach(([category, images]) => {
    if (!searchQuery || searchQuery.trim() === "") {
      filteredGallery[category] = images;
    } else {
      const query = searchQuery.toLowerCase();
      filteredGallery[category] = images.filter(
        (img) =>
          img.url.toLowerCase().includes(query) ||
          img.source.toLowerCase().includes(query)
      );
    }
  });

  const handleDownload = async (image: GalleryImage) => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const filename = image.url.split("/").pop() || "image.jpg";
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Image downloaded");
    } catch (e) {
      toast.error("Failed to download image");
    }
  };

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL copied to clipboard");
    } catch (e) {
      toast.error("Failed to copy URL");
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

  return (
    <div className="container px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl md:text-4xl font-bold mb-2">
              Image Gallery
            </h1>
            <p className="text-muted-foreground">
              {totalImages} images across {categories.length} categories
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/admin")}>
            Back to Admin
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search images by URL or source..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Gallery Tabs */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading gallery...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No images found in gallery</p>
          </div>
        ) : (
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-6">
              {categories.map((category) => {
                const count = filteredGallery[category]?.length || 0;
                return (
                  <TabsTrigger key={category} value={category}>
                    {category} ({count})
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {categories.map((category) => (
              <TabsContent key={category} value={category} className="mt-0">
                {filteredGallery[category]?.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">
                      No images found in {category}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredGallery[category].map((image) => (
                      <div
                        key={image.id}
                        className="group relative border rounded-lg overflow-hidden bg-card hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => setSelectedImage(image)}
                      >
                        <div className="aspect-square relative bg-muted">
                          <img
                            src={image.url}
                            alt={image.source}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/placeholder.svg";
                            }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                        </div>
                        <div className="p-2">
                          <p className="text-xs text-muted-foreground truncate">
                            {image.source}
                          </p>
                        </div>
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(image);
                            }}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyUrl(image.url);
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}

        {/* Image Detail Dialog */}
        <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedImage && (
              <>
                <DialogHeader>
                  <DialogTitle>Image Details</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden">
                    <img
                      src={selectedImage.url}
                      alt={selectedImage.source}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.svg";
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <div>
                      <Label>Source</Label>
                      <p className="text-sm">{selectedImage.source}</p>
                    </div>
                    <div>
                      <Label>URL</Label>
                      <div className="flex gap-2">
                        <Input
                          value={selectedImage.url}
                          readOnly
                          className="font-mono text-xs"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyUrl(selectedImage.url)}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleDownload(selectedImage)}
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Image
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedImage(null)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminGallery;

