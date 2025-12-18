import express from "express";

export default function register({ app, getDb, authMiddleware, adminOnly, getSubcategories, saveSubcategories }) {
  const router = express.Router();

  router.get("/", async (req, res) => {
    try {
      const category = req.query?.category;
      const db = getDb();
      if (db) {
        const query = category ? { category } : {};
        const list = await db.collection("subcategories").find(query).toArray();
        const subcats = category ? list.map((s) => s.name) : list.reduce((acc, s) => {
          if (!acc[s.category]) acc[s.category] = [];
          acc[s.category].push(s.name);
          return acc;
        }, {});
        return res.json(subcats);
      }
      const subs = getSubcategories();
      if (category) {
        res.json(Array.isArray(subs[category]) ? subs[category] : []);
      } else {
        res.json(subs);
      }
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  router.post("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { category, name } = req.body || {};
      if (!category || !name) return res.status(400).json({ error: "Category and name required" });
      const db = getDb();
      if (db) {
        const exists = await db.collection("subcategories").findOne({ category, name });
        if (exists) return res.json({ success: true });
        await db.collection("subcategories").insertOne({ category, name });
        return res.json({ success: true });
      }
      const subs = getSubcategories();
      if (!subs[category]) subs[category] = [];
      if (!subs[category].includes(name)) {
        subs[category].push(name);
        saveSubcategories();
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  router.put("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { category, oldName, newName } = req.body || {};
      if (!category || !oldName || !newName) return res.status(400).json({ error: "Category, oldName and newName required" });
      const db = getDb();
      if (db) {
        const exists = await db.collection("subcategories").findOne({ category, name: oldName });
        if (!exists) return res.status(404).json({ error: "Not found" });
        await db.collection("subcategories").updateOne({ category, name: oldName }, { $set: { name: newName } });
        return res.json({ success: true });
      }
      const subs = getSubcategories();
      if (!subs[category] || !subs[category].includes(oldName)) return res.status(404).json({ error: "Not found" });
      const idx = subs[category].indexOf(oldName);
      subs[category][idx] = newName;
      saveSubcategories();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  router.delete("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      const body = req.body || {};
      const queryName = (req.query?.name || "").toString();
      const queryCategory = (req.query?.category || "").toString();
      const name = body.name || queryName;
      const category = body.category || queryCategory;
      if (!category || !name) return res.status(400).json({ error: "Category and name required" });
      const db = getDb();
      if (db) {
        await db.collection("subcategories").deleteOne({ category, name });
        return res.json({ success: true });
      }
      const subs = getSubcategories();
      if (subs[category]) {
        subs[category] = subs[category].filter((n) => n !== name);
        if (subs[category].length === 0) delete subs[category];
        saveSubcategories();
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  app.use("/api/subcategories", router);
}

