import express from "express";

export default function register({ app, getDb, authMiddleware, adminOnly }) {
  const router = express.Router();

  router.get("/", async (req, res) => {
    try {
      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      const list = await db.collection("featured").find({}).toArray();
      const ids = list.map((b) => b.id);
      const products = await db.collection("products").find({ id: { $in: ids } }).toArray();
      res.json(products);
    } catch (e) {
      console.error("[featured] Get error:", e);
      res.status(500).json({ error: "Failed to fetch featured collection" });
    }
  });

  router.post("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { id, ids } = req.body || {};
      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      // Handle bulk update with ids array (for curated featured collection)
      if (Array.isArray(ids)) {
        await db.collection("featured").deleteMany({});
        if (ids.length > 0) {
          await db.collection("featured").insertMany(
            ids.map((productId) => ({ id: productId }))
          );
        }
        return res.json({ success: true });
      }

      // Handle single id
      if (!id) {
        return res.status(400).json({ error: "Product ID required" });
      }

      const exists = await db.collection("featured").findOne({ id });
      if (exists) {
        return res.json({ success: true });
      }

      await db.collection("featured").insertOne({ id });
      res.json({ success: true });
    } catch (e) {
      console.error("[featured] Create error:", e);
      res.status(500).json({ error: "Failed to add featured product" });
    }
  });

  router.delete("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      const body = req.body || {};
      const queryId = (req.query?.id || "").toString();
      const id = body.id || queryId;
      
      if (!id) {
        return res.status(400).json({ error: "Product ID required" });
      }

      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      await db.collection("featured").deleteOne({ id });
      res.json({ success: true });
    } catch (e) {
      console.error("[featured] Delete error:", e);
      res.status(500).json({ error: "Failed to delete featured product" });
    }
  });

  router.delete("/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
      const id = req.params.id;
      if (!id) {
        return res.status(400).json({ error: "Product ID required" });
      }

      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      await db.collection("featured").deleteOne({ id });
      res.json({ success: true });
    } catch (e) {
      console.error("[featured] Delete by id error:", e);
      res.status(500).json({ error: "Failed to delete featured product" });
    }
  });

  app.use("/api/featured", router);
}

