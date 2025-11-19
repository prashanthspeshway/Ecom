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

export type Category = { id: string; name: string; icon: string; image?: string };
export const categories: Category[] = [
  { id: "1", name: "Silk Sarees", icon: "sparkles" },
  { id: "2", name: "Banarasi", icon: "gem" },
  { id: "3", name: "Kanjeevaram", icon: "crown" },
  { id: "4", name: "Cotton", icon: "leaf" },
  { id: "5", name: "Designer", icon: "palette" },
  { id: "6", name: "Wedding", icon: "heart" },
  { id: "7", name: "Lenin", icon: "sparkles" }
];

export const leninSubcategories: { name: string; image?: string }[] = [
  { name: "Lenin Kanchi Border", image: "https://images.unsplash.com/photo-1623998024150-2e957e1ec66a?q=80&w=800&auto=format&fit=crop" },
  { name: "Lenin Bathik Prints", image: "https://images.unsplash.com/photo-1556740772-1a741367b93e?q=80&w=800&auto=format&fit=crop" },
  { name: "Lenin Printed", image: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=800&auto=format&fit=crop" },
  { name: "Lenin Ikkat", image: "https://images.unsplash.com/photo-1608830595689-3bdbac6fba02?q=80&w=800&auto=format&fit=crop" },
  { name: "Lenin Tissue", image: "https://images.unsplash.com/photo-1566438482161-2411f2bb0b4d?q=80&w=800&auto=format&fit=crop" },
  { name: "Lenin Shibori Sarees", image: "https://images.unsplash.com/photo-1545312705-6cf62ed0b3f9?q=80&w=800&auto=format&fit=crop" },
  { name: "Lenin Digital Print", image: "https://images.unsplash.com/photo-1520975711110-28b5f64b04d3?q=80&w=800&auto=format&fit=crop" },
  { name: "Lenin Kalamkari", image: "https://images.unsplash.com/photo-1601505778059-9f2a3dfcc5c5?q=80&w=800&auto=format&fit=crop" },
  { name: "Lenin Silk Sateen Border", image: "https://images.unsplash.com/photo-1566174054626-3a8f04e1f2e3?q=80&w=800&auto=format&fit=crop" },
  { name: "Kantha Work", image: "https://images.unsplash.com/photo-1555685812-4b7432b7a7a9?q=80&w=800&auto=format&fit=crop" },
  { name: "Summer Special Lenin Sarees", image: "https://images.unsplash.com/photo-1503342452485-86ff8f0f79df?q=80&w=800&auto=format&fit=crop" },
  { name: "Lenin Sequence Work", image: "https://images.unsplash.com/photo-1541099649105-f69ad21f8a3b?q=80&w=800&auto=format&fit=crop" },
  { name: "Lenin Sarees", image: "https://images.unsplash.com/photo-1520975731749-74c5161a0171?q=80&w=800&auto=format&fit=crop" }
];
