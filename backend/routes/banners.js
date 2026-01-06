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
      const { url, urls } = req.body || {};
      const urlList = urls || (url ? [url] : []);
      if (!Array.isArray(urlList) || urlList.length === 0) {
        return res.status(400).json({ error: "URL or URLs array required" });
      }
      const db = getDb();
      if (db) {
        for (const bannerUrl of urlList) {
          if (typeof bannerUrl !== "string") continue;
          const exists = await db.collection("banners").findOne({ url: bannerUrl });
          if (!exists) {
            await db.collection("banners").insertOne({ url: bannerUrl });
          }
        }
        return res.json({ success: true });
      }
      const banners = getBanners();
      const newBanners = [...banners];
      urlList.forEach((bannerUrl) => {
        if (typeof bannerUrl === "string" && !newBanners.includes(bannerUrl)) {
          newBanners.push(bannerUrl);
        }
      });
      setBanners(newBanners);
      saveBanners();
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

