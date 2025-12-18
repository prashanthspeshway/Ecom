import express from "express";

export default function register({ app, getDb, authMiddleware, adminOnly, getBanners, setBanners, saveBanners }) {
  const router = express.Router();

  router.get("/", async (req, res) => {
    try {
      const db = getDb();
      if (db) {
        const list = await db.collection("banners").find({}).toArray();
        const urls = list.map((b) => b.url);
        return res.json(urls);
      }
      const arr = getBanners();
      res.json(Array.isArray(arr) ? arr : []);
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  router.post("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { url } = req.body || {};
      if (!url || typeof url !== "string") return res.status(400).json({ error: "URL required" });
      const db = getDb();
      if (db) {
        const exists = await db.collection("banners").findOne({ url });
        if (exists) return res.json({ success: true });
        await db.collection("banners").insertOne({ url });
        return res.json({ success: true });
      }
      const banners = getBanners();
      if (!banners.includes(url)) {
        setBanners([...banners, url]);
        saveBanners();
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  router.delete("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      const body = req.body || {};
      const queryUrl = (req.query?.url || "").toString();
      const url = body.url || queryUrl;
      if (!url) return res.status(400).json({ error: "URL required" });
      const db = getDb();
      if (db) {
        await db.collection("banners").deleteOne({ url });
        return res.json({ success: true });
      }
      const banners = getBanners().filter((u) => u !== url);
      setBanners(banners);
      saveBanners();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  app.use("/api/banners", router);
}

