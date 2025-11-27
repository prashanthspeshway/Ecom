import express from "express";

export default function register({ app, getDb, authMiddleware, adminOnly, getBanners, setBanners, saveBanners }) {
  const router = express.Router();

  router.get("/", async (req, res) => {
    try {
      const db = getDb();
      if (db) {
        const list = await db.collection("banners").find({}).toArray();
        return res.json(list.map((b) => b.url));
      }
      return res.json(getBanners());
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  router.post("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { urls } = req.body || {};
      const arr = Array.isArray(urls) ? urls : [];
      if (!arr.length) return res.status(400).json({ error: "urls required" });
      const db = getDb();
      if (db) {
        for (const u of arr) {
          const exists = await db.collection("banners").findOne({ url: u });
          if (!exists) await db.collection("banners").insertOne({ url: u });
        }
        return res.json({ success: true });
      }
      const list = getBanners();
      for (const u of arr) { if (!list.includes(u)) list.push(u); }
      setBanners(list);
      saveBanners();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  router.delete("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { url } = req.body || {};
      if (!url) return res.status(400).json({ error: "url required" });
      const db = getDb();
      if (db) {
        await db.collection("banners").deleteOne({ url });
        return res.json({ success: true });
      }
      const list = getBanners().filter((b) => b !== url);
      setBanners(list);
      saveBanners();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  app.use("/api/banners", router);
}