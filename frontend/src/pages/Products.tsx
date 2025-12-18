import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Filter, X, ChevronDown } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/lib/api";
import { leninSubcategories } from "@/data/products";
import type { Product } from "@/types/product";
import { Button } from "@/components/ui/button";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { apiBase } from "@/lib/auth";

function FiltersPanel({
  priceRange,
  setPriceRange,
  selectedCategories,
  setSelectedCategories,
  selectedSubcategories,
  setSelectedSubcategories,
  categoriesData,
  subsByCat,
}: {
  priceRange: number[];
  setPriceRange: (v: number[]) => void;
  selectedCategories: string[];
  setSelectedCategories: (v: string[]) => void;
  selectedSubcategories: string[];
  setSelectedSubcategories: (v: string[]) => void;
  categoriesData: string[];
  subsByCat: Record<string, string[]>;
}) {
  const handleCategoryToggle = (category: string, checked: boolean) => {
    if (checked) {
      setSelectedCategories([...selectedCategories, category]);
    } else {
      setSelectedCategories(selectedCategories.filter((c) => c !== category));
      // Also remove subcategories of this category
      const subsToRemove = subsByCat[category] || [];
      setSelectedSubcategories(selectedSubcategories.filter((s) => !subsToRemove.includes(s)));
    }
  };

  const handleSubcategoryToggle = (subcategory: string, checked: boolean) => {
    if (checked) {
      setSelectedSubcategories([...selectedSubcategories, subcategory]);
    } else {
      setSelectedSubcategories(selectedSubcategories.filter((s) => s !== subcategory));
    }
  };

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
        <Accordion type="multiple" className="w-full">
          {categoriesData.map((category) => {
            const subcategories = subsByCat[category] || [];
            const hasSubcategories = subcategories.length > 0;
            
            return (
              <AccordionItem key={category} value={category} className="border-none">
                <div className="flex items-center space-x-2 py-1">
                  <Checkbox
                    id={`cat-${category}`}
                    checked={selectedCategories.includes(category)}
                    onCheckedChange={(checked) => handleCategoryToggle(category, checked === true)}
                  />
                  <label
                    htmlFor={`cat-${category}`}
                    className="text-sm font-medium leading-none flex-1 cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      handleCategoryToggle(category, !selectedCategories.includes(category));
                    }}
                  >
                    {category}
                  </label>
                  {hasSubcategories && (
                    <AccordionTrigger className="py-0 h-auto [&[data-state=open]>svg]:rotate-180">
                      <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                    </AccordionTrigger>
                  )}
                </div>
                {hasSubcategories && (
                  <AccordionContent className="pb-2 pt-0">
                    <div className="ml-6 space-y-2 mt-2">
                      {subcategories.map((subcategory) => (
                        <div key={subcategory} className="flex items-center space-x-2">
                          <Checkbox
                            id={`sub-${category}-${subcategory}`}
                            checked={selectedSubcategories.includes(subcategory)}
                            onCheckedChange={(checked) => handleSubcategoryToggle(subcategory, checked === true)}
                          />
                          <label
                            htmlFor={`sub-${category}-${subcategory}`}
                            className="text-sm text-muted-foreground leading-none cursor-pointer"
                            onClick={(e) => {
                              e.preventDefault();
                              handleSubcategoryToggle(subcategory, !selectedSubcategories.includes(subcategory));
                            }}
                          >
                            {subcategory}
                          </label>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                )}
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </div>
  );
}

const Products = () => {
  const [priceRange, setPriceRange] = useState([0, 30000]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  
  const { data } = useQuery<Product[]>({ queryKey: ["products"], queryFn: getProducts });
  const { data: categoriesData = [] } = useQuery<string[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/api/categories`);
      return res.json();
    },
  });
  
  const { data: subsByCat = {} as Record<string, string[]> } = useQuery<Record<string, string[]>>({
    queryKey: ["subcategories-all"],
    queryFn: async () => {
      const cats = categoriesData || [];
      if (!cats.length) return {} as Record<string, string[]>;
      const entries = await Promise.all(cats.map(async (c) => {
        const res = await fetch(`${apiBase}/api/subcategories?category=${encodeURIComponent(c)}`);
        const arr = await res.json();
        return [c, arr] as const;
      }));
      return Object.fromEntries(entries);
    },
    enabled: (categoriesData || []).length > 0,
  });
  
  const location = useLocation();
  const query = useMemo(() => new URLSearchParams(location.search).get("query")?.toLowerCase() ?? "", [location.search]);
  const categoryParam = useMemo(() => new URLSearchParams(location.search).get("category"), [location.search]);
  const subParam = useMemo(() => new URLSearchParams(location.search).get("sub"), [location.search]);
  
  const products = useMemo(() => {
    const list = (data || []).filter((p) => {
      const matchesQuery = query ? (p.name.toLowerCase().includes(query) || p.brand.toLowerCase().includes(query) || p.category.toLowerCase().includes(query)) : true;
      const matchesCategoryParam = (() => {
        if (subParam) return p.category.toLowerCase().includes(subParam.toLowerCase());
        if (categoryParam) {
          // Special handling for "sale" category - filter by isSale flag
          if (categoryParam.toLowerCase() === "sale") {
            return p.isSale === true;
          }
          // Special handling for "bestsellers" category - filter by isBestseller flag
          if (categoryParam.toLowerCase() === "bestsellers") {
            return p.isBestseller === true;
          }
          return p.category.toLowerCase().includes(categoryParam.toLowerCase());
        }
        return true;
      })();
      
      // Match selected categories or subcategories
      const matchesCategorySelection = (() => {
        if (selectedCategories.length === 0 && selectedSubcategories.length === 0) return true;
        
        // Check if product matches any selected category
        const matchesCategory = selectedCategories.some((c) => 
          p.category.toLowerCase().includes(c.toLowerCase())
        );
        
        // Check if product matches any selected subcategory
        const matchesSubcategory = selectedSubcategories.some((s) => 
          p.category.toLowerCase() === s.toLowerCase()
        );
        
        return matchesCategory || matchesSubcategory;
      })();
      
      const matchesPrice = p.price >= priceRange[0] && p.price <= priceRange[1];
      return matchesQuery && matchesCategoryParam && matchesCategorySelection && matchesPrice;
    });
    return list;
  }, [data, query, categoryParam, subParam, selectedCategories, selectedSubcategories, priceRange]);

  return (
    <div className="container px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl md:text-4xl font-bold">Shop Sarees</h1>
        <div className="flex items-center gap-4">
          <Select defaultValue="popularity">
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
                    categoriesData={categoriesData}
                    subsByCat={subsByCat}
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
              categoriesData={categoriesData}
              subsByCat={subsByCat}
            />
            <Button className="w-full mt-6" variant="secondary">Apply Filters</Button>
          </div>
        </aside>
        <div>

      {(selectedCategories.length > 0 || selectedSubcategories.length > 0) && (
        <div className="flex flex-wrap gap-2 mb-6">
          {selectedCategories.map((category) => (
            <Button
              key={`cat-${category}`}
              variant="secondary"
              size="sm"
              onClick={() =>
                setSelectedCategories(selectedCategories.filter((c) => c !== category))
              }
            >
              {category}
              <X className="h-3 w-3 ml-2" />
            </Button>
          ))}
          {selectedSubcategories.map((subcategory) => (
            <Button
              key={`sub-${subcategory}`}
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

      {categoryParam?.toLowerCase() === "lenin" && (
        <div className="mb-8">
          <h2 className="font-serif text-2xl font-bold mb-4">Explore Lenin Collections</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {leninSubcategories.map((sub) => (
              <a key={sub.name} href={`/products?category=lenin&sub=${encodeURIComponent(sub.name.toLowerCase())}`} className="group">
                <div className="rounded-lg bg-card p-3 flex items-center gap-3 hover:bg-accent/10 transition-colors border">
                  {sub.image ? (
                    <img src={sub.image} alt={sub.name} className="w-12 h-12 rounded object-cover" />
                  ) : null}
                  <span className="font-medium text-sm truncate">{sub.name}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} compact />
        ))}
      </div>
        </div>
      </div>
    </div>
  );
};

export default Products;
