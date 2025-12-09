import express from "express";

export default function register({ app, getDb, authMiddleware, adminOnly, getBestsellers, setBestsellers, saveBestsellers, getProducts }) {
  const router = express.Router();

  router.get("/", async (req, res) => {
    try {
      const db = getDb();
      if (db) {
        const docs = await db.collection("bestsellers").find({}).toArray();
        let ids = [];
        if (docs.length === 1 && Array.isArray(docs[0]?.ids)) ids = docs[0].ids; else ids = docs.map((d) => d.id).filter(Boolean);
        if (!ids.length) return res.json([]);
        const list = await db.collection("products").find({ id: { $in: ids } }).toArray();
        const ordered = ids.map(id => list.find(p => p.id === id)).filter(Boolean);
        return res.json(ordered);
      }
      const ids = getBestsellers();
      const list = (getProducts() || []).filter((p) => ids.includes(p.id));
      const ordered = ids.map(id => list.find(p => p.id === id)).filter(Boolean);
      res.json(ordered);
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  router.post("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { ids } = req.body || {};
      const arr = Array.isArray(ids) ? ids : [];
      const db = getDb();
      if (db) {
        await db.collection("bestsellers").deleteMany({});
        if (arr.length) await db.collection("bestsellers").insertOne({ ids: arr });
        return res.json({ success: true });
      }
      setBestsellers(arr);
      saveBestsellers();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  router.delete("/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
      const id = req.params.id;
      const db = getDb();
      if (db) {
        await db.collection("bestsellers").updateOne({}, { $pull: { ids: id } });
        return res.json({ success: true });
      }
      const list = getBestsellers().filter((x) => x !== id);
      setBestsellers(list);
      saveBestsellers();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  app.use("/api/bestsellers", router);
}