import { Link } from "react-router-dom";
import HeroCarousel from "@/components/HeroCarousel";
import ProductCard from "@/components/ProductCard";
import { categories } from "@/data/products";
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/lib/api";
import type { Product } from "@/types/product";
import { Sparkles, Gem, Crown, Leaf, Palette, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

const iconMap: Record<string, React.ReactNode> = {
  sparkles: <Sparkles className="h-6 w-6" />,
  gem: <Gem className="h-6 w-6" />,
  crown: <Crown className="h-6 w-6" />,
  leaf: <Leaf className="h-6 w-6" />,
  palette: <Palette className="h-6 w-6" />,
  heart: <Heart className="h-6 w-6" />,
};

const Home = () => {
  const { data } = useQuery<Product[]>({ queryKey: ["products"], queryFn: getProducts });
  return (
    <div>
      <HeroCarousel />

      {/* Categories */}
      <section className="py-16 bg-background">
        <div className="container px-4">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-center mb-12">
            Shop by Category
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/products?category=${category.name.toLowerCase()}`}
                className="group"
              >
                <div className="flex flex-col items-center gap-3 p-6 rounded-lg bg-card hover:bg-accent/10 transition-colors">
                  <div className="p-4 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {iconMap[category.icon]}
                  </div>
                  <span className="font-medium text-center">{category.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16">
        <div className="container px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-serif text-3xl md:text-4xl font-bold">
              Featured Collection
            </h2>
            <Link to="/products">
              <Button variant="outline">View All</Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {data?.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Editorial Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="font-serif text-3xl md:text-4xl font-bold">
              Crafted with Tradition
            </h2>
            <p className="text-lg opacity-90">
              Each saree in our collection is a masterpiece, handwoven by skilled artisans
              using time-honored techniques passed down through generations. Experience the
              perfect blend of heritage and contemporary elegance.
            </p>
            <Button size="lg" variant="secondary" className="mt-4">
              Learn Our Story
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
