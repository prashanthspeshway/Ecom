import express from "express";

export default function register({ app, getDb, authMiddleware, adminOnly, getFeatured, setFeatured, saveFeatured, getProducts }) {
  const router = express.Router();

  router.get("/", async (req, res) => {
    try {
      const db = getDb();
      if (db) {
        const list = await db.collection("featured").find({}).toArray();
        const ids = list.map((f) => f.id);
        const products = await db.collection("products").find({ id: { $in: ids } }).toArray();
        return res.json(products);
      }
      const ids = getFeatured();
      const products = getProducts();
      const featured = ids.map((id) => products.find((p) => p.id === id)).filter(Boolean);
      res.json(featured);
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  router.post("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { id, ids } = req.body || {};
      // Support both single id and array of ids
      const productIds = ids || (id ? [id] : []);
      if (!productIds.length) return res.status(400).json({ error: "Product ID(s) required" });
      const db = getDb();
      if (db) {
        // Clear existing and insert new ones
        await db.collection("featured").deleteMany({});
        if (productIds.length > 0) {
          await db.collection("featured").insertMany(productIds.map(id => ({ id })));
        }
        return res.json({ success: true });
      }
      setFeatured(productIds);
      saveFeatured();
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
        await db.collection("featured").deleteOne({ id });
        return res.json({ success: true });
      }
      const ids = getFeatured().filter((i) => i !== id);
      setFeatured(ids);
      saveFeatured();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  app.use("/api/featured", router);
}




