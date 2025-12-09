import express from "express";
import path from "path";
import fs from "fs";

export default function register({ app, getDb, authMiddleware, adminOnly, getCategoryTiles, setCategoryTiles, saveCategoryTiles, resolveLocal, uploadLocalPath }) {
  const router = express.Router();

  router.get("/", async (req, res) => {
    try {
      const db = getDb();
      let useDb = false;
      if (db) {
        const count = await db.collection("category_tiles").countDocuments();
        if (count > 0) useDb = true;
      }
      if (useDb) {
        const list = await db.collection("category_tiles").find({}).sort({ position: 1 }).toArray();
        return res.json(list.map((x) => ({ category: x.category, image: x.image, position: Number(x.position || 0) })));
      }
      const entries = Object.entries(getCategoryTiles())
        .map(([pos, obj]) => ({ position: Number(pos), category: obj?.category || "", image: obj?.image || "" }))
        .sort((a, b) => a.position - b.position)
        .map((e) => {
          try {
            if (e.image && e.image.startsWith("/uploads/")) {
              const lp = resolveLocal(e.image);
              let exists = false;
              try { exists = Boolean(lp && fs.existsSync(lp)); } catch {}
              if (!exists) {
                const full = path.basename(e.image || "");
                const stripped = full.includes("_") ? full.split("_").slice(1).join("_") : full;
                e.image = `/images/${stripped}`;
              }
            }
          } catch {}
          return e;
        });
      res.json(entries);
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  router.post("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      console.log("CategoryTiles POST", req.body);
      const { category, image, position } = req.body || {};
      if (!category || !image || position === undefined) {
        console.error("Missing fields", { category, image, position });
        return res.status(400).json({ error: "category, image, position required" });
      }
      const db = getDb();
      if (db) {
        await db.collection("category_tiles").updateOne({ position: Number(position) }, { $set: { category, image, position: Number(position) } }, { upsert: true });
        console.log("DB Update success");
        return res.json({ success: true });
      }
      const tiles = getCategoryTiles();
      tiles[String(position)] = { category, image };
      setCategoryTiles(tiles);
      saveCategoryTiles();
      console.log("File Update success");
      res.json({ success: true });
    } catch (e) {
      console.error("CategoryTiles POST Error", e);
      res.status(500).json({ error: "Failed" });
    }
  });

  router.delete("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      const category = (req.query.category || "").toString();
      const position = req.query.position !== undefined ? Number(req.query.position) : undefined;
      const db = getDb();
      if (db) {
        if (position !== undefined && !Number.isNaN(position)) await db.collection("category_tiles").deleteOne({ position }); else await db.collection("category_tiles").deleteOne({ category });
        return res.json({ success: true });
      }
      if (position !== undefined && !Number.isNaN(position)) delete getCategoryTiles()[String(position)]; else {
        const key = Object.entries(getCategoryTiles()).find(([_, v]) => v?.category === category)?.[0];
        if (key) delete getCategoryTiles()[key];
      }
      saveCategoryTiles();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed" });
    }
  });

  router.post("/admin/migrate", authMiddleware, adminOnly, async (req, res) => {
    try {
      let updated = 0;
      let errors = [];
      const db = getDb();
      if (db) {
        const docs = await db.collection("category_tiles").find({}).toArray();
        for (const d of docs) {
          try {
            const lp = resolveLocal(d.image);
            if (lp) {
              const url = await uploadLocalPath(lp, path.basename(d.image));
              if (url) { await db.collection("category_tiles").updateOne({ _id: d._id }, { $set: { image: url } }); updated++; }
            }
          } catch (e) {
            errors.push({ category: d.category, image: d.image, error: String(e?.message || e) });
          }
        }
      } else {
        const tiles = getCategoryTiles();
        for (const [pos, obj] of Object.entries(tiles)) {
          try {
            const lp = resolveLocal(obj?.image || "");
            if (lp) {
              const url = await uploadLocalPath(lp, path.basename(obj.image));
              if (url) { tiles[String(pos)] = { ...(obj || {}), image: url }; updated++; }
            }
          } catch (e) {
            errors.push({ position: pos, category: obj?.category, image: obj?.image, error: String(e?.message || e) });
          }
        }
        setCategoryTiles(tiles);
        saveCategoryTiles();
      }
      res.json({ success: true, updated, errors });
    } catch (e) {
      res.status(500).json({ error: "Migration failed" });
    }
  });

  app.use("/api/category-tiles", router);
}