import express from "express";
import crypto from "crypto";

export default function register({ app, getDb, authMiddleware, adminOnly, getBlogs, setBlogs, saveBlogs, getBlogCategories, setBlogCategories, saveBlogCategories }) {
  const router = express.Router();

  // GET all blogs (public)
  router.get("/", async (req, res) => {
    try {
      const db = getDb();
      if (db) {
        const list = await db.collection("blogs").find({}).sort({ date: -1 }).toArray();
        return res.json(list);
      }
      const blogs = getBlogs();
      res.json(blogs || []);
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  // GET single blog by id (public)
  router.get("/:id", async (req, res) => {
    try {
      const db = getDb();
      if (db) {
        const blog = await db.collection("blogs").findOne({ id: req.params.id });
        if (!blog) return res.status(404).json({ error: "Blog not found" });
        return res.json(blog);
      }
      const blogs = getBlogs();
      const blog = blogs.find((b) => b.id === req.params.id);
      if (!blog) return res.status(404).json({ error: "Blog not found" });
      res.json(blog);
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  // GET all categories (public)
  router.get("/categories/all", async (req, res) => {
    try {
      const db = getDb();
      if (db) {
        const categories = await db.collection("blog_categories").find({}).toArray();
        return res.json(categories.map(c => c.name));
      }
      const categories = getBlogCategories();
      res.json(categories || []);
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  // GET all blogs (admin only - with full data)
  router.get("/admin/all", authMiddleware, adminOnly, async (req, res) => {
    try {
      const db = getDb();
      if (db) {
        const list = await db.collection("blogs").find({}).sort({ date: -1 }).toArray();
        return res.json(list);
      }
      res.json(getBlogs() || []);
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  // POST blog (admin only)
  router.post("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { title, description, image, category, date } = req.body || {};
      if (!title || !category) return res.status(400).json({ error: "Title and category required" });
      
      const id = crypto.randomUUID();
      const blog = {
        id,
        title: title || "",
        description: description || "",
        image: image || "",
        category: category || "",
        date: date || Date.now(),
        createdAt: Date.now(),
      };

      const db = getDb();
      if (db) {
        await db.collection("blogs").insertOne(blog);
        return res.json(blog);
      }
      const blogs = getBlogs() || [];
      blogs.push(blog);
      setBlogs(blogs);
      saveBlogs();
      res.json(blog);
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  // PUT blog (admin only)
  router.put("/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, image, category, date } = req.body || {};
      
      const db = getDb();
      if (db) {
        const blog = {
          title: title || "",
          description: description || "",
          image: image || "",
          category: category || "",
          date: date || Date.now(),
          updatedAt: Date.now(),
        };
        const result = await db.collection("blogs").updateOne(
          { id },
          { $set: blog }
        );
        if (result.matchedCount === 0) return res.status(404).json({ error: "Blog not found" });
        const updated = await db.collection("blogs").findOne({ id });
        return res.json(updated);
      }
      const blogs = getBlogs() || [];
      const index = blogs.findIndex((b) => b.id === id);
      if (index < 0) return res.status(404).json({ error: "Blog not found" });
      blogs[index] = { ...blogs[index], ...req.body, updatedAt: Date.now() };
      setBlogs(blogs);
      saveBlogs();
      res.json(blogs[index]);
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  // DELETE blog (admin only)
  router.delete("/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const db = getDb();
      if (db) {
        const result = await db.collection("blogs").deleteOne({ id });
        if (result.deletedCount === 0) return res.status(404).json({ error: "Blog not found" });
        return res.json({ success: true });
      }
      const blogs = (getBlogs() || []).filter((b) => b.id !== id);
      setBlogs(blogs);
      saveBlogs();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  // POST category (admin only)
  router.post("/categories", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { name } = req.body || {};
      if (!name) return res.status(400).json({ error: "Category name required" });
      
      const db = getDb();
      if (db) {
        const exists = await db.collection("blog_categories").findOne({ name });
        if (exists) return res.status(409).json({ error: "Category already exists" });
        await db.collection("blog_categories").insertOne({ name });
        return res.json({ name });
      }
      const categories = getBlogCategories() || [];
      if (categories.includes(name)) return res.status(409).json({ error: "Category already exists" });
      categories.push(name);
      setBlogCategories(categories);
      saveBlogCategories();
      res.json({ name });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  // DELETE category (admin only)
  router.delete("/categories/:name", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { name } = req.params;
      const db = getDb();
      if (db) {
        await db.collection("blog_categories").deleteOne({ name });
        // Also remove category from all blogs
        await db.collection("blogs").updateMany(
          { category: name },
          { $set: { category: "" } }
        );
        return res.json({ success: true });
      }
      const categories = (getBlogCategories() || []).filter((c) => c !== name);
      setBlogCategories(categories);
      saveBlogCategories();
      // Remove category from all blogs
      const blogs = getBlogs() || [];
      blogs.forEach((blog) => {
        if (blog.category === name) blog.category = "";
      });
      setBlogs(blogs);
      saveBlogs();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  app.use("/api/blogs", router);
}

