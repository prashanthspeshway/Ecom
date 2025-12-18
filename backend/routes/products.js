import express from "express";

export default function register({ app, getDb, authMiddleware, adminOnly, getProducts, setProducts, saveProducts, getCategories, setCategories, saveCategories, getSubcategories, saveSubcategories, getOrders }) {
  const router = express.Router();

  router.get("/", async (req, res) => {
    try {
      const db = getDb();
      if (db) {
        const list = await db.collection("products").find({}).toArray();
        return res.json(list);
      }
      res.json(getProducts());
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  router.get("/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const db = getDb();
      if (db) {
        // Try to find by string ID first, then try as number if it's a numeric string
        let item = await db.collection("products").findOne({ id: id });
        if (!item && /^\d+$/.test(id)) {
          // If ID is numeric string, also try finding by numeric ID
          item = await db.collection("products").findOne({ id: Number(id) });
        }
        if (!item && /^\d+$/.test(id)) {
          // Also try as string representation of number
          item = await db.collection("products").findOne({ id: String(Number(id)) });
        }
        if (!item) return res.status(404).json({ error: "Not found" });
        return res.json(item);
      }
      const products = getProducts();
      // Try exact match first
      let item = products.find((p) => p.id === id || String(p.id) === String(id));
      if (!item && /^\d+$/.test(id)) {
        // If ID is numeric, try comparing as numbers
        item = products.find((p) => Number(p.id) === Number(id));
      }
      if (!item) return res.status(404).json({ error: "Not found" });
      res.json(item);
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  router.post("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      const product = req.body || {};
      if (!product.name || !product.price) return res.status(400).json({ error: "Name and price required" });
      const db = getDb();
      if (db) {
        const id = product.id || String(Date.now());
        const doc = { ...product, id, createdAt: Date.now() };
        await db.collection("products").insertOne(doc);
        if (product.category && !getCategories().includes(product.category)) {
          const cats = getCategories();
          setCategories([...cats, product.category]);
          saveCategories();
        }
        return res.json(doc);
      }
      const products = getProducts();
      const id = product.id || String(Date.now());
      const doc = { ...product, id, createdAt: Date.now() };
      products.push(doc);
      setProducts(products);
      saveProducts();
      if (product.category && !getCategories().includes(product.category)) {
        const cats = getCategories();
        setCategories([...cats, product.category]);
        saveCategories();
      }
      res.json(doc);
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  router.put("/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
      const updates = req.body || {};
      const db = getDb();
      if (db) {
        const result = await db.collection("products").updateOne({ id: req.params.id }, { $set: updates });
        if (result.matchedCount === 0) return res.status(404).json({ error: "Not found" });
        const updated = await db.collection("products").findOne({ id: req.params.id });
        return res.json(updated);
      }
      const products = getProducts();
      const idx = products.findIndex((p) => p.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: "Not found" });
      products[idx] = { ...products[idx], ...updates };
      setProducts(products);
      saveProducts();
      res.json(products[idx]);
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  router.delete("/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
      const db = getDb();
      if (db) {
        const result = await db.collection("products").deleteOne({ id: req.params.id });
        if (result.deletedCount === 0) return res.status(404).json({ error: "Not found" });
        return res.json({ success: true });
      }
      const products = getProducts().filter((p) => p.id !== req.params.id);
      setProducts(products);
      saveProducts();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  // Add review to product
  router.post("/:id/reviews", authMiddleware, async (req, res) => {
    try {
      const productId = req.params.id;
      const { rating, comment, images } = req.body || {};
      
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Rating must be between 1 and 5" });
      }

      const db = getDb();
      if (db) {
        // Find product
        let product = await db.collection("products").findOne({ id: productId });
        if (!product && /^\d+$/.test(productId)) {
          product = await db.collection("products").findOne({ id: Number(productId) });
        }
        if (!product && /^\d+$/.test(productId)) {
          product = await db.collection("products").findOne({ id: String(Number(productId)) });
        }
        if (!product) return res.status(404).json({ error: "Product not found" });

        // Get user info
        const user = await db.collection("users").findOne({ email: req.user.email });
        const author = user?.name || user?.email || req.user.email;

        // Create review
        const review = {
          id: String(Date.now()),
          author: author,
          rating: Number(rating),
          comment: comment || "",
          images: Array.isArray(images) ? images : [],
          date: new Date().toISOString().split("T")[0],
        };

        // Add review to product
        const reviews = Array.isArray(product.reviews) ? product.reviews : [];
        reviews.push(review);

        // Update product
        await db.collection("products").updateOne(
          { id: product.id },
          { $set: { reviews: reviews } }
        );

        return res.json(review);
      }

      // File-based storage
      const products = getProducts();
      let product = products.find((p) => p.id === productId || String(p.id) === String(productId));
      if (!product && /^\d+$/.test(productId)) {
        product = products.find((p) => Number(p.id) === Number(productId));
      }
      if (!product) return res.status(404).json({ error: "Product not found" });

      // Get user info from orders to find name
      const orders = getOrders();
      const userOrders = Object.values(orders).flat().filter((o: any) => o.user === req.user.email);
      let author = req.user.email;
      if (userOrders.length > 0 && userOrders[0].shipping) {
        const shipping = userOrders[0].shipping as any;
        if (shipping.first || shipping.last) {
          author = [shipping.first, shipping.last].filter(Boolean).join(" ") || req.user.email;
        }
      }

      // Create review
      const review = {
        id: String(Date.now()),
        author: author,
        rating: Number(rating),
        comment: comment || "",
        images: Array.isArray(images) ? images : [],
        date: new Date().toISOString().split("T")[0],
      };

      // Add review to product
      const reviews = Array.isArray(product.reviews) ? product.reviews : [];
      reviews.push(review);

      // Update product
      const idx = products.findIndex((p) => p.id === product.id);
      if (idx >= 0) {
        products[idx] = { ...products[idx], reviews: reviews };
        setProducts(products);
        saveProducts();
      }

      res.json(review);
    } catch (e) {
      console.error("Review submission error:", e);
      res.status(500).json({ error: "Failed to submit review" });
    }
  });

  app.use("/api/products", router);
}

