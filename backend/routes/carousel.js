import express from "express";

export default function register({ app, getDb, authMiddleware, adminOnly }) {
  const router = express.Router();

  router.get("/", async (req, res) => {
    try {
      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      const doc = await db.collection("carousel").findOne({ _id: "default" });
      const images = Array.isArray(doc?.images) ? doc.images.slice(0, 5) : [];
      res.json(images);
    } catch (e) {
      console.error("[carousel] Get error:", e);
      res.status(500).json({ error: "Failed to fetch carousel" });
    }
  });

  router.post("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { images } = req.body || {};
      const list = Array.isArray(images)
        ? images.filter((u) => typeof u === "string").slice(0, 5)
        : [];

      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      await db.collection("carousel").updateOne(
        { _id: "default" },
        { $set: { images: list } },
        { upsert: true }
      );

      res.json({ success: true });
    } catch (e) {
      console.error("[carousel] Update error:", e);
      res.status(500).json({ error: "Failed to update carousel" });
    }
  });

  app.use("/api/carousel", router);
}
