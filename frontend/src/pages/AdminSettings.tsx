import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch, getRole, apiBase } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

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

  const handleUpload = async (file: File, type: "logo" | "favicon") => {
    const formData = new FormData();
    formData.append("files", file);
    
    try {
      const res = await authFetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      const url = data.urls[0];
      
      if (type === "logo") setLogoUrl(url);
      else setFaviconUrl(url);
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
                <div className="border p-2 rounded bg-secondary/10">
                  <img src={logoUrl} alt="Logo" className="h-16 object-contain" />
                </div>
              )}
              <Input 
                type="file" 
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "logo")}
              />
            </div>
            <p className="text-sm text-muted-foreground">Recommended height: 60px. Will replace the text logo.</p>
          </div>

          <div className="space-y-2">
            <Label>Favicon</Label>
            <div className="flex items-center gap-4">
              {faviconUrl && (
                <div className="border p-2 rounded bg-secondary/10">
                  <img src={faviconUrl} alt="Favicon" className="w-8 h-8 object-contain" />
                </div>
              )}
              <Input 
                type="file" 
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "favicon")}
              />
            </div>
             <p className="text-sm text-muted-foreground">Recommended size: 32x32px or 64x64px.</p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={updateMutation.isPending}>
        {updateMutation.isPending ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
};

export default AdminSettings;
