import express from "express";

export default function register({ app, getDb, authMiddleware, adminOnly, getPages, setPages, savePages }) {
  const router = express.Router();

  // GET all pages (public - for footer links)
  router.get("/", async (req, res) => {
    try {
      const db = getDb();
      if (db) {
        const list = await db.collection("pages").find({}).toArray();
        // Return only slug and title for public access
        return res.json(list.map(p => ({ slug: p.slug, title: p.title })));
      }
      const pages = getPages();
      res.json(pages.map(p => ({ slug: p.slug, title: p.title })));
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  // GET single page by slug (public)
  router.get("/:slug", async (req, res) => {
    try {
      const db = getDb();
      if (db) {
        const page = await db.collection("pages").findOne({ slug: req.params.slug });
        if (!page) return res.status(404).json({ error: "Page not found" });
        return res.json(page);
      }
      const pages = getPages();
      const page = pages.find((p) => p.slug === req.params.slug);
      if (!page) return res.status(404).json({ error: "Page not found" });
      res.json(page);
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  // GET all pages with content (admin only)
  router.get("/admin/all", authMiddleware, adminOnly, async (req, res) => {
    try {
      const db = getDb();
      if (db) {
        const list = await db.collection("pages").find({}).toArray();
        return res.json(list);
      }
      res.json(getPages());
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  // POST/PUT page (admin only)
  router.post("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { slug, title, content } = req.body || {};
      if (!slug || !title) return res.status(400).json({ error: "Slug and title required" });
      
      const db = getDb();
      if (db) {
        const page = { slug, title, content: content || "", updatedAt: Date.now() };
        await db.collection("pages").updateOne(
          { slug },
          { $set: page },
          { upsert: true }
        );
        return res.json(page);
      }
      const pages = getPages();
      const existingIndex = pages.findIndex((p) => p.slug === slug);
      const page = { slug, title, content: content || "", updatedAt: Date.now() };
      if (existingIndex >= 0) {
        pages[existingIndex] = page;
      } else {
        pages.push(page);
      }
      setPages(pages);
      savePages();
      res.json(page);
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  // DELETE page (admin only)
  router.delete("/:slug", authMiddleware, adminOnly, async (req, res) => {
    try {
      const db = getDb();
      if (db) {
        const result = await db.collection("pages").deleteOne({ slug: req.params.slug });
        if (result.deletedCount === 0) return res.status(404).json({ error: "Page not found" });
        return res.json({ success: true });
      }
      const pages = getPages().filter((p) => p.slug !== req.params.slug);
      setPages(pages);
      savePages();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  app.use("/api/pages", router);
}



