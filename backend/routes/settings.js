import express from "express";

export default function register({ app, getDb, authMiddleware, adminOnly, getSettings, setSettings, saveSettings }) {
  const router = express.Router();

  // GET settings (public)
  router.get("/", async (req, res) => {
    try {
      const db = getDb();
      if (db) {
        const settings = await db.collection("settings").findOne({});
        return res.json(settings || {});
      }
      res.json(getSettings() || {});
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  // POST/PUT settings (admin only)
  router.post("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      const settings = req.body || {};
      const db = getDb();
      if (db) {
        await db.collection("settings").updateOne(
          {},
          { $set: { ...settings, updatedAt: Date.now() } },
          { upsert: true }
        );
        return res.json(settings);
      }
      setSettings(settings);
      saveSettings();
      res.json(settings);
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  app.use("/api/settings", router);
}




