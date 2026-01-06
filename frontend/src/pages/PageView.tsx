import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiBase } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PageView = () => {
  const { slug } = useParams<{ slug: string }>();
  
  const { data: page, isLoading, isError } = useQuery<{ slug: string; title: string; content: string }>({
    queryKey: ["page", slug],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/api/pages/${slug}`);
      if (!res.ok) throw new Error("Page not found");
      return res.json();
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="container px-4 py-16 text-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (isError || !page) {
    return (
      <div className="container px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold">Page Not Found</h1>
        <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
        <Link to="/">
          <Button>Go to Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
        <h1 className="font-serif text-3xl md:text-4xl font-bold mb-6">{page.title}</h1>
        <div 
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: page.content || "<p>No content available.</p>" }}
        />
      </div>
    </div>
  );
};

export default PageView;



