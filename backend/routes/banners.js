import express from "express";

export default function register({ app, getDb, authMiddleware, adminOnly }) {
  const router = express.Router();

  router.get("/", async (req, res) => {
    try {
      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      const list = await db.collection("banners").find({}).toArray();
      const urls = list.map((b) => b.url);
      res.json(urls);
    } catch (e) {
      console.error("[banners] Get error:", e);
      res.status(500).json({ error: "Failed to fetch banners" });
    }
  });

  router.post("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { url } = req.body || {};
      if (!url || typeof url !== "string") {
        return res.status(400).json({ error: "URL required" });
      }

      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      const exists = await db.collection("banners").findOne({ url });
      if (exists) {
        return res.json({ success: true });
      }

      await db.collection("banners").insertOne({ url });
      res.json({ success: true });
    } catch (e) {
      console.error("[banners] Create error:", e);
      res.status(500).json({ error: "Failed to add banner" });
    }
  });

  router.delete("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      const body = req.body || {};
      const queryUrl = (req.query?.url || "").toString();
      const url = body.url || queryUrl;
      
      if (!url) {
        return res.status(400).json({ error: "URL required" });
      }

      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      await db.collection("banners").deleteOne({ url });
      res.json({ success: true });
    } catch (e) {
      console.error("[banners] Delete error:", e);
      res.status(500).json({ error: "Failed to delete banner" });
    }
  });

  app.use("/api/banners", router);
}
