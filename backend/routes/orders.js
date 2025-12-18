import express from "express";
import crypto from "crypto";

export default function register({ app, getDb, authMiddleware, adminOnly, getOrders, setOrders, saveOrders, getLastCheckout, setLastCheckout, getProducts, getCarts, setCarts, saveCarts }) {
  const router = express.Router();

  router.get("/", authMiddleware, async (req, res) => {
    try {
      const db = getDb();
      if (db) {
        const list = await db.collection("orders").find({ user: req.user.email }).sort({ createdAt: -1 }).toArray();
        return res.json(list);
      }
      const list = Array.isArray(getOrders()[req.user.email]) ? getOrders()[req.user.email] : [];
      res.json(list);
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  router.get("/:id", authMiddleware, async (req, res) => {
    try {
      const db = getDb();
      if (db) {
        const item = await db.collection("orders").findOne({ id: req.params.id, user: req.user.email });
        if (!item) return res.status(404).json({ error: "Not found" });
        return res.json(item);
      }
      const list = Array.isArray(getOrders()[req.user.email]) ? getOrders()[req.user.email] : [];
      const item = list.find((o) => o.id === req.params.id);
      if (!item) return res.status(404).json({ error: "Not found" });
      res.json(item);
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  router.post("/", authMiddleware, async (req, res) => {
    try {
      const db = getDb();
      let items = Array.isArray(req.body?.items) ? req.body.items : [];
      if (!items.length) {
        if (db) {
          const cartItems = await db.collection("cart").find({ user: req.user.email }).toArray();
          items = cartItems.map((c) => ({ productId: c.productId, quantity: Number(c.quantity || 1) }));
        } else {
          const carts = getCarts();
          const list = Array.isArray(carts[req.user.email]) ? carts[req.user.email] : [];
          items = list.map((c) => ({ productId: c.productId, quantity: Number(c.quantity || 1) }));
        }
      }
      if (!items.length) return res.status(400).json({ error: "Cart is empty" });
      if (db) {
        const map = new Map((await db.collection("products").find({ id: { $in: items.map((it) => it.productId) } }).toArray()).map((p) => [p.id, p]));
        const enriched = items.map((it) => {
          const p = map.get(it.productId) || {};
          return { productId: it.productId, quantity: Number(it.quantity || 1), price: Number(p.price || 0), name: p.name || "", image: (p.images || [])[0] || "", progress: { placed: Date.now() } };
        });
        const order = { id: crypto.randomUUID(), user: req.user.email, items: enriched, status: "placed", createdAt: Date.now(), shipping: getLastCheckout()?.[req.user.email] || null };
        await db.collection("orders").insertOne(order);
        await db.collection("cart").deleteMany({ user: req.user.email });
        return res.json(order);
      }
      const products = getProducts() || [];
      const pmap = new Map(products.map((p) => [p.id, p]));
      const enriched = items.map((it) => {
        const p = pmap.get(it.productId) || {};
        return { productId: it.productId, quantity: Number(it.quantity || 1), price: Number(p.price || 0), name: p.name || "", image: (p.images || [])[0] || "", progress: { placed: Date.now() } };
      });
      const order = { id: String(Date.now()), user: req.user.email, items: enriched, status: "placed", createdAt: Date.now(), shipping: getLastCheckout()?.[req.user.email] || null };
      const orders = getOrders();
      const list = Array.isArray(orders[req.user.email]) ? orders[req.user.email] : [];
      orders[req.user.email] = [order, ...list];
      setOrders(orders);
      saveOrders();
      const carts = getCarts();
      carts[req.user.email] = [];
      setCarts(carts);
      if (typeof saveCarts === "function") saveCarts();
      res.json(order);
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  

  app.post("/api/checkout", authMiddleware, (req, res) => {
    try {
      const email = req.user?.email;
      const prev = getLastCheckout();
      const next = { ...(req.body || {}), date: Date.now() };
      prev[email] = next;
      setLastCheckout(prev);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  app.use("/api/orders", router);
}