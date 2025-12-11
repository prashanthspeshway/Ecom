import express from "express";

export default function register({ app, getDb, authMiddleware, adminOnly }) {
  const router = express.Router();

  router.get("/", async (req, res) => {
    try {
      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      const list = await db.collection("category_tiles")
        .find({})
        .sort({ position: 1 })
        .toArray();

      const formatted = list.map((x) => ({
        category: x.category,
        image: x.image,
        position: Number(x.position || 0),
      }));

      res.json(formatted);
    } catch (e) {
      console.error("[categoryTiles] Get error:", e);
      res.status(500).json({ error: "Failed to fetch category tiles" });
    }
  });

  router.post("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { category, image, position } = req.body || {};
      if (!category || !image || position === undefined) {
        return res.status(400).json({ error: "category, image, position required" });
      }

      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      await db.collection("category_tiles").updateOne(
        { position: Number(position) },
        { $set: { category, image, position: Number(position) } },
        { upsert: true }
      );

      res.json({ success: true });
    } catch (e) {
      console.error("[categoryTiles] Create error:", e);
      res.status(500).json({ error: "Failed to update category tile" });
    }
  });

  router.delete("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      const category = (req.query.category || "").toString();
      const position = req.query.position !== undefined ? Number(req.query.position) : undefined;

      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      if (position !== undefined && !Number.isNaN(position)) {
        await db.collection("category_tiles").deleteOne({ position });
      } else if (category) {
        await db.collection("category_tiles").deleteOne({ category });
      } else {
        return res.status(400).json({ error: "category or position required" });
      }

      res.json({ success: true });
    } catch (e) {
      console.error("[categoryTiles] Delete error:", e);
      res.status(500).json({ error: "Failed to delete category tile" });
    }
  });

  app.use("/api/category-tiles", router);
}
