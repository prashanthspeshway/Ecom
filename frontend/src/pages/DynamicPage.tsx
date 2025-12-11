import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiBase } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";

interface PageData {
  slug: string;
  title: string;
  content: string;
  images: string[];
}

const DynamicPage = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: page, isLoading, error } = useQuery<PageData>({
    queryKey: ["page", slug],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/api/pages/${slug}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Page not found");
        throw new Error("Failed to fetch page");
      }
      return res.json();
    },
    enabled: !!slug,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Skeleton className="h-10 w-1/3 mb-6" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-3xl font-serif mb-4">Page Not Found</h1>
        <p className="text-muted-foreground">The page you are looking for does not exist.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-serif font-bold mb-8 text-center">{page.title}</h1>
      
      {page.images && page.images.length > 0 && (
        <div className="mb-8 flex justify-center">
          <img 
            src={page.images[0]} 
            alt={page.title} 
            className="rounded-lg shadow-md max-h-[400px] object-cover"
          />
        </div>
      )}

      <div 
        className="prose prose-lg max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: page.content }}
      />
    </div>
  );
};

export default DynamicPage;

