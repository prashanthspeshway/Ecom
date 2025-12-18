import express from "express";

export default function register({ app, getDb, authMiddleware, adminOnly, getBestsellers, setBestsellers, saveBestsellers, getProducts }) {
  const router = express.Router();

  router.get("/", async (req, res) => {
    try {
      const db = getDb();
      if (db) {
        const list = await db.collection("bestsellers").find({}).toArray();
        const ids = list.map((b) => b.id);
        const products = await db.collection("products").find({ id: { $in: ids } }).toArray();
        return res.json(products);
      }
      const ids = getBestsellers();
      const products = getProducts();
      const bestsellers = ids.map((id) => products.find((p) => p.id === id)).filter(Boolean);
      res.json(bestsellers);
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  router.post("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: "Product ID required" });
      const db = getDb();
      if (db) {
        const exists = await db.collection("bestsellers").findOne({ id });
        if (exists) return res.json({ success: true });
        await db.collection("bestsellers").insertOne({ id });
        return res.json({ success: true });
      }
      const ids = getBestsellers();
      if (!ids.includes(id)) {
        setBestsellers([...ids, id]);
        saveBestsellers();
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  router.delete("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      const body = req.body || {};
      const queryId = (req.query?.id || "").toString();
      const id = body.id || queryId;
      if (!id) return res.status(400).json({ error: "Product ID required" });
      const db = getDb();
      if (db) {
        await db.collection("bestsellers").deleteOne({ id });
        return res.json({ success: true });
      }
      const ids = getBestsellers().filter((i) => i !== id);
      setBestsellers(ids);
      saveBestsellers();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  app.use("/api/bestsellers", router);
}

