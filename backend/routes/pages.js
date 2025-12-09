import express from "express";

export default function register({ app, getDb, authMiddleware, adminOnly, getPages, setPages, savePages }) {
  const router = express.Router();

  // Get all pages (public, but mostly for admin list or navigation)
  router.get("/", async (req, res) => {
    try {
      const db = getDb();
      if (db) {
        const pages = await db.collection("pages").find({}).toArray();
        return res.json(pages);
      }
      return res.json(getPages());
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  // Get single page by slug
  router.get("/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const db = getDb();
      if (db) {
        const page = await db.collection("pages").findOne({ slug });
        if (!page) return res.status(404).json({ error: "Page not found" });
        return res.json(page);
      }
      const pages = getPages();
      const page = pages.find(p => p.slug === slug);
      if (!page) return res.status(404).json({ error: "Page not found" });
      return res.json(page);
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  // Create new page
  router.post("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { slug, title, content, images } = req.body;
      if (!slug || !title) return res.status(400).json({ error: "Slug and Title are required" });

      const db = getDb();
      if (db) {
        const existing = await db.collection("pages").findOne({ slug });
        if (existing) return res.status(400).json({ error: "Slug already exists" });
        
        await db.collection("pages").insertOne({ 
          slug, 
          title, 
          content: content || "", 
          images: images || [],
          createdAt: new Date(),
          updatedAt: new Date()
        });
        return res.json({ success: true });
      }

      const pages = getPages();
      if (pages.find(p => p.slug === slug)) {
        return res.status(400).json({ error: "Slug already exists" });
      }

      pages.push({ 
        slug, 
        title, 
        content: content || "", 
        images: images || [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      setPages(pages);
      savePages();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  // Update page
  router.put("/:slug", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { slug } = req.params;
      const { title, content, images, newSlug } = req.body;
      
      const db = getDb();
      if (db) {
        const existing = await db.collection("pages").findOne({ slug });
        if (!existing) return res.status(404).json({ error: "Page not found" });

        const updateData = { updatedAt: new Date() };
        if (title) updateData.title = title;
        if (content !== undefined) updateData.content = content;
        if (images) updateData.images = images;
        if (newSlug && newSlug !== slug) {
            // Check if new slug exists
            const slugExists = await db.collection("pages").findOne({ slug: newSlug });
            if (slugExists) return res.status(400).json({ error: "New slug already exists" });
            updateData.slug = newSlug;
        }

        await db.collection("pages").updateOne({ slug }, { $set: updateData });
        return res.json({ success: true });
      }

      const pages = getPages();
      const index = pages.findIndex(p => p.slug === slug);
      if (index === -1) return res.status(404).json({ error: "Page not found" });

      if (newSlug && newSlug !== slug) {
          if (pages.find(p => p.slug === newSlug)) {
              return res.status(400).json({ error: "New slug already exists" });
          }
          pages[index].slug = newSlug;
      }
      if (title) pages[index].title = title;
      if (content !== undefined) pages[index].content = content;
      if (images) pages[index].images = images;
      pages[index].updatedAt = new Date();

      setPages(pages);
      savePages();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  // Delete page
  router.delete("/:slug", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { slug } = req.params;
      const db = getDb();
      if (db) {
        const result = await db.collection("pages").deleteOne({ slug });
        if (result.deletedCount === 0) return res.status(404).json({ error: "Page not found" });
        return res.json({ success: true });
      }

      let pages = getPages();
      const initialLength = pages.length;
      pages = pages.filter(p => p.slug !== slug);
      
      if (pages.length === initialLength) return res.status(404).json({ error: "Page not found" });

      setPages(pages);
      savePages();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  app.use("/api/pages", router);
}
