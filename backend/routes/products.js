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
      const db = getDb();
      if (db) {
        const item = await db.collection("products").findOne({ id: req.params.id });
        if (!item) return res.status(404).json({ error: "Not found" });
        return res.json(item);
      }
      const products = getProducts();
      const item = products.find((p) => p.id === req.params.id);
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

  app.use("/api/products", router);
}

