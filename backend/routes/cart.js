import express from "express";

export default function register({ app, getDb, authMiddleware, getProducts, getCarts, setCarts, saveCarts }) {
  const router = express.Router();

  router.get("/", authMiddleware, async (req, res) => {
    try {
      const db = getDb();
      if (db) {
        const items = await db.collection("cart").find({ user: req.user.email }).toArray();
        const productIds = items.map((i) => i.productId);
        const products = await db.collection("products").find({ id: { $in: productIds } }).toArray();
        const pmap = new Map(products.map((p) => [p.id, p]));
        const enriched = items.map((i) => ({
          productId: i.productId,
          quantity: Number(i.quantity || 1),
          product: pmap.get(i.productId) || null,
        }));
        return res.json(enriched);
      }
      const carts = getCarts();
      const items = Array.isArray(carts[req.user.email]) ? carts[req.user.email] : [];
      const products = getProducts();
      const pmap = new Map(products.map((p) => [p.id, p]));
      const enriched = items.map((i) => ({
        productId: i.productId,
        quantity: Number(i.quantity || 1),
        product: pmap.get(i.productId) || null,
      }));
      res.json(enriched);
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  router.post("/", authMiddleware, async (req, res) => {
    try {
      const { productId, quantity } = req.body || {};
      if (!productId) return res.status(400).json({ error: "Product ID required" });
      const qty = Number(quantity || 1);
      const db = getDb();
      if (db) {
        const exists = await db.collection("cart").findOne({ user: req.user.email, productId });
        if (exists) {
          await db.collection("cart").updateOne({ user: req.user.email, productId }, { $set: { quantity: qty } });
        } else {
          await db.collection("cart").insertOne({ user: req.user.email, productId, quantity: qty });
        }
        return res.json({ success: true });
      }
      const carts = getCarts();
      if (!carts[req.user.email]) carts[req.user.email] = [];
      const idx = carts[req.user.email].findIndex((i) => i.productId === productId);
      if (idx >= 0) {
        carts[req.user.email][idx].quantity = qty;
      } else {
        carts[req.user.email].push({ productId, quantity: qty });
      }
      setCarts(carts);
      saveCarts();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  router.delete("/:productId", authMiddleware, async (req, res) => {
    try {
      const productId = req.params.productId;
      const db = getDb();
      if (db) {
        await db.collection("cart").deleteOne({ user: req.user.email, productId });
        return res.json({ success: true });
      }
      const carts = getCarts();
      if (carts[req.user.email]) {
        carts[req.user.email] = carts[req.user.email].filter((i) => i.productId !== productId);
        setCarts(carts);
        saveCarts();
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  router.delete("/", authMiddleware, async (req, res) => {
    try {
      const db = getDb();
      if (db) {
        await db.collection("cart").deleteMany({ user: req.user.email });
        return res.json({ success: true });
      }
      const carts = getCarts();
      carts[req.user.email] = [];
      setCarts(carts);
      saveCarts();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  app.use("/api/cart", router);
}

