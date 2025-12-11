import express from "express";

export default function register({ app, getDb, authMiddleware, adminOnly }) {
  const router = express.Router();

  router.get("/", async (req, res) => {
    try {
      const category = req.query?.category;
      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      const query = category ? { category } : {};
      const list = await db.collection("subcategories").find(query).toArray();
      
      if (category) {
        const subcats = list.map((s) => s.name);
        res.json(subcats);
      } else {
        const grouped = list.reduce((acc, s) => {
          if (!acc[s.category]) acc[s.category] = [];
          acc[s.category].push(s.name);
          return acc;
        }, {});
        res.json(grouped);
      }
    } catch (e) {
      console.error("[subcategories] Get error:", e);
      res.status(500).json({ error: "Failed to fetch subcategories" });
    }
  });

  router.post("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { category, name } = req.body || {};
      if (!category || !name) {
        return res.status(400).json({ error: "Category and name required" });
      }

      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      const exists = await db.collection("subcategories").findOne({ category, name });
      if (exists) {
        return res.json({ success: true });
      }

      await db.collection("subcategories").insertOne({ category, name });
      res.json({ success: true });
    } catch (e) {
      console.error("[subcategories] Create error:", e);
      res.status(500).json({ error: "Failed to create subcategory" });
    }
  });

  router.put("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { category, oldName, newName } = req.body || {};
      if (!category || !oldName || !newName) {
        return res.status(400).json({ error: "Category, oldName and newName required" });
      }

      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      const exists = await db.collection("subcategories").findOne({ category, name: oldName });
      if (!exists) {
        return res.status(404).json({ error: "Subcategory not found" });
      }

      await db.collection("subcategories").updateOne(
        { category, name: oldName },
        { $set: { name: newName } }
      );
      res.json({ success: true });
    } catch (e) {
      console.error("[subcategories] Update error:", e);
      res.status(500).json({ error: "Failed to update subcategory" });
    }
  });

  router.delete("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      const body = req.body || {};
      const queryName = (req.query?.name || "").toString();
      const queryCategory = (req.query?.category || "").toString();
      const name = body.name || queryName;
      const category = body.category || queryCategory;
      
      if (!category || !name) {
        return res.status(400).json({ error: "Category and name required" });
      }

      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      await db.collection("subcategories").deleteOne({ category, name });
      res.json({ success: true });
    } catch (e) {
      console.error("[subcategories] Delete error:", e);
      res.status(500).json({ error: "Failed to delete subcategory" });
    }
  });

  app.use("/api/subcategories", router);
}
