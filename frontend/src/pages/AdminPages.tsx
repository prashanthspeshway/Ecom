import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Pencil, Trash2, Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface Page {
  slug: string;
  title: string;
  content: string;
  images: string[];
  updatedAt?: string;
}

export default function AdminPages() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Page>>({
    title: "",
    slug: "",
    content: "",
    images: []
  });

  const { data: pages = [], isLoading } = useQuery<Page[]>({
    queryKey: ["admin-pages"],
    queryFn: async () => {
      const res = await authFetch("/api/pages");
      if (!res.ok) throw new Error("Failed to fetch pages");
      return res.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (newPage: Partial<Page>) => {
      const res = await authFetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPage),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create page");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pages"] });
      toast({ title: "Success", description: "Page created successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ slug, data }: { slug: string; data: Partial<Page> }) => {
      const res = await authFetch(`/api/pages/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, newSlug: data.slug }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update page");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pages"] });
      toast({ title: "Success", description: "Page updated successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (slug: string) => {
      const res = await authFetch(`/api/pages/${slug}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete page");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pages"] });
      toast({ title: "Success", description: "Page deleted successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPage) {
      updateMutation.mutate({ slug: editingPage.slug, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (page: Page) => {
    setEditingPage(page);
    setFormData({
      title: page.title,
      slug: page.slug,
      content: page.content,
      images: page.images
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingPage(null);
    setFormData({
      title: "",
      slug: "",
      content: "",
      images: []
    });
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    // Auto-generate slug only if creating new page
    if (!editingPage) {
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        setFormData(prev => ({ ...prev, title, slug }));
    } else {
        setFormData(prev => ({ ...prev, title }));
    }
  };

  if (isLoading) return <div className="p-8"><Skeleton className="h-10 w-full mb-4" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold font-serif">Manage Pages</h1>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Page</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPage ? "Edit Page" : "Add New Page"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={formData.title} onChange={handleTitleChange} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="slug">Slug (URL path)</Label>
                <Input id="slug" value={formData.slug} onChange={(e) => setFormData({...formData, slug: e.target.value})} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="images">Image URL (Optional)</Label>
                <Input 
                    id="images" 
                    value={formData.images?.[0] || ""} 
                    onChange={(e) => setFormData({...formData, images: e.target.value ? [e.target.value] : []})} 
                    placeholder="https://example.com/image.jpg"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="content">Content (HTML allowed)</Label>
                <Textarea 
                    id="content" 
                    value={formData.content} 
                    onChange={(e) => setFormData({...formData, content: e.target.value})} 
                    className="min-h-[200px] font-mono"
                />
                <p className="text-xs text-muted-foreground">You can use HTML tags for formatting.</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingPage ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pages.map((page) => (
              <TableRow key={page.slug}>
                <TableCell className="font-medium">{page.title}</TableCell>
                <TableCell>{page.slug}</TableCell>
                <TableCell>{page.updatedAt ? new Date(page.updatedAt).toLocaleDateString() : "N/A"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(page)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => {
                        if(confirm("Are you sure you want to delete this page?")) deleteMutation.mutate(page.slug);
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {pages.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                  No pages found. Create one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
