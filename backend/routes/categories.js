import express from "express";

export default function register({ app, getDb, authMiddleware, adminOnly }) {
  const router = express.Router();

  router.get("/", async (req, res) => {
    try {
      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      const cats = await db.collection("categories").find({}).toArray();
      const catNames = cats.map((c) => c.name);
      
      const subcats = await db.collection("subcategories").find({}).toArray();
      const subNames = new Set(subcats.map((s) => s.name));
      
      // Filter out categories that are actually subcategories
      const filtered = catNames.filter((name) => !subNames.has(name));
      res.json(filtered);
    } catch (e) {
      console.error("[categories] Get error:", e);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  router.post("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { name } = req.body || {};
      if (!name) {
        return res.status(400).json({ error: "Name required" });
      }

      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      const exists = await db.collection("categories").findOne({ name });
      if (exists) {
        return res.json({ success: true });
      }

      await db.collection("categories").insertOne({ name });
      res.json({ success: true });
    } catch (e) {
      console.error("[categories] Create error:", e);
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  router.put("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { oldName, newName } = req.body || {};
      if (!oldName || !newName) {
        return res.status(400).json({ error: "oldName and newName required" });
      }

      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      const exists = await db.collection("categories").findOne({ name: oldName });
      if (!exists) {
        return res.status(404).json({ error: "Category not found" });
      }

      await db.collection("categories").updateOne(
        { name: oldName },
        { $set: { name: newName } }
      );
      
      // Update subcategories that reference this category
      await db.collection("subcategories").updateMany(
        { category: oldName },
        { $set: { category: newName } }
      );

      res.json({ success: true });
    } catch (e) {
      console.error("[categories] Update error:", e);
      res.status(500).json({ error: "Failed to update category" });
    }
  });

  router.delete("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      const body = req.body || {};
      const queryName = (req.query?.name || "").toString();
      const name = body.name || queryName;
      
      if (!name) {
        return res.status(400).json({ error: "Name required" });
      }

      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      await db.collection("categories").deleteOne({ name });
      await db.collection("subcategories").deleteMany({ category: name });
      
      res.json({ success: true });
    } catch (e) {
      console.error("[categories] Delete error:", e);
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  app.use("/api/categories", router);
}
