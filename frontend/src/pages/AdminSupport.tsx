import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { authFetch, getRole, getToken } from "@/lib/auth";
import { toast } from "@/components/ui/sonner";

const AdminSupport = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<string | null>(getRole());
  const [isChecking, setIsChecking] = useState(true);
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pages, setPages] = useState<Array<{ slug: string; title: string; content: string }>>([]);
  const [editingPage, setEditingPage] = useState<{ slug: string; title: string; content: string } | null>(null);

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
      loadPages();
      loadSupportMessages();
    }
  }, [isChecking, role]);

  const loadPages = async () => {
    try {
      setLoading(true);
      const res = await authFetch("/api/pages/admin/all");
      if (res.ok) {
        const data = await res.json();
        setPages(data || []);
      }
    } catch (e) {
      toast.error("Failed to load pages");
    } finally {
      setLoading(false);
    }
  };

  const loadSupportMessages = async () => {
    try {
      // This would fetch from your backend API
      // For now, showing a placeholder
      setSupportMessages([]);
    } catch (e) {
      toast.error("Failed to load support messages");
    }
  };

  const savePage = async (page: { slug: string; title: string; content: string }) => {
    try {
      setLoading(true);
      const res = await authFetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(page),
      });
      if (res.ok) {
        toast.success("Page saved successfully");
        await loadPages();
        setEditingPage(null);
        // Invalidate footer pages query to refresh footer links
        qc.invalidateQueries({ queryKey: ["footer-pages"] });
      } else {
        toast.error("Failed to save page");
      }
    } catch (e) {
      toast.error("Failed to save page");
    } finally {
      setLoading(false);
    }
  };

  const deletePage = async (slug: string) => {
    if (!confirm("Are you sure you want to delete this page?")) return;
    try {
      setLoading(true);
      const res = await authFetch(`/api/pages/${slug}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Page deleted successfully");
        await loadPages();
        // Invalidate footer pages query to refresh footer links
        qc.invalidateQueries({ queryKey: ["footer-pages"] });
      } else {
        toast.error("Failed to delete page");
      }
    } catch (e) {
      toast.error("Failed to delete page");
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
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-serif text-3xl md:text-4xl font-bold">Support Management</h1>
          <Button variant="outline" onClick={() => navigate("/admin")}>
            Back to Admin
          </Button>
        </div>

        <div className="bg-card rounded-lg p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Support Messages</h2>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : supportMessages.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No support messages yet.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Support messages from customers will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {supportMessages.map((message) => (
                  <div key={message.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{message.name}</span>
                      <span className="text-sm text-muted-foreground">{message.date}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{message.email}</p>
                    <p>{message.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold mb-4">Manage Pages</h2>
            <p className="text-sm text-muted-foreground mb-4">
              These pages appear in the Support column of the footer. Users can click on them to view the content.
            </p>
            
            {editingPage ? (
              <div className="space-y-4 border rounded-lg p-4">
                <div>
                  <Label htmlFor="page-slug">Slug (URL-friendly, e.g., "about-us")</Label>
                  <Input
                    id="page-slug"
                    value={editingPage.slug}
                    onChange={(e) => setEditingPage({ ...editingPage, slug: e.target.value })}
                    placeholder="about-us"
                  />
                </div>
                <div>
                  <Label htmlFor="page-title">Title (shown in footer)</Label>
                  <Input
                    id="page-title"
                    value={editingPage.title}
                    onChange={(e) => setEditingPage({ ...editingPage, title: e.target.value })}
                    placeholder="About Us"
                  />
                </div>
                <div>
                  <Label htmlFor="page-content">Content (HTML allowed)</Label>
                  <Textarea
                    id="page-content"
                    value={editingPage.content}
                    onChange={(e) => setEditingPage({ ...editingPage, content: e.target.value })}
                    placeholder="<h1>About Us</h1><p>Content here...</p>"
                    rows={10}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => savePage(editingPage)} disabled={loading}>
                    {loading ? "Saving..." : "Save Page"}
                  </Button>
                  <Button variant="outline" onClick={() => setEditingPage(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2 mb-4">
                  {pages
                    .filter((p) => p.slug !== "about-us" && p.slug !== "blog")
                    .map((page) => (
                      <div key={page.slug} className="flex items-center justify-between border rounded-lg p-3">
                        <div>
                          <div className="font-semibold">{page.title}</div>
                          <div className="text-sm text-muted-foreground">/{page.slug}</div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingPage({ ...page })}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deletePage(page.slug)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
                <Button
                  onClick={() => setEditingPage({ slug: "", title: "", content: "" })}
                  variant="secondary"
                >
                  Add New Page
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSupport;




