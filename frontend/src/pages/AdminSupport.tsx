import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { authFetch, getRole, apiBase } from "@/lib/auth";
import { toast } from "@/components/ui/sonner";
import { Plus, Trash2, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const AdminSupport = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const role = getRole();
  const [editingPage, setEditingPage] = useState<{ slug: string; title: string; content: string } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (role !== "admin") navigate("/login");
  }, [role, navigate]);

  const { data: pages = [], isLoading } = useQuery<Array<{ slug: string; title: string; content: string }>>({
    queryKey: ["footer-pages"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/api/pages`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const [newPage, setNewPage] = useState({ title: "", slug: "", content: "" });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; slug: string; content: string }) => {
      const res = await authFetch(`${apiBase}/api/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Create failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["footer-pages"] });
      toast("Page created successfully");
      setNewPage({ title: "", slug: "", content: "" });
      setIsDialogOpen(false);
    },
    onError: () => {
      toast("Failed to create page");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ slug, data }: { slug: string; data: { title: string; content: string } }) => {
      const res = await authFetch(`${apiBase}/api/pages/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["footer-pages"] });
      toast("Page updated successfully");
      setEditingPage(null);
      setIsDialogOpen(false);
    },
    onError: () => {
      toast("Failed to update page");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (slug: string) => {
      const res = await authFetch(`${apiBase}/api/pages/${slug}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["footer-pages"] });
      toast("Page deleted successfully");
    },
    onError: () => {
      toast("Failed to delete page");
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPage.title || !newPage.slug) {
      toast("Title and slug are required");
      return;
    }
    createMutation.mutate(newPage);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPage) return;
    updateMutation.mutate({
      slug: editingPage.slug,
      data: { title: editingPage.title, content: editingPage.content },
    });
  };

  const handleEdit = (page: { slug: string; title: string; content: string }) => {
    setEditingPage(page);
    setIsDialogOpen(true);
  };

  const handleDelete = (slug: string) => {
    if (confirm("Are you sure you want to delete this page?")) {
      deleteMutation.mutate(slug);
    }
  };

  if (isLoading) {
    return (
      <div className="container px-4 py-8">
        <div className="max-w-4xl mx-auto">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-8">
      <Helmet>
        <title>Support Pages - Admin | Saree Elegance</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="font-serif text-3xl font-bold">Footer Pages</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingPage(null); setNewPage({ title: "", slug: "", content: "" }); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Page
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPage ? "Edit Page" : "Create New Page"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={editingPage ? handleUpdate : handleCreate} className="space-y-4">
                <div>
                  <Label htmlFor="page-title">Title</Label>
                  <Input
                    id="page-title"
                    value={editingPage ? editingPage.title : newPage.title}
                    onChange={(e) => {
                      if (editingPage) {
                        setEditingPage({ ...editingPage, title: e.target.value });
                      } else {
                        setNewPage({ ...newPage, title: e.target.value });
                      }
                    }}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="page-slug">Slug (URL-friendly)</Label>
                  <Input
                    id="page-slug"
                    value={editingPage ? editingPage.slug : newPage.slug}
                    onChange={(e) => {
                      if (editingPage) {
                        setEditingPage({ ...editingPage, slug: e.target.value });
                      } else {
                        setNewPage({ ...newPage, slug: e.target.value });
                      }
                    }}
                    required
                    disabled={!!editingPage}
                    placeholder="about-us"
                  />
                  {!editingPage && (
                    <p className="text-sm text-muted-foreground mt-1">
                      This will be the URL: /pages/{newPage.slug || "slug"}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="page-content">Content</Label>
                  <Textarea
                    id="page-content"
                    value={editingPage ? editingPage.content : newPage.content}
                    onChange={(e) => {
                      if (editingPage) {
                        setEditingPage({ ...editingPage, content: e.target.value });
                      } else {
                        setNewPage({ ...newPage, content: e.target.value });
                      }
                    }}
                    rows={10}
                    placeholder="Page content (HTML or plain text)"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingPage(null);
                      setNewPage({ title: "", slug: "", content: "" });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingPage ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-card rounded-lg p-6">
          {pages.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No pages created yet. Click "Add Page" to create one.</p>
          ) : (
            <div className="space-y-4">
              {pages.map((page) => (
                <div key={page.slug} className="border rounded-lg p-4 flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{page.title}</h3>
                    <p className="text-sm text-muted-foreground">Slug: {page.slug}</p>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{page.content}</p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(page)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(page.slug)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSupport;



