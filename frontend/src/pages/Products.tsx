import { useMemo, useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Filter, X } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/lib/api";
import { leninSubcategories } from "@/data/products";
import type { Product } from "@/types/product";
import { Button } from "@/components/ui/button";
import { apiBase } from "@/lib/auth";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function FiltersPanel({
  priceRange,
  setPriceRange,
  selectedCategories,
  setSelectedCategories,
  selectedSubcategories,
  setSelectedSubcategories,
}: {
  priceRange: number[];
  setPriceRange: (v: number[]) => void;
  selectedCategories: string[];
  setSelectedCategories: (v: string[]) => void;
  selectedSubcategories: string[];
  setSelectedSubcategories: (v: string[]) => void;
}) {
  const { data: categories = [] } = useQuery<string[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/api/categories`);
      return res.json();
    },
  });

  // Fetch subcategories for selected categories
  const { data: availableSubcategories = [] } = useQuery<string[]>({
    queryKey: ["subcategories", selectedCategories.join(",")],
    queryFn: async () => {
      if (selectedCategories.length === 0) return [];
      const promises = selectedCategories.map(cat => 
        fetch(`${apiBase}/api/subcategories?category=${encodeURIComponent(cat)}`).then(r => r.json())
      );
      const results = await Promise.all(promises);
      const all = results.flat();
      return [...new Set(all)];
    },
    enabled: selectedCategories.length > 0
  });

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-semibold mb-4">Price Range</h3>
        <Slider value={priceRange} onValueChange={setPriceRange} max={30000} step={1000} className="mb-4" />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>₹{priceRange[0].toLocaleString()}</span>
          <span>₹{priceRange[1].toLocaleString()}</span>
        </div>
      </div>
      <div>
        <h3 className="font-semibold mb-4">Category</h3>
        <div className="space-y-3">
          {categories.map((category) => (
            <div key={category} className="flex items-center space-x-2">
              <Checkbox
                id={category}
                checked={selectedCategories.includes(category)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedCategories([...selectedCategories, category]);
                  } else {
                    setSelectedCategories(selectedCategories.filter((c) => c !== category));
                    // Remove subcategories that belong to this category
                    const subcatsToRemove = availableSubcategories.filter(sub => {
                      // This is a simplified check - in reality, you'd need to track which subcategory belongs to which category
                      return true; // For now, we'll just clear all when a category is unchecked
                    });
                    setSelectedSubcategories(selectedSubcategories.filter(s => !subcatsToRemove.includes(s)));
                  }
                }}
              />
              <label htmlFor={category} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {category}
              </label>
            </div>
          ))}
        </div>
      </div>
      {selectedCategories.length > 0 && availableSubcategories.length > 0 && (
        <div>
          <h3 className="font-semibold mb-4">Subcategory</h3>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {availableSubcategories.map((subcategory) => (
              <div key={subcategory} className="flex items-center space-x-2">
                <Checkbox
                  id={subcategory}
                  checked={selectedSubcategories.includes(subcategory)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedSubcategories([...selectedSubcategories, subcategory]);
                    } else {
                      setSelectedSubcategories(selectedSubcategories.filter((s) => s !== subcategory));
                    }
                  }}
                />
                <label htmlFor={subcategory} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {subcategory}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const Products = () => {
  const [priceRange, setPriceRange] = useState([0, 30000]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("popularity");
  const location = useLocation();
  const categoryParam = useMemo(() => new URLSearchParams(location.search).get("category"), [location.search]);
  const isNew = categoryParam === "new";
  const isSale = categoryParam === "sale";
  const isBestSeller = categoryParam === "bestsellers";
  
  const { data, isLoading, error } = useQuery<Product[]>({ 
    queryKey: ["products", { new: isNew, sale: isSale, bestseller: isBestSeller }], 
    queryFn: async () => {
      try {
        const result = await getProducts({ new: isNew, sale: isSale, bestseller: isBestSeller });
        console.log("Products loaded:", result?.length || 0);
        return result || [];
      } catch (err) {
        console.error("Error fetching products:", err);
        return [];
      }
    },
    retry: 2,
    refetchOnWindowFocus: false,
    staleTime: 30000
  });
  
  // Initialize categories from URL param if present
  useEffect(() => {
    if (categoryParam && categoryParam !== "new" && categoryParam !== "sale" && categoryParam !== "bestsellers") {
      setSelectedCategories(prev => {
        if (!prev.includes(categoryParam)) {
          return [categoryParam];
        }
        return prev;
      });
    }
  }, [categoryParam]);

  const query = useMemo(() => new URLSearchParams(location.search).get("query")?.toLowerCase() ?? "", [location.search]);
  const subParam = useMemo(() => new URLSearchParams(location.search).get("sub"), [location.search]);
  const products = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log("No data or empty array");
      return [];
    }
    
    console.log("Filtering products. Total:", data.length, "Selected categories:", selectedCategories.length);
    
    const list = data.filter((p) => {
      // Query match
      const matchesQuery = !query || (p.name?.toLowerCase().includes(query) || p.brand?.toLowerCase().includes(query) || p.category?.toLowerCase().includes(query));
      
      // Category param match (for special pages like new, sale, bestsellers)
      let matchesCategoryParam = true;
      if (isNew) {
        matchesCategoryParam = true; // Show all for new arrivals
      } else if (isSale) {
        matchesCategoryParam = !!p.onSale;
      } else if (isBestSeller) {
        matchesCategoryParam = !!p.isBestSeller;
      } else if (subParam) {
        matchesCategoryParam = p.category?.toLowerCase().includes(subParam.toLowerCase()) || false;
      } else if (categoryParam && selectedCategories.length === 0 && !isNew && !isSale && !isBestSeller) {
        // Only use categoryParam if no categories are selected and it's not a special page
        matchesCategoryParam = p.category?.toLowerCase().includes(categoryParam.toLowerCase()) || false;
      }
      
      // Selected categories match
      const matchesCategorySelection = selectedCategories.length === 0
        ? true
        : selectedCategories.some((c) => p.category?.toLowerCase().includes(c.toLowerCase()));
      
      // Selected subcategories match
      const matchesSubcategorySelection = selectedSubcategories.length === 0
        ? true
        : selectedSubcategories.some((s) => p.category?.toLowerCase().includes(s.toLowerCase()));
      
      // Price range match
      const matchesPrice = p.price >= priceRange[0] && p.price <= priceRange[1];
      
      const result = matchesQuery && matchesCategoryParam && matchesCategorySelection && matchesSubcategorySelection && matchesPrice;
      return result;
    });

    console.log("Filtered products:", list.length);

    if (sortBy === "price-low") {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-high") {
      list.sort((a, b) => b.price - a.price);
    }
    
    return list;
  }, [data, query, categoryParam, subParam, selectedCategories, selectedSubcategories, priceRange, sortBy, isNew, isSale, isBestSeller]);

  const title = useMemo(() => {
    if (isNew) return "New Arrivals";
    if (isSale) return "Sale";
    if (isBestSeller) return "Best Sellers";
    if (categoryParam && categoryParam !== "lenin") return categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1);
    if (categoryParam === "lenin") return "Lenin Collection"; 
    return "Shop Sarees";
  }, [isNew, isSale, isBestSeller, categoryParam]);

  // Ensure title is always a string
  const safeTitle = String(title || "Shop Sarees");

  // Ensure we always have a valid products array
  const safeProducts = Array.isArray(products) ? products : [];

  return (
    <div className="container px-4 py-8">
      <Helmet>
        <title>{`${safeTitle} | Saree Elegance`}</title>
        <meta name="description" content={`Browse our collection of ${safeTitle.toLowerCase()}. Find premium quality sarees, traditional wear, and designer ethnic fashion at Saree Elegance.`} />
        <meta name="keywords" content={`${safeTitle}, sarees, indian sarees, designer sarees, traditional wear, ethnic fashion, online shopping`} />
        <meta property="og:title" content={`${safeTitle} - Saree Elegance`} />
        <meta property="og:description" content={`Browse our collection of ${safeTitle.toLowerCase()} at Saree Elegance.`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://ecom-one-wheat.vercel.app/products${location.search}`} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`${safeTitle} - Saree Elegance`} />
        <link rel="canonical" href={`https://ecom-one-wheat.vercel.app/products${location.search}`} />
      </Helmet>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl md:text-4xl font-bold">{safeTitle}</h1>
        <div className="flex items-center gap-4">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popularity">Popularity</SelectItem>
              <SelectItem value="new">New Arrivals</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filter Products</SheetTitle>
                </SheetHeader>
                <div className="mt-8">
                  <FiltersPanel
                    priceRange={priceRange}
                    setPriceRange={setPriceRange}
                    selectedCategories={selectedCategories}
                    setSelectedCategories={setSelectedCategories}
                    selectedSubcategories={selectedSubcategories}
                    setSelectedSubcategories={setSelectedSubcategories}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
        <aside className="hidden lg:block">
          <div className="rounded-lg border bg-card p-4 sticky top-24">
            <h2 className="text-sm font-semibold mb-4">Filters</h2>
            <FiltersPanel
              priceRange={priceRange}
              setPriceRange={setPriceRange}
              selectedCategories={selectedCategories}
              setSelectedCategories={setSelectedCategories}
              selectedSubcategories={selectedSubcategories}
              setSelectedSubcategories={setSelectedSubcategories}
            />
            <Button className="w-full mt-6" variant="secondary">Apply Filters</Button>
          </div>
        </aside>
        <div>

      {(selectedCategories.length > 0 || selectedSubcategories.length > 0) && (
        <div className="flex flex-wrap gap-2 mb-6">
          {selectedCategories.map((category) => (
            <Button
              key={category}
              variant="secondary"
              size="sm"
              onClick={() => {
                setSelectedCategories(selectedCategories.filter((c) => c !== category));
                // Clear subcategories when category is removed
                setSelectedSubcategories([]);
              }}
            >
              {category}
              <X className="h-3 w-3 ml-2" />
            </Button>
          ))}
          {selectedSubcategories.map((subcategory) => (
            <Button
              key={subcategory}
              variant="secondary"
              size="sm"
              onClick={() =>
                setSelectedSubcategories(selectedSubcategories.filter((s) => s !== subcategory))
              }
            >
              {subcategory}
              <X className="h-3 w-3 ml-2" />
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedCategories([]);
              setSelectedSubcategories([]);
            }}
          >
            Clear all
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading products...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <p className="text-destructive mb-4">Failed to load products. Please try again.</p>
            <p className="text-sm text-muted-foreground mb-4">Error: {error instanceof Error ? error.message : String(error)}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      ) : !data || data.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">No products available in the database.</p>
            <Link to="/">
              <Button variant="outline">Go to Home</Button>
            </Link>
          </div>
        </div>
      ) : safeProducts.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">No products match your filters.</p>
            <p className="text-sm text-muted-foreground mb-4">Total products: {data.length}</p>
            {(selectedCategories.length > 0 || selectedSubcategories.length > 0 || priceRange[0] > 0 || priceRange[1] < 30000) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedCategories([]);
                  setSelectedSubcategories([]);
                  setPriceRange([0, 30000]);
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {safeProducts.map((product) => (
            <ProductCard key={product.id} product={product} compact />
          ))}
        </div>
      )}
        </div>
      </div>
    </div>
  );
};

export default Products;
