import express from "express";

export default function register({ app, getDb, authMiddleware, getProducts, getCarts, setCarts, saveCarts }) {
  const router = express.Router();

  router.get("/", authMiddleware, async (req, res) => {
    try {
      const db = getDb();
      if (db) {
        const items = await db.collection("cart").find({ user: req.user.email }).toArray();
        const ids = items.map((i) => i.productId);
        const productsList = await db.collection("products").find({ id: { $in: ids } }).toArray();
        const map = new Map(productsList.map((p) => [p.id, p]));
        const result = items.map((i) => ({ product: map.get(i.productId), quantity: i.quantity })).filter((x) => x.product);
        return res.json(result);
      }
      const list = Array.isArray(getCarts()[req.user.email]) ? getCarts()[req.user.email] : [];
      const map = new Map(getProducts().map((p) => [p.id, p]));
      const result = list.map((i) => ({ product: map.get(i.productId), quantity: i.quantity })).filter((x) => x.product);
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  router.post("/", authMiddleware, async (req, res) => {
    try {
      const { productId, quantity } = req.body || {};
      if (!productId) return res.status(400).json({ error: "productId required" });
      const db = getDb();
      if (db) {
        await db.collection("cart").updateOne({ user: req.user.email, productId }, { $set: { productId, quantity: Number(quantity || 1), user: req.user.email } }, { upsert: true });
        return res.json({ success: true });
      }
      const carts = getCarts();
      const list = Array.isArray(carts[req.user.email]) ? carts[req.user.email] : [];
      const idx = list.findIndex((i) => i.productId === productId);
      if (idx >= 0) list[idx].quantity = Number(quantity || list[idx].quantity || 1); else list.push({ productId, quantity: Number(quantity || 1) });
      carts[req.user.email] = list;
      setCarts(carts);
      saveCarts();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  router.put("/", authMiddleware, async (req, res) => {
    try {
      const { productId, quantity } = req.body || {};
      if (!productId || typeof quantity !== "number") return res.status(400).json({ error: "productId, quantity required" });
      const db = getDb();
      if (db) {
        await db.collection("cart").updateOne({ user: req.user.email, productId }, { $set: { quantity } }, { upsert: true });
        return res.json({ success: true });
      }
      const carts = getCarts();
      const list = Array.isArray(carts[req.user.email]) ? carts[req.user.email] : [];
      const idx = list.findIndex((i) => i.productId === productId);
      if (idx >= 0) list[idx].quantity = quantity; else list.push({ productId, quantity });
      carts[req.user.email] = list;
      setCarts(carts);
      saveCarts();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  router.delete("/", authMiddleware, async (req, res) => {
    try {
      const productId = (req.query.productId || "").toString();
      const all = (req.query.all || "").toString();
      const db = getDb();
      if (db) {
        if (all) await db.collection("cart").deleteMany({ user: req.user.email }); else await db.collection("cart").deleteOne({ user: req.user.email, productId });
        return res.json({ success: true });
      }
      const carts = getCarts();
      if (all) { carts[req.user.email] = []; } else {
        const list = Array.isArray(carts[req.user.email]) ? carts[req.user.email] : [];
        carts[req.user.email] = list.filter((i) => i.productId !== productId);
      }
      setCarts(carts);
      saveCarts();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  app.use("/api/cart", router);
}