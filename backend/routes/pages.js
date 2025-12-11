import express from "express";

export default function register({ app, getDb, authMiddleware, adminOnly }) {
  const router = express.Router();

  router.get("/", async (req, res) => {
    try {
      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      const pages = await db.collection("pages").find({}).toArray();
      res.json(pages);
    } catch (e) {
      console.error("[pages] Get error:", e);
      res.status(500).json({ error: "Failed to fetch pages" });
    }
  });

  router.get("/:slug", async (req, res) => {
    try {
      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      const page = await db.collection("pages").findOne({ slug: req.params.slug });
      if (!page) {
        return res.status(404).json({ error: "Page not found" });
      }
      res.json(page);
    } catch (e) {
      console.error("[pages] Get by slug error:", e);
      res.status(500).json({ error: "Failed to fetch page" });
    }
  });

  router.post("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { title, slug, content } = req.body || {};
      if (!title || !slug) {
        return res.status(400).json({ error: "Title and slug required" });
      }

      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      const exists = await db.collection("pages").findOne({ slug });
      if (exists) {
        return res.status(400).json({ error: "Page with this slug already exists" });
      }

      const page = {
        title,
        slug,
        content: content || "",
        createdAt: Date.now(),
      };

      await db.collection("pages").insertOne(page);
      res.json(page);
    } catch (e) {
      console.error("[pages] Create error:", e);
      res.status(500).json({ error: "Failed to create page" });
    }
  });

  router.put("/:slug", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { title, content } = req.body || {};
      if (!title) {
        return res.status(400).json({ error: "Title required" });
      }

      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      const result = await db.collection("pages").updateOne(
        { slug: req.params.slug },
        { $set: { title, content: content || "" } }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Page not found" });
      }

      const page = await db.collection("pages").findOne({ slug: req.params.slug });
      res.json(page);
    } catch (e) {
      console.error("[pages] Update error:", e);
      res.status(500).json({ error: "Failed to update page" });
    }
  });

  router.delete("/:slug", authMiddleware, adminOnly, async (req, res) => {
    try {
      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      const result = await db.collection("pages").deleteOne({ slug: req.params.slug });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "Page not found" });
      }

      res.json({ success: true });
    } catch (e) {
      console.error("[pages] Delete error:", e);
      res.status(500).json({ error: "Failed to delete page" });
    }
  });

  app.use("/api/pages", router);
}
