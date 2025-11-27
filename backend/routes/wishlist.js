import express from "express";

export default function register({ app, getDb, authMiddleware, getWishlists, setWishlists, saveWishlists }) {
  const router = express.Router();

  router.get("/", authMiddleware, async (req, res) => {
    try {
      const db = getDb();
      if (db) {
        const list = await db.collection("wishlists").find({ user: req.user.email }).toArray();
        return res.json(list.map((x) => x.productId));
      }
      const list = Array.isArray(getWishlists()[req.user.email]) ? getWishlists()[req.user.email] : [];
      res.json(list);
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  router.post("/", authMiddleware, async (req, res) => {
    try {
      const { productId } = req.body || {};
      if (!productId) return res.status(400).json({ error: "productId required" });
      const db = getDb();
      if (db) {
        await db.collection("wishlists").updateOne({ user: req.user.email, productId }, { $set: { user: req.user.email, productId } }, { upsert: true });
        return res.json({ success: true });
      }
      const wl = getWishlists();
      const list = Array.isArray(wl[req.user.email]) ? wl[req.user.email] : [];
      if (!list.includes(productId)) list.push(productId);
      wl[req.user.email] = list;
      setWishlists(wl);
      saveWishlists();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  router.delete("/", authMiddleware, async (req, res) => {
    try {
      const productId = (req.query.productId || "").toString();
      const db = getDb();
      if (db) {
        await db.collection("wishlists").deleteOne({ user: req.user.email, productId });
        return res.json({ success: true });
      }
      const wl = getWishlists();
      const list = Array.isArray(wl[req.user.email]) ? wl[req.user.email] : [];
      wl[req.user.email] = list.filter((id) => id !== productId);
      setWishlists(wl);
      saveWishlists();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  app.use("/api/wishlist", router);
}