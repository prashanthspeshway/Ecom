import { Product } from "@/types/product";
import product1 from "@/assets/product-1.jpg";
import product2 from "@/assets/product-2.jpg";
import product3 from "@/assets/product-3.jpg";
import product4 from "@/assets/product-4.jpg";

export const products: Product[] = [
  {
    id: "1",
    name: "Emerald Silk Saree",
    brand: "Saree Elegance",
    images: [product1],
    price: 12999,
    originalPrice: 15999,
    discount: 19,
    colors: ["Emerald Green", "Gold"],
    fabrics: ["Pure Silk"],
    measurements: {
      length: "6.3 meters",
      width: "1.2 meters"
    },
    care: "Dry clean only",
    stock: 15,
    rating: 4.8,
    reviews: [
      {
        id: "r1",
        author: "Priya S.",
        rating: 5,
        comment: "Absolutely stunning saree! The silk quality is exceptional.",
        date: "2024-01-15"
      }
    ],
    category: "Silk Sarees",
    occasion: "Wedding"
  },
  {
    id: "2",
    name: "Royal Blue Banarasi",
    brand: "Saree Elegance",
    images: [product2],
    price: 18999,
    originalPrice: 22999,
    discount: 17,
    colors: ["Royal Blue", "Gold", "Silver"],
    fabrics: ["Banarasi Silk"],
    measurements: {
      length: "6.3 meters",
      width: "1.2 meters"
    },
    care: "Dry clean only",
    stock: 8,
    rating: 4.9,
    reviews: [
      {
        id: "r2",
        author: "Anjali K.",
        rating: 5,
        comment: "The zari work is breathtaking. Perfect for special occasions.",
        date: "2024-01-20"
      }
    ],
    category: "Banarasi Sarees",
    occasion: "Festival"
  },
  {
    id: "3",
    name: "Pink Floral Silk",
    brand: "Saree Elegance",
    images: [product3],
    price: 9999,
    originalPrice: 12999,
    discount: 23,
    colors: ["Pink", "Gold"],
    fabrics: ["Silk"],
    measurements: {
      length: "6.3 meters",
      width: "1.2 meters"
    },
    care: "Dry clean only",
    stock: 20,
    rating: 4.7,
    reviews: [],
    category: "Silk Sarees",
    occasion: "Party"
  },
  {
    id: "4",
    name: "Maroon Kanjeevaram",
    brand: "Saree Elegance",
    images: [product4],
    price: 24999,
    originalPrice: 29999,
    discount: 17,
    colors: ["Maroon", "Gold"],
    fabrics: ["Kanjeevaram Silk"],
    measurements: {
      length: "6.3 meters",
      width: "1.2 meters"
    },
    care: "Dry clean only",
    stock: 5,
    rating: 5.0,
    reviews: [
      {
        id: "r3",
        author: "Lakshmi M.",
        rating: 5,
        comment: "Heritage quality Kanjeevaram. Worth every rupee!",
        date: "2024-01-25"
      }
    ],
    category: "Kanjeevaram Sarees",
    occasion: "Wedding"
  }
];

export const categories = [
  { id: "1", name: "Silk Sarees", icon: "sparkles" },
  { id: "2", name: "Banarasi", icon: "gem" },
  { id: "3", name: "Kanjeevaram", icon: "crown" },
  { id: "4", name: "Cotton", icon: "leaf" },
  { id: "5", name: "Designer", icon: "palette" },
  { id: "6", name: "Wedding", icon: "heart" }
];
