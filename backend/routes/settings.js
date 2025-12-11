import express from "express";

export default function register({ app, getDb, authMiddleware, adminOnly }) {
  const router = express.Router();

  const defaultSettings = {
    siteTitle: "Saree Elegance",
    logoUrl: "",
    faviconUrl: "",
    description: "Premium handcrafted sarees for every occasion",
    contactEmail: "",
    contactPhone: "",
    address: "",
    socialMedia: {
      instagram: "",
      facebook: "",
      twitter: "",
    },
  };

  router.get("/", async (req, res) => {
    try {
      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      const doc = await db.collection("settings").findOne({ _id: "main" });
      res.json(doc || defaultSettings);
    } catch (e) {
      console.error("[settings] Get error:", e);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  router.put("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      const settings = req.body || {};
      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      await db.collection("settings").updateOne(
        { _id: "main" },
        { $set: settings },
        { upsert: true }
      );

      res.json({ success: true });
    } catch (e) {
      console.error("[settings] Update error:", e);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  app.use("/api/settings", router);
}
