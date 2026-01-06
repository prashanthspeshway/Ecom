import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/auth";
import { Star, Calendar, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BlogPost = {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  date: number;
};

const Blog = () => {
  const [selectedBlog, setSelectedBlog] = useState<BlogPost | null>(null);

  const { data: blogs = [], isLoading } = useQuery<BlogPost[]>({
    queryKey: ["blogs"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/blogs"));
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Group blogs by category
  const groupedBlogs = blogs.reduce((acc, blog) => {
    const category = blog.category || "Uncategorized";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(blog);
    return acc;
  }, {} as Record<string, BlogPost[]>);

  if (isLoading) {
    return (
      <div className="container px-4 py-16">
        <div className="text-center">
          <p className="text-muted-foreground">Loading blogs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">Our Blogs</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore our journey through memorable moments, achievements, and celebrations
          </p>
        </div>

        {/* Blog Posts Grouped by Category */}
        {Object.keys(groupedBlogs).length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No blog posts found.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {Object.entries(groupedBlogs).map(([category, categoryBlogs]) => (
              <div key={category}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-serif text-2xl md:text-3xl font-bold flex items-center gap-2">
                    <Star className="h-6 w-6 text-primary" />
                    {category}
                  </h2>
                  <span className="text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                    {categoryBlogs.length} item{categoryBlogs.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categoryBlogs.map((blog) => (
                    <div
                      key={blog.id}
                      className="border rounded-lg overflow-hidden bg-card hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => setSelectedBlog(blog)}
                    >
                      {blog.image && (
                        <img
                          src={blog.image}
                          alt={blog.title}
                          className="w-full h-64 object-cover"
                        />
                      )}
                      <div className="p-4">
                        <h3 className="font-serif text-xl font-semibold mb-2">{blog.title}</h3>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                          {blog.description}
                        </p>
                        <div className="text-xs text-muted-foreground">
                          {new Date(blog.date).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Blog Detail Modal */}
        <Dialog open={!!selectedBlog} onOpenChange={(open) => !open && setSelectedBlog(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedBlog && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-serif">{selectedBlog.title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {selectedBlog.image && (
                    <img
                      src={selectedBlog.image}
                      alt={selectedBlog.title}
                      className="w-full h-auto rounded-lg object-cover"
                    />
                  )}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        {selectedBlog.category}
                      </span>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {new Date(selectedBlog.date).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="prose max-w-none">
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {selectedBlog.description}
                      </p>
                    </div>
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

export default Blog;

