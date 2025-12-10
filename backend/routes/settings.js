import express from "express";

export default function register({ app, authMiddleware, adminOnly, getSettings, saveSettings }) {
  const router = express.Router();

  router.get("/", (req, res) => {
    try {
      const settings = getSettings();
      res.json(settings);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  router.put("/", authMiddleware, adminOnly, (req, res) => {
    try {
        const current = getSettings();
        const updates = req.body;
        const newSettings = { ...current, ...updates };
        saveSettings(newSettings);
        res.json(newSettings);
    } catch (e) {
        res.status(500).json({ error: "Failed to update settings" });
    }
  });

  app.use("/api/settings", router);
}
