import express from "express";

export default function register({ app, getDb, authMiddleware, getWishlists, setWishlists, saveWishlists, getProducts }) {
  const router = express.Router();

  router.get("/", authMiddleware, async (req, res) => {
    try {
      const db = getDb();
      if (db) {
        const items = await db.collection("wishlist").find({ user: req.user.email }).toArray();
        const productIds = items.map((i) => i.productId);
        const products = await db.collection("products").find({ id: { $in: productIds } }).toArray();
        return res.json(products);
      }
      const wishlists = getWishlists();
      const items = Array.isArray(wishlists[req.user.email]) ? wishlists[req.user.email] : [];
      const productIds = items.map((i) => i.productId);
      const products = getProducts();
      const pmap = new Map(products.map((p) => [p.id, p]));
      const enriched = productIds.map((id) => pmap.get(id)).filter(Boolean);
      res.json(enriched);
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  router.post("/", authMiddleware, async (req, res) => {
    try {
      const { productId } = req.body || {};
      if (!productId) return res.status(400).json({ error: "Product ID required" });
      const db = getDb();
      if (db) {
        const exists = await db.collection("wishlist").findOne({ user: req.user.email, productId });
        if (exists) return res.json({ success: true });
        await db.collection("wishlist").insertOne({ user: req.user.email, productId });
        return res.json({ success: true });
      }
      const wishlists = getWishlists();
      if (!wishlists[req.user.email]) wishlists[req.user.email] = [];
      const exists = wishlists[req.user.email].find((i) => i.productId === productId);
      if (!exists) {
        wishlists[req.user.email].push({ productId });
        setWishlists(wishlists);
        saveWishlists();
      }
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
        await db.collection("wishlist").deleteOne({ user: req.user.email, productId });
        return res.json({ success: true });
      }
      const wishlists = getWishlists();
      if (wishlists[req.user.email]) {
        wishlists[req.user.email] = wishlists[req.user.email].filter((i) => i.productId !== productId);
        setWishlists(wishlists);
        saveWishlists();
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  app.use("/api/wishlist", router);
}

