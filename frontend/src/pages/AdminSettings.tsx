import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { authFetch, getRole, getToken } from "@/lib/auth";
import { toast } from "@/components/ui/sonner";
import { X, Plus, Trash2 } from "lucide-react";
import { indianStates, stateCities } from "@/data/indianStatesCities";

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
    whatsappNumber: "",
    socialLinks: [
      { name: "Instagram", url: "" },
      { name: "Facebook", url: "" },
    ],
    shippingCharges: [] as Array<{ state: string; city: string; charge: number }>,
  });
  const [loading, setLoading] = useState(false);
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [shippingCharge, setShippingCharge] = useState("");
  const [applyToAllCities, setApplyToAllCities] = useState(false);

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
        // Ensure shippingCharges exists
        if (!data.shippingCharges || !Array.isArray(data.shippingCharges)) {
          data.shippingCharges = [];
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
            <h2 className="text-xl font-semibold mb-4">Contact & Communication</h2>
            <div className="space-y-4 mb-6">
              <div>
                <Label htmlFor="whatsapp-number">WhatsApp Number</Label>
                <Input
                  id="whatsapp-number"
                  value={settings.whatsappNumber || ""}
                  onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                  placeholder="9876543210 or +919876543210"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Enter your WhatsApp number (with or without country code). A floating WhatsApp button will appear on your website.
                </p>
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
            <h2 className="text-xl font-semibold mb-4">Shipping Charges</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Set shipping charges for different states and cities. Charges are in ₹ (Indian Rupees). You can set a charge for all cities in a state or for specific cities.
            </p>
            
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>State</Label>
                  <Select value={selectedState} onValueChange={(value) => { setSelectedState(value); setSelectedCity(""); setApplyToAllCities(false); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select State" />
                    </SelectTrigger>
                    <SelectContent>
                      {indianStates.map((state) => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>City</Label>
                  <Select 
                    value={selectedCity} 
                    onValueChange={(value) => {
                      setSelectedCity(value);
                      setApplyToAllCities(value === "ALL");
                    }} 
                    disabled={!selectedState || applyToAllCities}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={applyToAllCities ? "All Cities" : "Select City"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Cities in {selectedState}</SelectItem>
                      {selectedState && stateCities[selectedState]?.map((city) => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Shipping Charge (₹)</Label>
                  <Input
                    type="number"
                    value={shippingCharge}
                    onChange={(e) => setShippingCharge(e.target.value)}
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="apply-all-cities"
                  checked={applyToAllCities}
                  onChange={(e) => {
                    setApplyToAllCities(e.target.checked);
                    if (e.target.checked) {
                      setSelectedCity("ALL");
                    } else {
                      setSelectedCity("");
                    }
                  }}
                  className="h-4 w-4"
                />
                <Label htmlFor="apply-all-cities" className="cursor-pointer">
                  Apply to all cities in {selectedState || "selected state"}
                </Label>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  if (!selectedState || !shippingCharge) {
                    toast.error("Please select state and enter shipping charge");
                    return;
                  }
                  if (!applyToAllCities && !selectedCity) {
                    toast.error("Please select a city or check 'Apply to all cities'");
                    return;
                  }
                  const charge = parseFloat(shippingCharge);
                  if (isNaN(charge) || charge < 0) {
                    toast.error("Please enter a valid shipping charge");
                    return;
                  }
                  
                  const cityValue = applyToAllCities ? "ALL" : selectedCity;
                  
                  // Check if entry already exists
                  const existingIndex = settings.shippingCharges.findIndex(
                    (sc) => sc.state === selectedState && sc.city === cityValue
                  );
                  const newCharges = [...(settings.shippingCharges || [])];
                  
                  if (existingIndex >= 0) {
                    newCharges[existingIndex] = { state: selectedState, city: cityValue, charge };
                    toast.success("Shipping charge updated");
                  } else {
                    newCharges.push({ state: selectedState, city: cityValue, charge });
                    toast.success(applyToAllCities ? `Shipping charge added for all cities in ${selectedState}` : "Shipping charge added");
                  }
                  setSettings({ ...settings, shippingCharges: newCharges });
                  setSelectedState("");
                  setSelectedCity("");
                  setShippingCharge("");
                  setApplyToAllCities(false);
                }}
                disabled={!selectedState || !shippingCharge || (!applyToAllCities && !selectedCity)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Shipping Charge
              </Button>
            </div>

            {settings.shippingCharges && settings.shippingCharges.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 font-semibold">State</th>
                        <th className="text-left p-3 font-semibold">City</th>
                        <th className="text-right p-3 font-semibold">Charge (₹)</th>
                        <th className="text-center p-3 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {settings.shippingCharges.map((sc, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-3">{sc.state}</td>
                          <td className="p-3">{sc.city === "ALL" ? <span className="font-semibold text-primary">All Cities</span> : sc.city}</td>
                          <td className="p-3 text-right font-semibold">₹{sc.charge}</td>
                          <td className="p-3 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const newCharges = settings.shippingCharges.filter((_, i) => i !== index);
                                setSettings({ ...settings, shippingCharges: newCharges });
                                toast.success("Shipping charge removed");
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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





