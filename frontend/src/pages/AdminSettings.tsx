import { useEffect, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch, getRole, apiBase } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

const AdminSettings = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const role = getRole();

  useEffect(() => {
    if (role !== "admin") navigate("/login");
  }, [role, navigate]);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/api/settings`);
      return res.json();
    },
  });

  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [siteTitle, setSiteTitle] = useState("");

  // Crop state
  const [cropOpen, setCropOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [uploadType, setUploadType] = useState<"logo" | "favicon">("logo");

  useEffect(() => {
    if (settings) {
      setLogoUrl(settings.logoUrl || "");
      setFaviconUrl(settings.faviconUrl || "");
      setSiteTitle(settings.siteTitle || "");
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await authFetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update settings");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Settings updated successfully");
      window.location.reload(); 
    },
    onError: () => {
      toast.error("Failed to update settings");
    }
  });

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "favicon") => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImageSrc(reader.result as string);
        setUploadType(type);
        setCropOpen(true);
      });
      reader.readAsDataURL(file);
    }
    // reset input
    e.target.value = "";
  };

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", (error) => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("No 2d context");
    }

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Canvas is empty"));
          return;
        }
        resolve(blob);
      }, "image/jpeg");
    });
  };

  const handleCropSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const file = new File([croppedBlob], "cropped.jpg", { type: "image/jpeg" });
      
      const formData = new FormData();
      formData.append("files", file);
      
      const res = await authFetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      const url = data.urls[0];
      
      if (uploadType === "logo") setLogoUrl(url);
      else setFaviconUrl(url);
      
      setCropOpen(false);
      setImageSrc(null);
      setZoom(1);
    } catch (e) {
      toast.error("Upload failed");
    }
  };

  const handleSave = () => {
    updateMutation.mutate({ logoUrl, faviconUrl, siteTitle });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="container py-10 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Site Settings</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Site Title</Label>
            <Input 
              value={siteTitle} 
              onChange={(e) => setSiteTitle(e.target.value)} 
              placeholder="e.g. Saree Elegance"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-4">
              {logoUrl && (
                <div className="relative border p-2 rounded bg-secondary/10 group">
                  <img src={logoUrl} alt="Logo" className="h-16 object-contain" />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                    onClick={() => setLogoUrl("")}
                  >
                    <span className="sr-only">Remove</span>
                    <span className="text-xs">×</span>
                  </Button>
                </div>
              )}
              <Input 
                type="file" 
                accept="image/*"
                onChange={(e) => onFileChange(e, "logo")}
              />
            </div>
            <p className="text-sm text-muted-foreground">Recommended height: 40px. Will replace the text logo.</p>
          </div>

          <div className="space-y-2">
            <Label>Favicon</Label>
            <div className="flex items-center gap-4">
              {faviconUrl && (
                <div className="relative border p-2 rounded bg-secondary/10 group">
                  <img src={faviconUrl} alt="Favicon" className="w-8 h-8 object-contain" />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                    onClick={() => setFaviconUrl("")}
                  >
                    <span className="sr-only">Remove</span>
                    <span className="text-xs">×</span>
                  </Button>
                </div>
              )}
              <Input 
                type="file" 
                accept="image/*"
                onChange={(e) => onFileChange(e, "favicon")}
              />
            </div>
             <p className="text-sm text-muted-foreground">Recommended size: 32x32px or 64x64px.</p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={updateMutation.isPending}>
        {updateMutation.isPending ? "Saving..." : "Save Changes"}
      </Button>

      <Dialog open={cropOpen} onOpenChange={setCropOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Crop Image</DialogTitle>
          </DialogHeader>
          <div className="relative h-64 w-full bg-black/5 mt-4">
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={uploadType === "logo" ? 3 / 1 : 1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
              />
            )}
          </div>
          <div className="py-4">
            <Label>Zoom</Label>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.1}
              onValueChange={(v) => setZoom(v[0])}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCropOpen(false)}>Cancel</Button>
            <Button onClick={handleCropSave}>Crop & Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSettings;
