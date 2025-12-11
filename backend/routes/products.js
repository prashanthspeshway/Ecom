import express from "express";
import crypto from "crypto";

export default function register({ app, getDb, authMiddleware, adminOnly }) {
  const router = express.Router();

  router.get("/", async (req, res) => {
    try {
      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      const sale = req.query.sale === "true";
      const bestseller = req.query.bestseller === "true";
      const isNew = req.query.new === "true";
      
      let query = {};
      if (sale) query.onSale = true;
      if (bestseller) query.isBestSeller = true;
      if (isNew) {
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        query.createdAt = { $gte: oneWeekAgo };
      }

      const list = await db.collection("products").find(query).toArray();
      res.json(list);
    } catch (e) {
      console.error("[products] Get error:", e);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  router.get("/:id", async (req, res) => {
    try {
      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      const item = await db.collection("products").findOne({ id: req.params.id });
      if (!item) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(item);
    } catch (e) {
      console.error("[products] Get by id error:", e);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  router.post("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      const product = req.body || {};
      if (!product.name || !product.price) {
        return res.status(400).json({ error: "Name and price required" });
      }

      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      const id = product.id || crypto.randomUUID();
      const doc = {
        ...product,
        id,
        createdAt: Date.now(),
      };

      await db.collection("products").insertOne(doc);

      // Auto-create category if it doesn't exist
      if (product.category) {
        try {
          await db.collection("categories").updateOne(
            { name: product.category },
            { $setOnInsert: { name: product.category } },
            { upsert: true }
          );
        } catch (catError) {
          // Category may already exist, ignore
        }
      }

      res.json(doc);
    } catch (e) {
      console.error("[products] Create error:", e);
      res.status(500).json({ error: "Failed to create product" });
    }
  });

  router.put("/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
      const updates = req.body || {};
      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      const result = await db.collection("products").updateOne(
        { id: req.params.id },
        { $set: updates }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Product not found" });
      }

      const updated = await db.collection("products").findOne({ id: req.params.id });
      res.json(updated);
    } catch (e) {
      console.error("[products] Update error:", e);
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  router.delete("/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
      const db = getDb();
      if (!db) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      const result = await db.collection("products").deleteOne({ id: req.params.id });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "Product not found" });
      }

      res.json({ success: true });
    } catch (e) {
      console.error("[products] Delete error:", e);
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  app.use("/api/products", router);
}
