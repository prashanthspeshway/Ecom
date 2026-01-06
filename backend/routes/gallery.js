import express from "express";

export default function register({ 
  app, 
  getDb, 
  authMiddleware, 
  adminOnly, 
  getProducts, 
  getBlogs, 
  getBanners, 
  getCarousel, 
  getCategoryTiles 
}) {
  const router = express.Router();

  router.get("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      const db = getDb();
      const gallery = {
        "Product Images": [],
        "Blog Images": [],
        "Banner Images": [],
        "Carousel Images": [],
        "Category Tile Images": []
      };

      // Collect Product Images
      if (db) {
        const products = await db.collection("products").find({}).toArray();
        products.forEach((product) => {
          if (product.images && Array.isArray(product.images)) {
            product.images.forEach((img) => {
              if (img && typeof img === "string" && img.trim()) {
                gallery["Product Images"].push({
                  url: img,
                  source: `Product: ${product.name || product.id}`,
                  id: `${product.id}_${gallery["Product Images"].length}`
                });
              }
            });
          }
        });
      } else {
        const products = getProducts();
        products.forEach((product) => {
          if (product.images && Array.isArray(product.images)) {
            product.images.forEach((img) => {
              if (img && typeof img === "string" && img.trim()) {
                gallery["Product Images"].push({
                  url: img,
                  source: `Product: ${product.name || product.id}`,
                  id: `${product.id}_${gallery["Product Images"].length}`
                });
              }
            });
          }
        });
      }

      // Collect Blog Images
      if (db) {
        const blogs = await db.collection("blogs").find({}).toArray();
        blogs.forEach((blog) => {
          if (blog.image && typeof blog.image === "string" && blog.image.trim()) {
            gallery["Blog Images"].push({
              url: blog.image,
              source: `Blog: ${blog.title || blog.id}`,
              id: blog.id
            });
          }
        });
      } else {
        const blogs = getBlogs();
        blogs.forEach((blog) => {
          if (blog.image && typeof blog.image === "string" && blog.image.trim()) {
            gallery["Blog Images"].push({
              url: blog.image,
              source: `Blog: ${blog.title || blog.id}`,
              id: blog.id
            });
          }
        });
      }

      // Collect Banner Images
      if (db) {
        const banners = await db.collection("banners").find({}).toArray();
        banners.forEach((banner, index) => {
          if (banner.url && typeof banner.url === "string" && banner.url.trim()) {
            gallery["Banner Images"].push({
              url: banner.url,
              source: "Banner",
              id: `banner_${index}`
            });
          }
        });
      } else {
        const banners = getBanners();
        if (Array.isArray(banners)) {
          banners.forEach((url, index) => {
            if (url && typeof url === "string" && url.trim()) {
              gallery["Banner Images"].push({
                url: url,
                source: "Banner",
                id: `banner_${index}`
              });
            }
          });
        }
      }

      // Collect Carousel Images
      if (db) {
        const carousel = await db.collection("carousel").find({}).toArray();
        carousel.forEach((item, index) => {
          const url = item.url || item;
          if (url && typeof url === "string" && url.trim()) {
            gallery["Carousel Images"].push({
              url: url,
              source: "Carousel",
              id: `carousel_${index}`
            });
          }
        });
      } else {
        const carousel = getCarousel();
        if (Array.isArray(carousel)) {
          carousel.forEach((url, index) => {
            if (url && typeof url === "string" && url.trim()) {
              gallery["Carousel Images"].push({
                url: url,
                source: "Carousel",
                id: `carousel_${index}`
              });
            }
          });
        }
      }

      // Collect Category Tile Images
      if (db) {
        const tiles = await db.collection("category_tiles").find({}).toArray();
        tiles.forEach((tile) => {
          if (tile.image && typeof tile.image === "string" && tile.image.trim()) {
            gallery["Category Tile Images"].push({
              url: tile.image,
              source: `Category: ${tile.category || "Unknown"}`,
              id: `tile_${tile._id || tile.category}`
            });
          }
        });
      } else {
        const tiles = getCategoryTiles();
        Object.values(tiles).forEach((tile) => {
          if (tile && tile.image && typeof tile.image === "string" && tile.image.trim()) {
            gallery["Category Tile Images"].push({
              url: tile.image,
              source: `Category: ${tile.category || "Unknown"}`,
              id: `tile_${tile.category}`
            });
          }
        });
      }

      // Remove empty categories
      Object.keys(gallery).forEach((key) => {
        if (gallery[key].length === 0) {
          delete gallery[key];
        }
      });

      res.json(gallery);
    } catch (e) {
      console.error("Gallery error:", e);
      res.status(500).json({ error: "Failed to fetch gallery", detail: String(e?.message || e) });
    }
  });

  app.use("/api/gallery", router);
}

