import { Link } from "react-router-dom";
import { Heart, ShoppingCart } from "lucide-react";
import { Product } from "@/types/product";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { addToCart } from "@/lib/cart";
import { toggleWishlist, isWishlisted } from "@/lib/wishlist";
import { useState, useEffect } from "react";

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const [wish, setWish] = useState(false);
  useEffect(() => {
    setWish(isWishlisted(product.id));
  }, [product.id]);
  return (
    <div className="group relative">
      <Link to={`/product/${product.id}`}>
        <div className="relative overflow-hidden rounded-lg bg-card aspect-square mb-4">
          <img
            src={product.images?.[0] ?? "/placeholder.svg"}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {product.discount && (
            <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground">
              {product.discount}% OFF
            </Badge>
          )}
          <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="icon" variant="secondary" className="h-9 w-9 rounded-full" onClick={(e) => { e.preventDefault(); toggleWishlist(product); setWish(!wish); }}>
              <Heart className={`h-4 w-4 ${wish ? "text-primary" : ""}`} />
            </Button>
          </div>
        </div>
      </Link>

      <div className="space-y-2">
        <Link to={`/product/${product.id}`}>
          <h3 className="font-serif text-lg font-medium hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>
        
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold">₹{product.price.toLocaleString()}</span>
          {product.originalPrice && (
            <span className="text-sm text-muted-foreground line-through">
              ₹{product.originalPrice.toLocaleString()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <span
                key={i}
                className={`text-sm ${
                  i < Math.floor(product.rating) ? "text-accent" : "text-muted"
                }`}
              >
                ★
              </span>
            ))}
          </div>
          <span className="text-sm text-muted-foreground">({product.reviews.length})</span>
        </div>

        <Button className="w-full mt-2" variant="outline" size="sm" onClick={() => addToCart(product, 1)}>
          <ShoppingCart className="h-4 w-4 mr-2" />
          Add to Cart
        </Button>
      </div>
    </div>
  );
};

export default ProductCard;
