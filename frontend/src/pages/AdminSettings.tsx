import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { authFetch, getRole, getToken } from "@/lib/auth";
import { toast } from "@/components/ui/sonner";
import { X, Plus } from "lucide-react";

const AdminSettings = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [role, setRole] = useState<string | null>(getRole());
  const [isChecking, setIsChecking] = useState(true);
  const [settings, setSettings] = useState({
    siteTitle: "",
    logoUrl: "",
    faviconUrl: "",
    description: "",
    socialLinks: [
      { name: "Instagram", url: "" },
      { name: "Facebook", url: "" },
    ],
  });
  const [loading, setLoading] = useState(false);

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
      loadSettings();
    }
  }, [isChecking, role]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await authFetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        // Ensure socialLinks exists and has at least Instagram and Facebook
        if (!data.socialLinks || !Array.isArray(data.socialLinks)) {
          data.socialLinks = [
            { name: "Instagram", url: data.instagramUrl || "" },
            { name: "Facebook", url: data.facebookUrl || "" },
          ];
        }
        setSettings(data);
      }
    } catch (e) {
      // Settings might not exist yet, that's okay
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setLoading(true);
      // Filter out empty social links before saving
      const cleanedSettings = {
        ...settings,
        socialLinks: (settings.socialLinks || []).filter(link => link.name && link.url),
      };
      const res = await authFetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanedSettings),
      });
      if (res.ok) {
        toast.success("Settings saved successfully");
        // Invalidate settings query to refresh footer
        qc.invalidateQueries({ queryKey: ["settings"] });
      } else {
        toast.error("Failed to save settings");
      }
    } catch (e) {
      toast.error("Failed to save settings");
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

  return (
    <div className="container px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-serif text-3xl md:text-4xl font-bold">Site Settings</h1>
          <Button variant="outline" onClick={() => navigate("/admin")}>
            Back to Admin
          </Button>
        </div>

        <div className="bg-card rounded-lg p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">General Settings</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="site-title">Site Title</Label>
                <Input
                  id="site-title"
                  value={settings.siteTitle}
                  onChange={(e) => setSettings({ ...settings, siteTitle: e.target.value })}
                  placeholder="Saree Elegance"
                />
              </div>
              <div>
                <Label htmlFor="description">Site Description</Label>
                <Textarea
                  id="description"
                  value={settings.description}
                  onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                  placeholder="Premium handcrafted sarees for every occasion"
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold mb-4">Branding</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="logo-url">Logo URL</Label>
                <Input
                  id="logo-url"
                  value={settings.logoUrl}
                  onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                  placeholder="https://example.com/logo.png"
                />
              </div>
              <div>
                <Label htmlFor="favicon-url">Favicon URL</Label>
                <Input
                  id="favicon-url"
                  value={settings.faviconUrl}
                  onChange={(e) => setSettings({ ...settings, faviconUrl: e.target.value })}
                  placeholder="https://example.com/favicon.ico"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold mb-4">Social Media Links</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Manage social media links that appear in the footer. These will be displayed in the "Follow Us" section.
            </p>
            <div className="space-y-4">
              {settings.socialLinks?.map((link, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label htmlFor={`social-name-${index}`}>Platform Name</Label>
                    <Input
                      id={`social-name-${index}`}
                      value={link.name}
                      onChange={(e) => {
                        const newLinks = [...(settings.socialLinks || [])];
                        newLinks[index] = { ...newLinks[index], name: e.target.value };
                        setSettings({ ...settings, socialLinks: newLinks });
                      }}
                      placeholder="Instagram"
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor={`social-url-${index}`}>URL</Label>
                    <Input
                      id={`social-url-${index}`}
                      type="url"
                      value={link.url}
                      onChange={(e) => {
                        const newLinks = [...(settings.socialLinks || [])];
                        newLinks[index] = { ...newLinks[index], url: e.target.value };
                        setSettings({ ...settings, socialLinks: newLinks });
                      }}
                      placeholder="https://instagram.com/yourprofile"
                    />
                  </div>
                  {settings.socialLinks && settings.socialLinks.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newLinks = settings.socialLinks.filter((_, i) => i !== index);
                        setSettings({ ...settings, socialLinks: newLinks });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => {
                  const newLinks = [...(settings.socialLinks || []), { name: "", url: "" }];
                  setSettings({ ...settings, socialLinks: newLinks });
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Social Link
              </Button>
            </div>
          </div>

          <div className="border-t pt-6">
            <Button onClick={saveSettings} disabled={loading}>
              {loading ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;



